"""Data persistence service for storing user data in JSON files."""
import os
import json
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DataService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.users_file = os.path.join(data_dir, "users.json")
        self.expenses_file = os.path.join(data_dir, "expenses.json")
        self.budgets_file = os.path.join(data_dir, "budgets.json")
        self.income_file = os.path.join(data_dir, "income.json")
        self.reset_tokens_file = os.path.join(data_dir, "reset_tokens.json")
        self.receipts_file = os.path.join(data_dir, "receipts.json")

        # Create data directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)

        # Initialize data structures
        self._users_db: Dict[str, Dict] = {}
        self._expenses_db: List[Dict] = []
        self._budgets_db: List[Dict] = []
        self._income_db: List[Dict] = []
        self._reset_tokens_db: Dict[str, Dict] = {}
        self._receipts_db: List[Dict] = []

        # Load existing data
        self.load_all_data()

        # Auto-save disabled to reduce log noise
        # Data is saved immediately when modified
        self.auto_save_interval = None
        self._auto_save_task = None

    def _load_json_file(self, file_path: str, default_value: Any) -> Any:
        """Load JSON file with error handling."""
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    item_count = len(data) if isinstance(
                        data, (list, dict)) else 'data'
                    logger.info("Loaded %s items from %s",
                                item_count, file_path)
                    return data
        except Exception as e:
            logger.error("Error loading %s: %s", file_path, str(e))

        return default_value

    def _save_json_file(self, file_path: str, data: Any) -> bool:
        """Save data to JSON file with error handling."""
        try:
            # Create backup of existing file
            if os.path.exists(file_path):
                backup_path = f"{file_path}.backup"
                os.rename(file_path, backup_path)

            # Save new data
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)

            # Remove backup if save was successful
            backup_path = f"{file_path}.backup"
            if os.path.exists(backup_path):
                os.remove(backup_path)

            return True
        except Exception as e:
            logger.error("Error saving %s: %s", file_path, str(e))

            # Restore bacists(backup_path):
            os.remove(backup_path)
            print(f"SAVE JSON: Removed backup")

            print(f"SAVE JSON: Save completed successfully")
            return True
        except Exception as e:
            print(f"SAVE JSON: Error saving {file_path}: {str(e)}")
            logger.error("Error saving %s: %s", file_path, str(e))

            # Restore backup if save failed
            backup_path = f"{file_path}.backup"
            if os.path.exists(backup_path):
                os.rename(backup_path, file_path)
                print(f"SAVE JSON: Restored backup")

            return False

    def load_all_data(self):
        """Load all data from files."""
        logger.info("Loading data from files...")

        self._users_db = self._load_json_file(self.users_file, {})
        self._expenses_db = self._load_json_file(self.expenses_file, [])
        self._budgets_db = self._load_json_file(self.budgets_file, [])
        self._income_db = self._load_json_file(self.income_file, [])
        self._reset_tokens_db = self._load_json_file(
            self.reset_tokens_file, {})
        self._receipts_db = self._load_json_file(self.receipts_file, [])

        # Clean up expired reset tokens
        self._cleanup_expired_tokens()

        logger.info("Data loaded: %d users, %d expenses, %d budgets, %d income records, %d receipts",
                    len(self._users_db), len(self._expenses_db),
                    len(self._budgets_db), len(self._income_db), len(self._receipts_db))

    def _save_all_data(self):
        """Save all data to files."""
        try:
            self._save_json_file(self.users_file, self._users_db)
            self._save_json_file(self.expenses_file, self._expenses_db)
            self._save_json_file(self.budgets_file, self._budgets_db)
            self._save_json_file(self.income_file, self._income_db)
            self._save_json_file(self.receipts_file, self._receipts_db)
            self._save_json_file(self.reset_tokens_file, self._reset_tokens_db)
            logger.debug("All data saved successfully")
        except Exception as e:
            logger.error("Error saving data: %s", str(e))

    def _cleanup_expired_tokens(self):
        """Remove expired reset tokens."""
        current_time = datetime.now()
        expired_tokens = []

        for token, token_data in self._reset_tokens_db.items():
            try:
                expires_at = datetime.fromisoformat(
                    token_data["expires_at"].replace('Z', '+00:00'))
                if current_time > expires_at:
                    expired_tokens.append(token)
            except Exception:
                # Invalid date format, mark for removal
                expired_tokens.append(token)

        for token in expired_tokens:
            del self._reset_tokens_db[token]

        if expired_tokens:
            logger.info(
                f"Cleaned up {len(expired_tokens)} expired reset tokens")

    def _start_auto_save(self):
        """Start auto-save background task."""
        async def auto_save_loop():
            while True:
                await asyncio.sleep(self.auto_save_interval)
                self._save_all_data()

        try:
            loop = asyncio.get_event_loop()
            self._auto_save_task = loop.create_task(auto_save_loop())
        except RuntimeError:
            # No event loop running, auto-save will be manual
            logger.warning("No event loop running, auto-save disabled")

    def stop_auto_save(self):
        """Stop auto-save background task."""
        if self._auto_save_task:
            self._auto_save_task.cancel()
            self._auto_save_task = None

    # Users
    @property
    def users_db(self) -> Dict[str, Dict]:
        return self._users_db

    def save_user(self, user_id: str, user_data: Dict):
        """Save or update a user."""
        self._users_db[user_id] = user_data
        self._save_json_file(self.users_file, self._users_db)

    def delete_user(self, user_id: str) -> bool:
        """Delete a user and all their data."""
        if user_id in self._users_db:
            del self._users_db[user_id]

            # Remove user's expenses
            self._expenses_db = [
                exp for exp in self._expenses_db if exp.get("user_id") != user_id]

            # Remove user's budgets
            self._budgets_db = [
                budget for budget in self._budgets_db if budget.get("user_id") != user_id]

            # Remove user's income
            self._income_db = [
                income for income in self._income_db if income.get("user_id") != user_id]

            self._save_all_data()
            return True
        return False

    # Expenses
    @property
    def expenses_db(self) -> List[Dict]:
        return self._expenses_db

    def add_expense(self, expense_data: Dict):
        """Add a new expense."""
        self._expenses_db.append(expense_data)
        self._save_json_file(self.expenses_file, self._expenses_db)

    def update_expense(self, expense_id: str, expense_data: Dict) -> bool:
        """Update an existing expense."""
        for i, expense in enumerate(self._expenses_db):
            if expense.get("id") == expense_id:
                self._expenses_db[i] = expense_data
                self._save_json_file(self.expenses_file, self._expenses_db)
                return True
        return False

    def delete_expense(self, expense_id: str) -> bool:
        """Delete an expense."""
        for i, expense in enumerate(self._expenses_db):
            if expense.get("id") == expense_id:
                del self._expenses_db[i]
                self._save_json_file(self.expenses_file, self._expenses_db)
                return True
        return False

    # Budgets
    @property
    def budgets_db(self) -> List[Dict]:
        return self._budgets_db

    def add_budget(self, budget_data: Dict):
        """Add a new budget."""
        self._budgets_db.append(budget_data)
        self._save_json_file(self.budgets_file, self._budgets_db)

    def update_budget(self, budget_id: str, budget_data: Dict) -> bool:
        """Update an existing budget."""
        for i, budget in enumerate(self._budgets_db):
            if budget.get("id") == budget_id:
                self._budgets_db[i] = budget_data
                return self._save_json_file(self.budgets_file, self._budgets_db)
        return False

    def delete_budget(self, budget_id: str) -> bool:
        """Delete a budget."""
        for i, budget in enumerate(self._budgets_db):
            if budget.get("id") == budget_id:
                del self._budgets_db[i]
                return self._save_json_file(self.budgets_file, self._budgets_db)
        return False

    # Income
    @property
    def income_db(self) -> List[Dict]:
        """Get the income database."""
        return self._income_db

    def add_income(self, income_data: Dict):
        """Add a new income record."""
        self._income_db.append(income_data)
        self._save_json_file(self.income_file, self._income_db)

    def delete_income(self, income_id: str) -> bool:
        """Delete an income record."""
        for i, income in enumerate(self._income_db):
            if income.get("id") == income_id:
                del self._income_db[i]
                self._save_json_file(self.income_file, self._income_db)
                return True
        return False

    # Reset Tokens
    @property
    def reset_tokens_db(self) -> Dict[str, Dict]:
        return self._reset_tokens_db

    def save_reset_token(self, token: str, token_data: Dict):
        """Save a password reset token."""
        self._reset_tokens_db[token] = token_data
        self._save_json_file(self.reset_tokens_file, self._reset_tokens_db)

    def delete_reset_token(self, token: str) -> bool:
        """Delete a reset token."""
        if token in self._reset_tokens_db:
            del self._reset_tokens_db[token]
            self._save_json_file(self.reset_tokens_file, self._reset_tokens_db)
            return True
        return False

    def cleanup_expired_tokens(self):
        """Public method to clean up expired tokens."""
        self._cleanup_expired_tokens()
        self._save_json_file(self.reset_tokens_file, self._reset_tokens_db)

    def force_save(self):
        """Force save all data immediately."""
        self._save_all_data()

    def save_data(self):
        """Save all data - alias for force_save."""
        self._save_all_data()

    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID."""
        return self._users_db.get(user_id)

    def get_frontend_url(self) -> str:
        """Get frontend URL from environment."""
        import os
        return os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Receipts
    @property
    def receipts_db(self) -> List[Dict]:
        return self._receipts_db

    def add_receipt(self, receipt: Dict):
        """Add a receipt record."""
        self._receipts_db.append(receipt)
        self._save_json_file(self.receipts_file, self._receipts_db)

    def get_user_receipts(self, user_id: str) -> List[Dict]:
        """Get all receipts for a user."""
        return [receipt for receipt in self._receipts_db if receipt.get("user_id") == user_id]

    def delete_receipt(self, receipt_id: str) -> bool:
        """Delete a receipt by ID."""
        for i, receipt in enumerate(self._receipts_db):
            if receipt.get("id") == receipt_id:
                del self._receipts_db[i]
                self._save_json_file(self.receipts_file, self._receipts_db)
                return True
        return False


# Create global instance
data_service = DataService()
