"""
MongoDB-based receipt storage backend for persistent 24-hour receipt storage.
"""

import os
import logging
from datetime import datetime
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import threading
import certifi

logger = logging.getLogger(__name__)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class MongoReceiptStorage:
    """MongoDB-based receipt storage backend"""

    def __init__(self):
        self.uri = os.getenv("MONGODB_URI")
        self.db_name = os.getenv("MONGODB_DB", "budgetly")

        if not self.uri:
            raise ValueError("MONGODB_URI environment variable is required")

        # Create a dedicated event loop for async operations
        self._loop = None
        self._thread = None
        self._start_event_loop()

        # Initialize MongoDB connection
        self._client = None
        self._db = None
        self._receipts_collection = None
        self._init_connection()

    def _start_event_loop(self):
        """Start a dedicated event loop in a background thread"""
        def run_loop():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            self._loop.run_forever()

        self._thread = threading.Thread(target=run_loop, daemon=True)
        self._thread.start()

        # Wait for loop to be ready
        while self._loop is None:
            threading.Event().wait(0.01)

    def _init_connection(self):
        """Initialize MongoDB connection"""
        async def _async_init():
            self._client = AsyncIOMotorClient(
                self.uri,
                serverSelectionTimeoutMS=5000,
                tlsCAFile=certifi.where()
            )
            self._db = self._client[self.db_name]
            self._receipts_collection = self._db.receipts

            # Create indexes for better performance
            await self._receipts_collection.create_index("token", unique=True)
            await self._receipts_collection.create_index("user_id")
            await self._receipts_collection.create_index("expires_at")
            await self._receipts_collection.create_index("created_at")

        # Run initialization in the event loop
        future = asyncio.run_coroutine_threadsafe(_async_init(), self._loop)
        future.result(timeout=10)  # Wait up to 10 seconds for initialization

    def _run_async(self, coro):
        """Run an async coroutine in the background event loop"""
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=30)  # 30 second timeout

    def save_receipt(self, token: str, receipt_record: Dict) -> bool:
        """Save receipt to MongoDB"""
        async def _save():
            try:
                await self._receipts_collection.insert_one(receipt_record)
                return True
            except Exception as e:
                logger.error(f"Error saving receipt to MongoDB: {str(e)}")
                return False

        return self._run_async(_save())

    def get_receipt(self, token: str) -> Optional[Dict]:
        """Get receipt from MongoDB"""
        async def _get():
            try:
                receipt = await self._receipts_collection.find_one({"token": token})
                if receipt:
                    # Remove MongoDB's _id field
                    receipt.pop("_id", None)
                return receipt
            except Exception as e:
                logger.error(f"Error getting receipt from MongoDB: {str(e)}")
                return None

        return self._run_async(_get())

    def update_receipt(self, token: str, receipt_record: Dict) -> bool:
        """Update receipt in MongoDB"""
        async def _update():
            try:
                result = await self._receipts_collection.replace_one(
                    {"token": token},
                    receipt_record
                )
                return result.modified_count > 0
            except Exception as e:
                print(f"Error updating receipt in MongoDB: {str(e)}")
                return False

        return self._run_async(_update())

    def delete_receipt(self, token: str) -> bool:
        """Delete receipt from MongoDB"""
        async def _delete():
            try:
                result = await self._receipts_collection.delete_one({"token": token})
                return result.deleted_count > 0
            except Exception as e:
                print(f"Error deleting receipt from MongoDB: {str(e)}")
                return False

        return self._run_async(_delete())

    def list_user_receipts(self, user_id: str) -> List[Dict]:
        """List all receipts for a user"""
        async def _list():
            try:
                cursor = self._receipts_collection.find(
                    {"user_id": user_id},
                    sort=[("created_at", -1)]  # Most recent first
                )
                receipts = []
                async for receipt in cursor:
                    receipt.pop("_id", None)  # Remove MongoDB's _id field
                    receipts.append(receipt)
                return receipts
            except Exception as e:
                print(f"Error listing user receipts from MongoDB: {str(e)}")
                return []

        return self._run_async(_list())

    def cleanup_expired_receipts(self) -> int:
        """Clean up expired receipts"""
        async def _cleanup():
            try:
                current_time = datetime.now()
                result = await self._receipts_collection.delete_many({
                    "expires_at": {"$lt": current_time.isoformat()}
                })
                return result.deleted_count
            except Exception as e:
                print(f"Error cleaning up expired receipts: {str(e)}")
                return 0

        return self._run_async(_cleanup())

    def get_storage_stats(self) -> Dict:
        """Get storage statistics"""
        async def _stats():
            try:
                current_time = datetime.now()

                # Total receipts
                total_receipts = await self._receipts_collection.count_documents({})

                # Active receipts (not expired)
                active_receipts = await self._receipts_collection.count_documents({
                    "expires_at": {"$gte": current_time.isoformat()}
                })

                # Expired receipts
                expired_receipts = total_receipts - active_receipts

                # Estimate storage size (this is approximate)
                pipeline = [
                    {"$project": {"size": {"$strLenCP": "$image_data"}}},
                    {"$group": {"_id": None, "total_size": {"$sum": "$size"}}}
                ]

                size_result = await self._receipts_collection.aggregate(pipeline).to_list(1)
                total_size = size_result[0]["total_size"] if size_result else 0

                return {
                    "backend": "mongodb",
                    "total_receipts": total_receipts,
                    "active_receipts": active_receipts,
                    "expired_receipts": expired_receipts,
                    "estimated_size_mb": round(total_size / (1024 * 1024), 2),
                    "database": self.db_name,
                    "collection": "receipts"
                }
            except Exception as e:
                return {"error": str(e)}

        return self._run_async(_stats())

    def __del__(self):
        """Cleanup when object is destroyed"""
        if self._loop and self._loop.is_running():
            self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1)
