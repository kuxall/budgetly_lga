"""MongoDB-backed DataService using Motor (async)."""
import os
import asyncio
import threading
import concurrent.futures
import json
import logging
import certifi
from typing import Dict, List, Any, Optional
from pymongo.errors import DuplicateKeyError
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, date
from bson import ObjectId

logger = logging.getLogger(__name__)


class MongoDataService:
    def __init__(self, uri: str = None, db_name: str = "budgetly"):
        self.uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.db_name = db_name or os.getenv("MONGODB_DB", "budgetly")
        self._client = AsyncIOMotorClient(self.uri, tlsCAFile=certifi.where())
        self._db = self._client[self.db_name]

    # Async helpers
    async def _get_collection(self, name: str):
        return self._db[name]

    async def get_all(self, collection: str) -> List[Dict]:
        col = await self._get_collection(collection)
        cursor = col.find({})
        docs = await cursor.to_list(length=None)
        return [self._sanitize_doc(doc) for doc in docs]

    async def get_map(self, collection: str, key_field: str) -> Dict[str, Dict]:
        col = await self._get_collection(collection)
        docs = await col.find({}).to_list(length=None)
        result = {}
        for doc in docs:
            sanitized = self._sanitize_doc(doc)
            key = sanitized.get(key_field)
            # ensure key is a str for consistent mapping
            if isinstance(key, ObjectId):
                key = str(key)
            result[key] = sanitized
        return result

    async def insert_one(self, collection: str, doc: Dict):
        col = await self._get_collection(collection)
        # avoid inserting caller's mutable dict and remove any supplied _id
        doc_to_insert = dict(doc)
        doc_to_insert.pop("_id", None)
        try:
            res = await col.insert_one(doc_to_insert)
            return res.inserted_id
        except DuplicateKeyError:
            logger.warning(
                "DuplicateKeyError on insert into %s. Attempting upsert by 'id'", collection)
            # If a duplicate _id was inserted concurrently, try an upsert using
            # the provided 'id' field to merge/replace the document instead.
            try:
                if "id" in doc_to_insert:
                    await col.replace_one({"id": doc_to_insert["id"]}, doc_to_insert, upsert=True)
                    existing = await col.find_one({"id": doc_to_insert["id"]})
                    if existing and "_id" in existing:
                        return existing["_id"]
            except Exception as e:
                logger.exception(
                    "Failed to resolve DuplicateKeyError by upsert: %s", e)
            # If we couldn't resolve, re-raise the original duplicate key error
            raise

    async def replace_one(self, collection: str, filter_q: Dict, doc: Dict):
        col = await self._get_collection(collection)
        # avoid mutating caller data and prevent accidental _id overwrites
        doc_to_replace = dict(doc)
        doc_to_replace.pop("_id", None)
        await col.replace_one(filter_q, doc_to_replace, upsert=True)

    async def delete_one(self, collection: str, filter_q: Dict):
        col = await self._get_collection(collection)
        await col.delete_one(filter_q)

    async def delete_many(self, collection: str, filter_q: Dict):
        col = await self._get_collection(collection)
        await col.delete_many(filter_q)

    async def find_one(self, collection: str, filter_q: Dict) -> Optional[Dict]:
        col = await self._get_collection(collection)
        doc = await col.find_one(filter_q)
        return self._sanitize_doc(doc) if doc else None

    async def find_many(self, collection: str, filter_q: Dict) -> List[Dict]:
        col = await self._get_collection(collection)
        cursor = col.find(filter_q)
        docs = await cursor.to_list(length=None)
        return [self._sanitize_doc(doc) for doc in docs]

    async def update_one(self, collection: str, filter_q: Dict, update_data: Dict):
        col = await self._get_collection(collection)
        # Remove _id from update data to prevent conflicts
        update_doc = dict(update_data)
        update_doc.pop("_id", None)
        result = await col.update_one(filter_q, {"$set": update_doc})
        return result.modified_count > 0

    # Public API mapping to the original DataService sync interface
    # Users map (by id)
    async def users_db(self) -> Dict[str, Dict]:
        return await self.get_map("users", "id")

    async def save_user(self, user_id: str, user_data: Dict):
        await self.replace_one("users", {"id": user_id}, user_data)

    # Expenses

    async def expenses_db(self) -> List[Dict]:
        return await self.get_all("expenses")

    async def get_expense(self, expense_id: str) -> Optional[Dict]:
        return await self.find_one("expenses", {"id": expense_id})

    async def get_expenses_by_user(self, user_id: str) -> List[Dict]:
        return await self.find_many("expenses", {"user_id": user_id})

    async def add_expense(self, expense_data: Dict):
        return await self.insert_one("expenses", expense_data)

    async def update_expense(self, expense_id: str, expense_data: Dict) -> bool:
        return await self.update_one("expenses", {"id": expense_id}, expense_data)

    async def delete_expense(self, expense_id: str) -> bool:
        await self.delete_one("expenses", {"id": expense_id})
        return True

    # Budgets

    async def budgets_db(self) -> List[Dict]:
        return await self.get_all("budgets")

    async def get_budget(self, budget_id: str) -> Optional[Dict]:
        return await self.find_one("budgets", {"id": budget_id})

    async def get_budgets_by_user(self, user_id: str) -> List[Dict]:
        return await self.find_many("budgets", {"user_id": user_id})

    async def add_budget(self, budget_data: Dict):
        return await self.insert_one("budgets", budget_data)

    async def update_budget(self, budget_id: str, budget_data: Dict) -> bool:
        return await self.update_one("budgets", {"id": budget_id}, budget_data)

    async def delete_budget(self, budget_id: str) -> bool:
        await self.delete_one("budgets", {"id": budget_id})
        return True

    # Income

    async def income_db(self) -> List[Dict]:
        return await self.get_all("income")

    async def get_income(self, income_id: str) -> Optional[Dict]:
        return await self.find_one("income", {"id": income_id})

    async def get_income_by_user(self, user_id: str) -> List[Dict]:
        return await self.find_many("income", {"user_id": user_id})

    async def add_income(self, income_data: Dict):
        return await self.insert_one("income", income_data)

    async def update_income(self, income_id: str, income_data: Dict) -> bool:
        return await self.update_one("income", {"id": income_id}, income_data)

    async def delete_income(self, income_id: str) -> bool:
        await self.delete_one("income", {"id": income_id})
        return True

    # Reset tokens
    async def reset_tokens_db(self) -> Dict[str, Dict]:
        # return as a map keyed by token
        docs = await self.get_all("reset_tokens")
        return {doc["token"]: doc for doc in docs}

    async def save_reset_token(self, token: str, token_data: Dict):
        token_doc = {"token": token, **token_data}
        await self.replace_one("reset_tokens", {"token": token}, token_doc)

    async def delete_reset_token(self, token: str) -> bool:
        await self.delete_one("reset_tokens", {"token": token})
        return True

    # Used reset tokens tracking
    async def add_used_reset_token(self, token_data: Dict):
        """Store used reset token to prevent reuse."""
        await self.insert_one("used_reset_tokens", token_data)

    async def is_reset_token_used(self, token: str) -> bool:
        """Check if reset token has been used."""
        result = await self.find_one("used_reset_tokens", {"token": token})
        return result is not None

    def _sanitize_doc(self, doc: Any) -> Any:
        """Recursively convert ObjectId and datetime to JSON-serializable types."""
        if isinstance(doc, dict):
            new = {}
            for k, v in doc.items():
                # convert _id to string and also preserve it as id if needed
                if k == '_id' and isinstance(v, ObjectId):
                    new['id'] = str(v)
                    new[k] = str(v)
                else:
                    new[k] = self._sanitize_doc(v)
            return new
        elif isinstance(doc, list):
            return [self._sanitize_doc(v) for v in doc]
        elif isinstance(doc, ObjectId):
            return str(doc)
        elif isinstance(doc, (datetime, date)):
            try:
                return doc.isoformat()
            except Exception:
                return str(doc)
        else:
            return doc


