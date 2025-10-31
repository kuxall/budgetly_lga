"""
Duplicate Detection Service for preventing duplicate expense creation.
Implements intelligent matching to detect if a receipt has already been processed.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import re
from difflib import SequenceMatcher


class DuplicateDetectionService:
    """Service to detect duplicate receipts and prevent duplicate expense creation"""

    def __init__(self, data_service):
        self.data_service = data_service

        # Matching thresholds
        self.exact_match_threshold = 0.98
        self.high_similarity_threshold = 0.85
        self.medium_similarity_threshold = 0.70

        # Date tolerance for matching (in days)
        self.date_tolerance_days = 1

        # Amount tolerance (percentage)
        self.amount_tolerance_percent = 0.02  # 2%

    def check_duplicate_expense(self, extracted_data: Dict, user_id: str) -> Dict:
        """
        Check if expense already exists for this receipt.
        Returns detailed duplicate analysis.
        """
        try:
            # Get user's existing expenses
            existing_expenses = self._get_user_expenses(user_id)

            if not existing_expenses:
                return {
                    "is_duplicate": False,
                    "confidence": 0.0,
                    "message": "No existing expenses to compare against"
                }

            # Extract key fields for comparison
            receipt_merchant = self._normalize_merchant_name(
                extracted_data.get("merchant", ""))
            receipt_amount = float(extracted_data.get("total_amount", 0))
            receipt_date = self._parse_date(extracted_data.get("date", ""))

            if not receipt_merchant or receipt_amount <= 0 or not receipt_date:
                return {
                    "is_duplicate": False,
                    "confidence": 0.0,
                    "message": "Insufficient data for duplicate detection"
                }

            # Find potential duplicates
            potential_duplicates = []

            for expense in existing_expenses:
                similarity_score = self._calculate_similarity(
                    receipt_merchant, receipt_amount, receipt_date,
                    expense
                )

                if similarity_score["total_score"] > self.medium_similarity_threshold:
                    potential_duplicates.append({
                        "expense": expense,
                        "similarity": similarity_score
                    })

            # Sort by similarity score (highest first)
            potential_duplicates.sort(
                key=lambda x: x["similarity"]["total_score"], reverse=True)

            if not potential_duplicates:
                return {
                    "is_duplicate": False,
                    "confidence": 0.0,
                    "message": "No similar expenses found"
                }

            # Analyze best match
            best_match = potential_duplicates[0]
            similarity = best_match["similarity"]

            # Determine if it's a duplicate
            is_duplicate = similarity["total_score"] >= self.high_similarity_threshold

            if is_duplicate:
                return {
                    "is_duplicate": True,
                    "confidence": similarity["total_score"],
                    "existing_expense": {
                        "id": best_match["expense"]["id"],
                        "description": best_match["expense"].get("description", ""),
                        "amount": best_match["expense"].get("amount", 0),
                        "date": best_match["expense"].get("date", ""),
                        "category": best_match["expense"].get("category", ""),
                        "created_at": best_match["expense"].get("created_at", "")
                    },
                    "match_details": {
                        "merchant_similarity": similarity["merchant_score"],
                        "amount_similarity": similarity["amount_score"],
                        "date_similarity": similarity["date_score"],
                        "overall_confidence": similarity["total_score"]
                    },
                    "message": f"This receipt appears to already be processed (confidence: {similarity['total_score']:.1%})"
                }
            else:
                return {
                    "is_duplicate": False,
                    "confidence": similarity["total_score"],
                    "similar_expenses": [
                        {
                            "id": match["expense"]["id"],
                            "description": match["expense"].get("description", ""),
                            "amount": match["expense"].get("amount", 0),
                            "similarity": match["similarity"]["total_score"]
                        }
                        # Top 3 similar expenses
                        for match in potential_duplicates[:3]
                    ],
                    "message": f"Similar expenses found but not duplicates (highest similarity: {similarity['total_score']:.1%})"
                }

        except Exception as e:
            return {
                "is_duplicate": False,
                "confidence": 0.0,
                "error": f"Duplicate detection failed: {str(e)}",
                "message": "Could not perform duplicate detection"
            }

    def _get_user_expenses(self, user_id: str) -> List[Dict]:
        """Get all expenses for a user"""
        try:
            return [exp for exp in self.data_service.expenses_db if exp.get("user_id") == user_id]
        except Exception:
            return []

    def _calculate_similarity(self, receipt_merchant: str, receipt_amount: float,
                              receipt_date: datetime, expense: Dict) -> Dict:
        """Calculate similarity score between receipt and existing expense"""

        # Get expense data
        expense_description = expense.get("description", "")
        expense_amount = float(expense.get("amount", 0))
        expense_date = self._parse_date(expense.get("date", ""))

        # Calculate individual similarity scores
        merchant_score = self._calculate_merchant_similarity(
            receipt_merchant, expense_description)
        amount_score = self._calculate_amount_similarity(
            receipt_amount, expense_amount)
        date_score = self._calculate_date_similarity(
            receipt_date, expense_date)

        # Calculate weighted total score
        # Merchant name is most important, then amount, then date
        total_score = (
            merchant_score * 0.5 +  # 50% weight
            amount_score * 0.35 +   # 35% weight
            date_score * 0.15       # 15% weight
        )

        return {
            "merchant_score": merchant_score,
            "amount_score": amount_score,
            "date_score": date_score,
            "total_score": total_score
        }

    def _calculate_merchant_similarity(self, receipt_merchant: str, expense_description: str) -> float:
        """Calculate similarity between receipt merchant and expense description"""

        if not receipt_merchant or not expense_description:
            return 0.0

        # Normalize both strings
        merchant_normalized = self._normalize_merchant_name(receipt_merchant)
        description_normalized = self._normalize_merchant_name(
            expense_description)

        # Exact match
        if merchant_normalized == description_normalized:
            return 1.0

        # Check if one contains the other
        if merchant_normalized in description_normalized or description_normalized in merchant_normalized:
            return 0.9

        # Use sequence matcher for fuzzy matching
        similarity = SequenceMatcher(
            None, merchant_normalized, description_normalized).ratio()

        # Boost score if key words match
        merchant_words = set(merchant_normalized.split())
        description_words = set(description_normalized.split())

        if merchant_words and description_words:
            word_overlap = len(merchant_words & description_words) / \
                len(merchant_words | description_words)
            # Cap word-based similarity
            similarity = max(similarity, word_overlap * 0.8)

        return similarity

    def _calculate_amount_similarity(self, receipt_amount: float, expense_amount: float) -> float:
        """Calculate similarity between amounts"""

        if receipt_amount <= 0 or expense_amount <= 0:
            return 0.0

        # Exact match
        if abs(receipt_amount - expense_amount) < 0.01:
            return 1.0

        # Calculate percentage difference
        avg_amount = (receipt_amount + expense_amount) / 2
        percentage_diff = abs(receipt_amount - expense_amount) / avg_amount

        # Convert to similarity score
        if percentage_diff <= self.amount_tolerance_percent:
            return 1.0
        elif percentage_diff <= 0.05:  # 5% tolerance
            return 0.8
        elif percentage_diff <= 0.10:  # 10% tolerance
            return 0.6
        elif percentage_diff <= 0.20:  # 20% tolerance
            return 0.3
        else:
            return 0.0

    def _calculate_date_similarity(self, receipt_date: datetime, expense_date: datetime) -> float:
        """Calculate similarity between dates"""

        if not receipt_date or not expense_date:
            return 0.0

        # Calculate day difference
        day_diff = abs((receipt_date - expense_date).days)

        # Exact match
        if day_diff == 0:
            return 1.0

        # Within tolerance
        if day_diff <= self.date_tolerance_days:
            return 0.9
        elif day_diff <= 3:  # 3 days
            return 0.7
        elif day_diff <= 7:  # 1 week
            return 0.5
        elif day_diff <= 30:  # 1 month
            return 0.2
        else:
            return 0.0

    def _normalize_merchant_name(self, merchant: str) -> str:
        """Normalize merchant name for comparison"""

        if not merchant:
            return ""

        # Convert to lowercase
        normalized = merchant.lower().strip()

        # Remove common business suffixes
        suffixes = [
            r'\s*(llc|inc|corp|ltd|co|company|restaurant|cafe|coffee|shop|store|market|deli)\.?\s*$',
            r'\s*#\d+\s*$',  # Remove location numbers like "#123"
            r'\s*-\s*.*$',   # Remove everything after dash
        ]

        for suffix_pattern in suffixes:
            normalized = re.sub(suffix_pattern, '',
                                normalized, flags=re.IGNORECASE)

        # Remove special characters and extra spaces
        normalized = re.sub(r'[^\w\s]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object"""

        if not date_str:
            return None

        # Try different date formats
        date_formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%S.%f'
        ]

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        # If no format matches, try to extract just the date part
        try:
            date_part = date_str.split('T')[0].split(' ')[0]
            return datetime.strptime(date_part, '%Y-%m-%d')
        except ValueError:
            return None


# This will be initialized with data_service when needed
duplicate_detection_service = None


def get_duplicate_detection_service(data_service):
    """Get or create duplicate detection service instance"""
    global duplicate_detection_service
    if duplicate_detection_service is None:
        duplicate_detection_service = DuplicateDetectionService(data_service)
    return duplicate_detection_service
