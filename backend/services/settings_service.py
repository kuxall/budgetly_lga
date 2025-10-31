"""
Settings Service - Manages user preferences and application settings
"""
from typing import Dict, Any
from datetime import datetime, timezone
import json
import logging
import os

from services.data_services import data_service

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for managing user settings using JSON file storage"""

    def __init__(self):
        self.settings_file = "backend/data/user_settings.json"
        self.settings_db = {}
        self.load_settings()

    def load_settings(self):
        """Load settings from JSON file"""
        try:
            if os.path.exists(self.settings_file):
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    self.settings_db = json.load(f)
            else:
                self.settings_db = {}
        except Exception as e:
            logger.error("Error loading settings: %s", str(e))
            self.settings_db = {}

    def save_settings(self):
        """Save settings to JSON file"""
        try:
            os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(self.settings_db, f, indent=2)
        except Exception as e:
            logger.error("Error saving settings: %s", str(e))
            raise Exception("Failed to save settings") from e

    def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        """Get all settings for a user"""
        try:
            # Get user data from data service
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Get or create user settings
            user_settings = self.settings_db.get(user_id, {})
            if not user_settings:
                user_settings = self._create_default_settings(user_id)

            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error getting user settings: %s", str(e))
            raise Exception("Failed to retrieve user settings") from e

    def update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        try:
            # Get user from data service
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Update user data in data service
            if "firstName" in profile_data:
                user["first_name"] = profile_data["firstName"]
            if "lastName" in profile_data:
                user["last_name"] = profile_data["lastName"]
            if "email" in profile_data:
                user["email"] = profile_data["email"]

            user["updated_at"] = datetime.utcnow().isoformat()
            data_service.save_user(user_id, user)

            # Get settings and return updated response
            user_settings = self.settings_db.get(user_id, {})
            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error updating profile: %s", str(e))
            raise Exception("Failed to update profile") from e

    def update_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update user preferences"""
        try:
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Get or create user settings
            user_settings = self.settings_db.get(user_id, {})
            if not user_settings:
                user_settings = self._create_default_settings(user_id)

            # Update preferences
            if "preferences" not in user_settings:
                user_settings["preferences"] = {}

            if "currency" in preferences:
                user_settings["preferences"]["currency"] = preferences["currency"]
            if "dateFormat" in preferences:
                user_settings["preferences"]["dateFormat"] = preferences["dateFormat"]
            if "language" in preferences:
                user_settings["preferences"]["language"] = preferences["language"]
            if "timezone" in preferences:
                user_settings["preferences"]["timezone"] = preferences["timezone"]
            if "theme" in preferences:
                user_settings["preferences"]["theme"] = preferences["theme"]

            user_settings["updated_at"] = datetime.utcnow().isoformat()
            self.settings_db[user_id] = user_settings
            self.save_settings()

            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error updating preferences: %s", str(e))
            raise Exception("Failed to update preferences") from e

    def update_notifications(self, user_id: str, notifications: Dict[str, Any]) -> Dict[str, Any]:
        """Update notification preferences"""
        try:
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Get or create user settings
            user_settings = self.settings_db.get(user_id, {})
            if not user_settings:
                user_settings = self._create_default_settings(user_id)

            # Update notifications
            if "notifications" not in user_settings:
                user_settings["notifications"] = {}

            notification_fields = [
                "emailNotifications", "budgetAlerts", "receiptReminders",
                "weeklyReports", "securityAlerts"
            ]

            for field in notification_fields:
                if field in notifications:
                    user_settings["notifications"][field] = notifications[field]

            user_settings["updated_at"] = datetime.utcnow().isoformat()
            self.settings_db[user_id] = user_settings
            self.save_settings()

            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error updating notifications: %s", str(e))
            raise Exception("Failed to update notification preferences") from e

    def update_receipt_settings(self, user_id: str, receipt_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update receipt processing settings"""
        try:
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Get or create user settings
            user_settings = self.settings_db.get(user_id, {})
            if not user_settings:
                user_settings = self._create_default_settings(user_id)

            # Update receipt settings
            if "receiptSettings" not in user_settings:
                user_settings["receiptSettings"] = {}

            if "autoProcess" in receipt_settings:
                user_settings["receiptSettings"]["autoProcess"] = receipt_settings["autoProcess"]
            if "storageTime" in receipt_settings:
                user_settings["receiptSettings"]["storageTime"] = str(
                    receipt_settings["storageTime"]
                )
            if "maxFileSize" in receipt_settings:
                user_settings["receiptSettings"]["maxFileSize"] = str(
                    receipt_settings["maxFileSize"]
                )
            if "allowedFormats" in receipt_settings:
                user_settings["receiptSettings"]["allowedFormats"] = (
                    receipt_settings["allowedFormats"]
                )

            user_settings["updated_at"] = datetime.utcnow().isoformat()
            self.settings_db[user_id] = user_settings
            self.save_settings()

            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error updating receipt settings: %s", str(e))
            raise Exception("Failed to update receipt settings") from e

    def update_security_settings(self, user_id: str, security_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update security settings"""
        try:
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Get or create user settings
            user_settings = self.settings_db.get(user_id, {})
            if not user_settings:
                user_settings = self._create_default_settings(user_id)

            # Update security settings
            if "security" not in user_settings:
                user_settings["security"] = {}

            if "twoFactorEnabled" in security_settings:
                user_settings["security"]["twoFactorEnabled"] = (
                    security_settings["twoFactorEnabled"]
                )
            if "loginNotifications" in security_settings:
                user_settings["security"]["loginNotifications"] = (
                    security_settings["loginNotifications"]
                )

            user_settings["updated_at"] = datetime.utcnow().isoformat()
            self.settings_db[user_id] = user_settings
            self.save_settings()

            return self._format_settings_response(user, user_settings)

        except Exception as e:
            logger.error("Error updating security settings: %s", str(e))
            raise Exception("Failed to update security settings") from e

    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user account statistics"""
        try:
            user = data_service.users_db.get(user_id)
            if not user:
                raise Exception("User not found")

            # Calculate days active
            days_active = 0
            if user.get("created_at"):
                try:
                    created_at_str = user["created_at"]
                    # Handle different datetime formats
                    if created_at_str.endswith('Z'):
                        created_at_str = created_at_str.replace('Z', '+00:00')
                    
                    created_date = datetime.fromisoformat(created_at_str)
                    # Make timezone-aware if needed
                    if created_date.tzinfo is None:
                        created_date = created_date.replace(tzinfo=timezone.utc)
                    
                    now = datetime.now(timezone.utc)
                    days_active = max(0, (now - created_date).days)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Error parsing created_at date: {e}")
                    days_active = 0

            # Count user's expenses
            user_expenses = [
                exp for exp in data_service.expenses_db
                if exp.get("user_id") == user_id
            ]
            total_expenses = len(user_expenses)

            # Analyze receipt statistics
            receipts_with_data = [
                exp for exp in user_expenses if exp.get("receipt_data")
            ]
            
            # Count receipt processing - ALL receipts are auto-processed
            receipts_processed = len(receipts_with_data)
            total_uploaded = receipts_processed  # All receipts with data were uploaded
            auto_processed = receipts_processed  # ALL receipts are auto-processed
            manual_review = 0  # No manual review - everything is auto

            # Calculate storage used (more accurate with image storage service)
            storage_bytes = 0
            try:
                from services.image_storage_service import image_storage
                user_images_stats = image_storage.get_user_images(user_id)
                storage_bytes = user_images_stats.get('total_size', 0)
            except Exception:
                # Fallback to estimation if image storage service fails
                for expense in receipts_with_data:
                    receipt_data = expense.get("receipt_data", {})
                    if receipt_data:
                        # Rough estimate: JSON data + estimated image size
                        storage_bytes += len(str(receipt_data)) + 50000  # ~50KB per receipt estimate
            
            # Convert to human readable format
            if storage_bytes < 1024:
                storage_used = f"{storage_bytes} B"
            elif storage_bytes < 1024 * 1024:
                storage_used = f"{storage_bytes / 1024:.1f} KB"
            else:
                storage_used = f"{storage_bytes / (1024 * 1024):.1f} MB"

            # Return comprehensive statistics
            return {
                "daysActive": days_active,
                "totalExpenses": total_expenses,
                "receiptsProcessed": receipts_processed,
                "totalUploaded": total_uploaded,
                "autoProcessed": auto_processed,
                "manualReview": manual_review,
                "storageUsed": storage_used
            }

        except Exception as e:
            logger.error("Error getting user statistics: %s", str(e))
            raise Exception("Failed to retrieve user statistics") from e

    def _create_default_settings(self, user_id: str) -> Dict[str, Any]:
        """Create default settings for a user"""
        default_settings = {
            "user_id": user_id,
            "preferences": {
                "currency": "CAD",
                "dateFormat": "DD/MM/YYYY",
                "language": "en",
                "timezone": "America/Toronto",
                "theme": "light"
            },
            "notifications": {
                "emailNotifications": True,
                "budgetAlerts": True,
                "receiptReminders": False,
                "weeklyReports": True,
                "securityAlerts": True
            },
            "receiptSettings": {
                "autoProcess": True,
                "storageTime": "24",
                "maxFileSize": "10",
                "allowedFormats": ["JPEG", "PNG", "PDF"]
            },
            "security": {
                "twoFactorEnabled": False,
                "loginNotifications": True
            },
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        self.settings_db[user_id] = default_settings
        self.save_settings()
        return default_settings

    def _format_settings_response(self, user: Dict[str, Any], user_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Format settings response for frontend"""
        return {
            "profile": {
                "firstName": user.get("first_name", ""),
                "lastName": user.get("last_name", ""),
                "email": user.get("email", "")
            },
            "preferences": user_settings.get("preferences", {
                "currency": "CAD",
                "dateFormat": "DD/MM/YYYY",
                "language": "en",
                "timezone": "America/Toronto",
                "theme": "light"
            }),
            "notifications": user_settings.get("notifications", {
                "emailNotifications": True,
                "budgetAlerts": True,
                "receiptReminders": False,
                "weeklyReports": True,
                "securityAlerts": True
            }),
            "receiptSettings": user_settings.get("receiptSettings", {
                "autoProcess": True,
                "storageTime": "24",
                "maxFileSize": "10",
                "allowedFormats": ["JPEG", "PNG", "PDF"]
            }),
            "security": user_settings.get("security", {
                "twoFactorEnabled": False,
                "loginNotifications": True
            })
        }


setting_service = SettingsService()

def get_settings_service() -> SettingsService:
    """Get settings service instance"""
    return setting_service
