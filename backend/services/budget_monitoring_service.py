"""Budget monitoring service for tracking spending and sending notifications."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from .data_services import data_service
from .email_service import email_service

logger = logging.getLogger(__name__)


class BudgetMonitoringService:
    def __init__(self):
        self.notification_thresholds = [
            80.0, 100.0]  # 80% and 100% (over budget)
        self.last_check = {}  # Track last notification sent per user/budget

    def calculate_spending_for_budget(self, user_id: str, budget: Dict) -> float:
        """Calculate current spending for a budget period."""
        now = datetime.utcnow()

        # Calculate period start based on budget period
        if budget.get("period") == "weekly":
            period_start = now - timedelta(days=7)
        elif budget.get("period") == "yearly":
            period_start = now - timedelta(days=365)
        else:  # monthly (default)
            period_start = now - timedelta(days=30)

        # Get user expenses for the period
        user_expenses = data_service.get_expenses_by_user(user_id)

        total_spent = 0.0
        for expense in user_expenses:
            if expense.get("category") == budget.get("category"):
                try:
                    # Handle both date-only and datetime formats
                    expense_date_str = expense.get("date", "")
                    if "T" in expense_date_str:
                        # Full datetime format
                        expense_date = datetime.fromisoformat(
                            expense_date_str.replace('Z', '+00:00'))
                    else:
                        # Date-only format, assume start of day
                        expense_date = datetime.fromisoformat(
                            expense_date_str + "T00:00:00")

                    if expense_date >= period_start:
                        total_spent += float(expense.get("amount", 0))

                except (ValueError, TypeError) as e:
                    # Skip expenses with invalid dates
                    logger.warning(
                        f"Invalid date format in expense {expense.get('id')}: {expense_date_str}")
                    continue

        return total_spent

    def get_budget_status(self, spent: float, budget_amount: float) -> Dict:
        """Get budget status information."""
        percentage = (spent / budget_amount) * 100 if budget_amount > 0 else 0

        if percentage >= 100:
            status = "Over Budget"
            severity = "critical"
        elif percentage >= 80:
            status = "Near Limit"
            severity = "warning"
        elif percentage >= 60:
            status = "On Track"
            severity = "info"
        else:
            status = "Good"
            severity = "success"

        return {
            "status": status,
            "severity": severity,
            "percentage": percentage,
            "spent": spent,
            "remaining": budget_amount - spent
        }

    async def check_budget_alerts(self, user_id: str, bypass_cooldown: bool = False) -> List[Dict]:
        """Check all budgets for a user and return alerts."""
        alerts = []

        # Get user budgets
        user_budgets = data_service.get_budgets_by_user(user_id)

        # If no budgets, return empty list (not an error)
        if not user_budgets:
            return alerts

        for budget in user_budgets:
            # Skip inactive budgets
            if not budget.get("is_active", True):
                continue

            spent = self.calculate_spending_for_budget(user_id, budget)
            status = self.get_budget_status(
                spent, float(budget.get("amount", 0)))

            # Check if we should send notification
            should_notify = False
            notification_type = None

            for threshold in self.notification_thresholds:
                if status["percentage"] >= threshold:
                    # Check if we already sent this notification recently
                    key = f"{user_id}_{budget.get('id')}_{threshold}"
                    last_sent = self.last_check.get(key)

                    # Only send if we haven't sent this threshold notification in the last 24 hours
                    # OR if we're bypassing cooldown (user action triggered)
                    if bypass_cooldown or not last_sent or (datetime.utcnow() - last_sent).total_seconds() > 86400:
                        should_notify = True
                        notification_type = "over_budget" if threshold >= 100.0 else "approaching_limit"
                        self.last_check[key] = datetime.utcnow()
                        break

            if should_notify:
                alert = {
                    "budget_id": budget.get("id"),
                    "category": budget.get("category"),
                    "budget_amount": float(budget.get("amount", 0)),
                    "spent": spent,
                    "percentage": status["percentage"],
                    "status": status["status"],
                    "severity": status["severity"],
                    "notification_type": notification_type,
                    "period": budget.get("period", "monthly")
                }
                alerts.append(alert)

        return alerts

    async def send_budget_notification_email(self, user_email: str, user_name: str, alert: Dict) -> bool:
        """Send budget alert email to user."""
        try:
            category = alert["category"]
            spent = alert["spent"]
            budget_amount = alert["budget_amount"]
            percentage = alert["percentage"]
            period = alert["period"]

            if alert["notification_type"] == "over_budget":
                subject = f"🚨 Budget Alert: You've exceeded your {category} budget"
                status_text = "exceeded"
                color = "#dc2626"  # red
                alert_type = "exceeded"
            else:
                subject = f"⚠️ Budget Alert: Approaching {category} budget limit"
                status_text = "approaching the limit of"
                color = "#f59e0b"  # amber
                alert_type = "warning"

            # Prepare budget data for the email service
            budget_data = {
                "category": category,
                "spent": spent,
                "budget_amount": budget_amount,
                "percentage": percentage,
                "remaining": budget_amount - spent,
                "period": period,
                "alert_type": alert_type
            }

            # Use the existing email service method
            success = await email_service.send_budget_alert_email(
                to_email=user_email,
                user_name=user_name,
                budget_data=budget_data
            )

            return success

        except Exception as e:
            logger.error(f"Error sending budget notification email: {str(e)}")
            return False

    async def process_budget_alerts_for_user(self, user_id: str, bypass_cooldown: bool = False) -> int:
        """Process budget alerts for a specific user."""
        try:
            # Get user info
            users_db = data_service.users_db
            user = users_db.get(user_id)
            if not user:
                logger.warning(f"User {user_id} not found")
                return 0

            # Check if user has budget alerts enabled
            try:
                from .settings_service import get_settings_service
                settings_service = get_settings_service()
                user_settings = settings_service.get_user_settings(user_id)
                if not user_settings.get("notifications", {}).get("budgetAlerts", True):
                    logger.info(f"Budget alerts disabled for user {user_id}")
                    return 0
            except Exception as e:
                logger.warning(
                    f"Could not check user notification settings for {user_id}: {str(e)}")
                # Continue with default behavior (send notifications)

            # Check for budget alerts
            alerts = await self.check_budget_alerts(user_id, bypass_cooldown)

            if not alerts:
                return 0

            # Send email notifications
            user_name = f'{user.get("first_name", "")} {user.get("last_name", "")}'.strip(
            )
            if not user_name:
                user_name = user.get("email", "").split("@")[0]
            user_email = user.get("email")

            if not user_email:
                logger.warning(f"No email found for user {user_id}")
                return 0

            sent_count = 0
            for alert in alerts:
                try:
                    success = await self.send_budget_notification_email(
                        user_email, user_name, alert
                    )
                    if success:
                        sent_count += 1
                        logger.info(
                            f"Budget alert sent to {user_email} for {alert['category']} ({alert['notification_type']})")

                        # Update budget with last alert info
                        try:
                            budget = data_service.get_budget(
                                alert["budget_id"])
                            if budget:
                                updated_budget = budget.copy()
                                updated_budget["last_alert_type"] = alert["notification_type"]
                                updated_budget["last_alert_sent"] = datetime.utcnow(
                                ).isoformat()
                                updated_budget["updated_at"] = datetime.utcnow(
                                ).isoformat()
                                data_service.update_budget(
                                    alert["budget_id"], updated_budget)
                        except Exception as e:
                            logger.warning(
                                f"Failed to update budget alert info: {str(e)}")

                except Exception as e:
                    logger.error(
                        f"Failed to send budget alert to {user_email}: {str(e)}")

            return sent_count

        except Exception as e:
            logger.error(
                f"Error processing budget alerts for user {user_id}: {str(e)}")
            return 0

    async def process_all_budget_alerts(self) -> Dict:
        """Process budget alerts for all users."""
        logger.info("Starting budget alert processing...")

        # Get all unique user IDs from budgets
        user_budgets = data_service.budgets_db
        user_ids = set()

        for budget in user_budgets:
            if budget.get("is_active", True):
                user_ids.add(budget.get("user_id"))

        if not user_ids:
            logger.info("No active budgets found")
            return {
                "processed_users": 0,
                "users_with_alerts": 0,
                "total_alerts_sent": 0,
                "timestamp": datetime.utcnow().isoformat()
            }

        total_alerts = 0
        processed_users = 0

        for user_id in user_ids:
            try:
                alerts_sent = await self.process_budget_alerts_for_user(user_id)
                total_alerts += alerts_sent
                if alerts_sent > 0:
                    processed_users += 1
            except Exception as e:
                logger.error(
                    f"Error processing alerts for user {user_id}: {str(e)}")

        result = {
            "processed_users": len(user_ids),
            "users_with_alerts": processed_users,
            "total_alerts_sent": total_alerts,
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"Budget alert processing complete: {result}")
        return result

    def get_user_budget_summary(self, user_id: str) -> List[Dict]:
        """Get budget status summary for a user."""
        try:
            user_budgets = data_service.get_budgets_by_user(user_id)
            summary = []

            for budget in user_budgets:
                if not budget.get("is_active", True):
                    continue

                spent = self.calculate_spending_for_budget(user_id, budget)
                status = self.get_budget_status(
                    spent, float(budget.get("amount", 0)))

                summary.append({
                    "budget_id": budget.get("id"),
                    "category": budget.get("category"),
                    "period": budget.get("period", "monthly"),
                    "budget_amount": float(budget.get("amount", 0)),
                    "spent": spent,
                    "remaining": status["remaining"],
                    "percentage": status["percentage"],
                    "status": status["status"],
                    "severity": status["severity"],
                    "last_alert_type": budget.get("last_alert_type"),
                    "last_alert_sent": budget.get("last_alert_sent")
                })

            return summary

        except Exception as e:
            logger.error(
                f"Error getting budget summary for user {user_id}: {str(e)}")
            return []


# Create global instance
budget_monitoring_service = BudgetMonitoringService()