# Sync wrapper for minimal changes to existing codebase
class MongoDataServiceSyncWrapper:
    """Sync wrapper that runs async motor calls on a dedicated background event loop.

    This avoids calling run_until_complete on the main uvicorn loop which raises
    "RuntimeError: this event loop is already running".
    """

    def __init__(self, uri: str = None, db_name: str = None):
        self._async = MongoDataService(uri=uri, db_name=db_name)

        # Start a dedicated event loop in a background thread
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._start_loop, daemon=True)
        self._thread.start()

    def _start_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def _run(self, coro, timeout: float = 10.0):
        """Submit coroutine to background loop and wait for result."""
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        try:
            res = future.result(timeout)
        except concurrent.futures.TimeoutError:
            raise RuntimeError("Timed out waiting for DB operation")

        # Ensure returned results are JSON-serializable by sanitizing
        # (convert ObjectId and datetimes). The async service provides
        # a sanitizer we can reuse.
        try:
            return self._async._sanitize_doc(res)
        except Exception:
            # If sanitizer fails for any unexpected type, return raw result
            return res

    def close(self, timeout: float = 2.0):
        """Stop background loop and thread (call during shutdown)."""
        try:
            self._loop.call_soon_threadsafe(self._loop.stop)
            self._thread.join(timeout)
        except Exception:
            pass

    @property
    def users_db(self) -> Dict[str, Dict]:
        return self._run(self._async.users_db())

    def save_user(self, user_id: str, user_data: Dict):
        return self._run(self._async.save_user(user_id, user_data))

    @property
    def expenses_db(self) -> List[Dict]:
        return self._run(self._async.expenses_db())

    def get_expense(self, expense_id: str) -> Optional[Dict]:
        return self._run(self._async.get_expense(expense_id))

    def get_expenses_by_user(self, user_id: str) -> List[Dict]:
        return self._run(self._async.get_expenses_by_user(user_id))

    def add_expense(self, expense_data: Dict):
        return self._run(self._async.add_expense(expense_data))

    def update_expense(self, expense_id: str, expense_data: Dict) -> bool:
        return self._run(self._async.update_expense(expense_id, expense_data))

    def delete_expense(self, expense_id: str) -> bool:
        return self._run(self._async.delete_expense(expense_id))

    @property
    def budgets_db(self) -> List[Dict]:
        return self._run(self._async.budgets_db())

    def get_budget(self, budget_id: str) -> Optional[Dict]:
        return self._run(self._async.get_budget(budget_id))

    def get_budgets_by_user(self, user_id: str) -> List[Dict]:
        return self._run(self._async.get_budgets_by_user(user_id))

    def add_budget(self, budget_data: Dict):
        return self._run(self._async.add_budget(budget_data))

    def update_budget(self, budget_id: str, budget_data: Dict) -> bool:
        return self._run(self._async.update_budget(budget_id, budget_data))

    def delete_budget(self, budget_id: str) -> bool:
        return self._run(self._async.delete_budget(budget_id))

    @property
    def income_db(self) -> List[Dict]:
        return self._run(self._async.income_db())

    def get_income(self, income_id: str) -> Optional[Dict]:
        return self._run(self._async.get_income(income_id))

    def get_income_by_user(self, user_id: str) -> List[Dict]:
        return self._run(self._async.get_income_by_user(user_id))

    def add_income(self, income_data: Dict):
        return self._run(self._async.add_income(income_data))

    def update_income(self, income_id: str, income_data: Dict) -> bool:
        return self._run(self._async.update_income(income_id, income_data))

    def delete_income(self, income_id: str) -> bool:
        return self._run(self._async.delete_income(income_id))

    @property
    def reset_tokens_db(self) -> Dict[str, Dict]:
        return self._run(self._async.reset_tokens_db())

    def save_reset_token(self, token: str, token_data: Dict):
        return self._run(self._async.save_reset_token(token, token_data))

    def delete_reset_token(self, token: str) -> bool:
        return self._run(self._async.delete_reset_token(token))

    def add_used_reset_token(self, token_data: Dict):
        return self._run(self._async.add_used_reset_token(token_data))

    def is_reset_token_used(self, token: str) -> bool:
        return self._run(self._async.is_reset_token_used(token))
