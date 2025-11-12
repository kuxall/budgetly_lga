"""Income-aware budget service for intelligent budget management."""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class IncomeBudgetService:
    """Service for income-aware budget calculations and recommendations."""

    def __init__(self, data_service):
        self.data_service = data_service

    def calculate_monthly_income(self, user_id: str, month: Optional[int] = None, year: Optional[int] = None) -> float:
        """Calculate total income for a specific month."""
        if month is None or year is None:
            now = datetime.now()
            month = now.month
            year = now.year

        user_income = self.data_service.get_income_by_user(user_id)

        logger.info(
            f"Calculating monthly income for user {user_id}: {len(user_income)} income records found")

        monthly_total = 0.0
        for income in user_income:
            try:
                # Handle different date formats
                date_str = income['date']
                if 'T' in date_str:
                    # ISO format with time
                    income_date = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00'))
                else:
                    # Date only format
                    income_date = datetime.strptime(date_str, '%Y-%m-%d')

                logger.info(
                    f"Income date: {income_date}, target: {year}-{month:02d}, amount: {income['amount']}")

                if income_date.month == month and income_date.year == year:
                    monthly_total += income['amount']
                    logger.info(f"Added {income['amount']} to monthly total")
            except (ValueError, KeyError) as e:
                logger.warning(
                    f"Error parsing income date: {e}, income: {income}")
                continue

        logger.info(
            f"Monthly income total for {year}-{month:02d}: {monthly_total}")
        return monthly_total

    def calculate_average_monthly_income(self, user_id: str, months: int = 3) -> float:
        """Calculate average monthly income over the last N months."""
        user_income = self.data_service.get_income_by_user(user_id)

        logger.info(
            f"Calculating average income for user {user_id}: {len(user_income)} records")

        if not user_income:
            logger.warning("No income records found")
            return 0.0

        # Group income by month
        monthly_totals = defaultdict(float)
        for income in user_income:
            try:
                # Handle different date formats
                date_str = income['date']
                if 'T' in date_str:
                    income_date = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00'))
                else:
                    income_date = datetime.strptime(date_str, '%Y-%m-%d')

                month_key = f"{income_date.year}-{income_date.month:02d}"
                monthly_totals[month_key] += income['amount']
                logger.info(f"Added {income['amount']} to month {month_key}")
            except (ValueError, KeyError) as e:
                logger.warning(f"Error parsing income: {e}")
                continue

        if not monthly_totals:
            return 0.0

        # Get last N months
        recent_months = sorted(monthly_totals.items(), reverse=True)[:months]
        if not recent_months:
            return 0.0

        total = sum(amount for _, amount in recent_months)
        return total / len(recent_months)

    def calculate_monthly_expenses(self, user_id: str, month: Optional[int] = None, year: Optional[int] = None) -> float:
        """Calculate total expenses for a specific month."""
        if month is None or year is None:
            now = datetime.now()
            month = now.month
            year = now.year

        user_expenses = self.data_service.get_expenses_by_user(user_id)

        monthly_total = 0.0
        for expense in user_expenses:
            try:
                expense_date = datetime.fromisoformat(expense['date'])
                if expense_date.month == month and expense_date.year == year:
                    monthly_total += expense['amount']
            except (ValueError, KeyError):
                continue

        return monthly_total

    def calculate_available_to_budget(self, user_id: str) -> Dict:
        """Calculate how much money is available to allocate to budgets."""
        monthly_income = self.calculate_monthly_income(user_id)
        monthly_expenses = self.calculate_monthly_expenses(user_id)

        # Get current budgets
        budgets = self.data_service.get_budgets_by_user(user_id)
        total_budgeted = sum(b['amount']
                             for b in budgets if b.get('period') == 'monthly')

        # Calculate spent vs budgeted
        expenses = self.data_service.get_expenses_by_user(user_id)
        now = datetime.now()
        current_month_expenses = [
            e for e in expenses
            if datetime.fromisoformat(e['date']).month == now.month
            and datetime.fromisoformat(e['date']).year == now.year
        ]
        total_spent = sum(e['amount'] for e in current_month_expenses)

        return {
            "monthly_income": monthly_income,
            "total_budgeted": total_budgeted,
            "total_spent": total_spent,
            "available_to_budget": monthly_income - total_budgeted,
            "available_to_spend": monthly_income - total_spent,
            "budget_utilization": (total_budgeted / monthly_income * 100) if monthly_income > 0 else 0,
            "spending_rate": (total_spent / monthly_income * 100) if monthly_income > 0 else 0,
            "savings_potential": monthly_income - total_spent
        }

    def get_budget_recommendations(self, user_id: str) -> Dict:
        """Generate budget recommendations based on income using 50/30/20 rule."""
        avg_income = self.calculate_average_monthly_income(user_id)

        if avg_income == 0:
            return {
                "error": "No income data available",
                "recommendations": []
            }

        # 50/30/20 rule: 50% needs, 30% wants, 20% savings
        needs_budget = avg_income * 0.50
        wants_budget = avg_income * 0.30
        savings_budget = avg_income * 0.20

        # Category allocations
        recommendations = [
            {
                "category": "Food & Dining",
                "suggested_amount": needs_budget * 0.30,  # 15% of income
                "percentage_of_income": 15,
                "type": "needs",
                "priority": "high"
            },
            {
                "category": "Transportation",
                "suggested_amount": needs_budget * 0.20,  # 10% of income
                "percentage_of_income": 10,
                "type": "needs",
                "priority": "high"
            },
            {
                "category": "Utilities",
                "suggested_amount": needs_budget * 0.20,  # 10% of income
                "percentage_of_income": 10,
                "type": "needs",
                "priority": "high"
            },
            {
                "category": "Healthcare",
                "suggested_amount": needs_budget * 0.15,  # 7.5% of income
                "percentage_of_income": 7.5,
                "type": "needs",
                "priority": "medium"
            },
            {
                "category": "Shopping",
                "suggested_amount": wants_budget * 0.50,  # 15% of income
                "percentage_of_income": 15,
                "type": "wants",
                "priority": "medium"
            },
            {
                "category": "Entertainment",
                "suggested_amount": wants_budget * 0.50,  # 15% of income
                "percentage_of_income": 15,
                "type": "wants",
                "priority": "low"
            },
            {
                "category": "Education",
                "suggested_amount": needs_budget * 0.15,  # 7.5% of income
                "percentage_of_income": 7.5,
                "type": "needs",
                "priority": "medium"
            }
        ]

        return {
            "average_monthly_income": avg_income,
            "needs_allocation": needs_budget,
            "wants_allocation": wants_budget,
            "savings_allocation": savings_budget,
            "recommendations": recommendations,
            "rule": "50/30/20 (Needs/Wants/Savings)"
        }

    def calculate_budget_health_score(self, user_id: str) -> Dict:
        """Calculate overall budget health score based on income and spending."""
        available = self.calculate_available_to_budget(user_id)

        score = 100
        issues = []
        strengths = []

        # Check income vs spending
        if available['monthly_income'] == 0:
            score = 0
            issues.append("No income recorded")
        else:
            spending_rate = available['spending_rate']

            if spending_rate > 100:
                score -= 40
                issues.append(
                    f"Spending exceeds income by {spending_rate - 100:.1f}%")
            elif spending_rate > 90:
                score -= 20
                issues.append("Spending very close to income limit")
            elif spending_rate < 70:
                strengths.append(
                    f"Good savings rate: {100 - spending_rate:.1f}%")

            # Check budget utilization
            budget_util = available['budget_utilization']
            if budget_util > 100:
                score -= 15
                issues.append("Over-budgeted relative to income")
            elif budget_util < 50:
                score -= 10
                issues.append("Under-budgeted - consider setting more budgets")
            else:
                strengths.append("Good budget coverage")

            # Check savings
            if available['savings_potential'] < 0:
                score -= 25
                issues.append("No savings - expenses exceed income")
            elif available['savings_potential'] > available['monthly_income'] * 0.20:
                strengths.append("Excellent savings rate (>20%)")
            elif available['savings_potential'] > available['monthly_income'] * 0.10:
                strengths.append("Good savings rate (>10%)")

        score = max(0, min(100, score))

        # Determine status
        if score >= 80:
            status = "Excellent"
        elif score >= 60:
            status = "Good"
        elif score >= 40:
            status = "Fair"
        else:
            status = "Needs Improvement"

        return {
            "score": score,
            "status": status,
            "issues": issues,
            "strengths": strengths,
            "metrics": available
        }

    def get_income_based_budget_suggestions(self, user_id: str, category: str) -> Dict:
        """Get budget suggestions for a specific category based on income."""
        avg_income = self.calculate_average_monthly_income(user_id)

        if avg_income == 0:
            return {
                "error": "No income data available",
                "suggested_amount": 0
            }

        # Category-specific percentages
        category_percentages = {
            "Food & Dining": 15,
            "Transportation": 10,
            "Shopping": 10,
            "Entertainment": 8,
            "Utilities": 10,
            "Healthcare": 8,
            "Education": 10,
            "Other": 5
        }

        percentage = category_percentages.get(category, 5)
        suggested_amount = avg_income * (percentage / 100)

        return {
            "category": category,
            "average_monthly_income": avg_income,
            "suggested_amount": suggested_amount,
            "percentage_of_income": percentage,
            "min_amount": suggested_amount * 0.7,
            "max_amount": suggested_amount * 1.3
        }

    def analyze_spending_vs_income(self, user_id: str, months: int = 6) -> Dict:
        """Analyze spending patterns relative to income over time."""
        user_income = self.data_service.get_income_by_user(user_id)
        user_expenses = self.data_service.get_expenses_by_user(user_id)

        # Group by month
        monthly_data = defaultdict(lambda: {"income": 0, "expenses": 0})

        for income in user_income:
            try:
                date = datetime.fromisoformat(income['date'])
                month_key = f"{date.year}-{date.month:02d}"
                monthly_data[month_key]["income"] += income['amount']
            except (ValueError, KeyError):
                continue

        for expense in user_expenses:
            try:
                date = datetime.fromisoformat(expense['date'])
                month_key = f"{date.year}-{date.month:02d}"
                monthly_data[month_key]["expenses"] += expense['amount']
            except (ValueError, KeyError):
                continue

        # Get last N months
        sorted_months = sorted(monthly_data.items(), reverse=True)[:months]

        analysis = []
        for month_key, data in sorted_months:
            savings = data['income'] - data['expenses']
            savings_rate = (savings / data['income']
                            * 100) if data['income'] > 0 else 0

            analysis.append({
                "month": month_key,
                "income": data['income'],
                "expenses": data['expenses'],
                "savings": savings,
                "savings_rate": savings_rate,
                "status": "surplus" if savings > 0 else "deficit"
            })

        # Calculate trends
        if len(analysis) >= 2:
            recent_savings_rate = analysis[0]['savings_rate']
            older_savings_rate = analysis[-1]['savings_rate']
            trend = "improving" if recent_savings_rate > older_savings_rate else "declining"
        else:
            trend = "insufficient_data"

        return {
            "months_analyzed": len(analysis),
            "monthly_breakdown": analysis,
            "trend": trend,
            "average_savings_rate": sum(m['savings_rate'] for m in analysis) / len(analysis) if analysis else 0
        }


# Global instance
income_budget_service = None


def get_income_budget_service(data_service):
    """Get or create income budget service instance."""
    global income_budget_service
    if income_budget_service is None:
        income_budget_service = IncomeBudgetService(data_service)
    return income_budget_service
