"""
Image Storage Service for secure 24-hour receipt storage.
Implements persistent storage that survives server restarts and user sessions.
"""

import os
import json
import base64
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import asyncio
from pathlib import Path


class PersistentReceiptStorage:
    """Ensures receipts survive server restarts and user sessions"""

    def __init__(self):
        # Storage configuration
        self.storage_duration_hours = 24
        self.storage_backend = self._get_storage_backend()
        self.cleanup_interval_minutes = 60  # Run cleanup every hour

        # Start background cleanup task
        self._start_cleanup_task()

    def _get_storage_backend(self):
        """Get storage backend - Always use MongoDB"""
        try:
            from .mongo_receipt_storage import MongoReceiptStorage
            return MongoReceiptStorage()
        except ImportError:
            raise ImportError(
                "MongoDB receipt storage is required but not available")

    def store_receipt(self, image_data: bytes, user_id: str, filename: str,
                      extracted_data: Optional[Dict] = None) -> str:
        """
        Store receipt with persistent 24-hour expiration.
        Returns secure access token.
        """
        try:
            # Generate secure token
            token = self._generate_secure_token()
            expiry_time = datetime.now() + timedelta(hours=self.storage_duration_hours)

            receipt_record = {
                "token": token,
                "user_id": user_id,
                "filename": filename,
                "image_data": base64.b64encode(image_data).decode(),
                "extracted_data": extracted_data or {},
                "created_at": datetime.now().isoformat(),
                "expires_at": expiry_time.isoformat(),
                "accessed_count": 0,
                "last_accessed": None,
                "expense_id": None,  # Will be set when expense is created
                "processing_status": "stored"  # stored, processed, expired
            }

            # Store in persistent backend
            success = self.storage_backend.save_receipt(token, receipt_record)

            if success:
                return token
            else:
                raise Exception("Failed to save receipt to storage backend")

        except Exception as e:
            raise Exception(f"Receipt storage failed: {str(e)}")

    def get_receipt(self, token: str, user_id: str) -> Optional[Dict]:
        """
        Retrieve receipt by secure token with user ownership verification.
        Returns receipt data or None if not found/expired.
        """
        try:
            # Retrieve from storage
            receipt_record = self.storage_backend.get_receipt(token)

            if not receipt_record:
                return None

            # Verify user ownership
            if receipt_record.get("user_id") != user_id:
                return None

            # Check expiration
            expires_at = datetime.fromisoformat(receipt_record["expires_at"])
            if datetime.now() > expires_at:
                # Receipt expired, remove it
                self.storage_backend.delete_receipt(token)
                return None

            # Update access tracking
            receipt_record["accessed_count"] = receipt_record.get(
                "accessed_count", 0) + 1
            receipt_record["last_accessed"] = datetime.now().isoformat()
            self.storage_backend.update_receipt(token, receipt_record)

            # Decode image data
            try:
                image_data = base64.b64decode(receipt_record["image_data"])
                receipt_record["image_data"] = image_data
            except Exception:
                return None

            return receipt_record

        except Exception as e:
            print(f"Error retrieving receipt {token}: {str(e)}")
            return None

    def list_user_receipts(self, user_id: str) -> List[Dict]:
        """
        List all receipts for a user with their processing status.
        Returns list of receipt metadata (without image data).
        """
        try:
            receipts = self.storage_backend.list_user_receipts(user_id)

            # Filter out expired receipts and remove image data
            valid_receipts = []
            current_time = datetime.now()

            for receipt in receipts:
                expires_at = datetime.fromisoformat(receipt["expires_at"])
                if current_time <= expires_at:
                    # Remove image data from listing (too large)
                    receipt_summary = {
                        k: v for k, v in receipt.items() if k != "image_data"}
                    valid_receipts.append(receipt_summary)
                else:
                    # Clean up expired receipt
                    self.storage_backend.delete_receipt(receipt["token"])

            return valid_receipts

        except Exception as e:
            print(f"Error listing receipts for user {user_id}: {str(e)}")
            return []

    def update_receipt_expense(self, token: str, user_id: str, expense_id: str) -> bool:
        """
        Link receipt to created expense.
        Updates processing status to 'processed'.
        """
        try:
            receipt_record = self.storage_backend.get_receipt(token)

            if not receipt_record or receipt_record.get("user_id") != user_id:
                return False

            # Update receipt with expense information
            receipt_record["expense_id"] = expense_id
            receipt_record["processing_status"] = "processed"
            receipt_record["updated_at"] = datetime.now().isoformat()

            return self.storage_backend.update_receipt(token, receipt_record)

        except Exception as e:
            print(
                f"Error updating receipt {token} with expense {expense_id}: {str(e)}")
            return False

    def delete_receipt(self, token: str, user_id: str) -> bool:
        """
        Delete receipt and optionally associated expense.
        Verifies user ownership before deletion.
        """
        try:
            receipt_record = self.storage_backend.get_receipt(token)

            if not receipt_record or receipt_record.get("user_id") != user_id:
                return False

            # Delete from storage
            return self.storage_backend.delete_receipt(token)

        except Exception as e:
            print(f"Error deleting receipt {token}: {str(e)}")
            return False

    def cleanup_expired_receipts(self) -> int:
        """
        Background task to clean up expired receipts.
        Returns number of receipts cleaned up.
        """
        try:
            return self.storage_backend.cleanup_expired_receipts()
        except Exception as e:
            print(f"Error during receipt cleanup: {str(e)}")
            return 0

    def get_storage_stats(self) -> Dict:
        """Get storage statistics for monitoring"""
        try:
            return self.storage_backend.get_storage_stats()
        except Exception as e:
            print(f"Error getting storage stats: {str(e)}")
            return {"error": str(e)}

    def _generate_secure_token(self) -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(32)

    def _start_cleanup_task(self):
        """Start background cleanup task"""
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(self._cleanup_loop())
        except RuntimeError:
            # No event loop running, cleanup will be manual
            pass

    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval_minutes * 60)
                cleaned_count = self.cleanup_expired_receipts()
                if cleaned_count > 0:
                    print(f"Cleaned up {cleaned_count} expired receipts")
            except Exception as e:
                print(f"Error in cleanup loop: {str(e)}")


# JSON storage removed - MongoDB only


# Global instance
persistent_storage = PersistentReceiptStorage()
