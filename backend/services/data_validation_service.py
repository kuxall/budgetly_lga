"""Data validation service using GPT-4o-mini for simple processing tasks."""
import os
import json
import asyncio
from typing import Dict, List, Any, Optional
import httpx
import logging
from .model_config_service import model_config

logger = logging.getLogger(__name__)


class DataValidationService:
    """Service for validating and processing data using GPT-4o-mini."""

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_url = "https://api.openai.com/v1/chat/completions"
        self.validation_model = model_config.get_model_for_feature(
            "validation")  # GPT-4o-mini
        self.max_tokens = model_config.get_token_limit_for_feature(
            "validation")
        self.temperature = 0.1  # Very low for consistent validation
        self.is_configured = bool(self.openai_api_key)

    async def validate_expense_data(self, expense_data: Dict) -> Dict[str, Any]:
        """Validate expense data for accuracy and completeness."""
        if not self.is_configured:
            return self._basic_validation(expense_data)

        try:
            prompt = f"""Validate this expense data and return JSON with validation results:

Expense Data:
- Description: {expense_data.get('description', 'N/A')}
- Amount: ${expense_data.get('amount', 0)}
- Category: {expense_data.get('category', 'N/A')}
- Date: {expense_data.get('date', 'N/A')}
- Payment Method: {expense_data.get('payment_method', 'N/A')}

Return JSON format:
{{
  "valid": true/false,
  "issues": ["list of issues found"],
  "suggestions": ["list of suggestions"],
  "confidence": 0.95
}}

Check for:
1. Reasonable amount (not negative, not extremely high)
2. Valid category
3. Proper date format
4. Logical description-category match"""

            response = await self._call_validation_api(prompt)
            return self._parse_validation_response(response)

        except Exception as e:
            logger.error(f"Validation service error: {e}")
            return self._basic_validation(expense_data)

    async def categorize_expense(self, description: str, amount: float) -> Dict[str, Any]:
        """Automatically categorize an expense based on description and amount."""
        if not self.is_configured:
            return self._basic_categorization(description, amount)

        try:
            prompt = f"""Categorize this expense and return JSON:

Description: {description}
Amount: ${amount}

Return JSON format:
{{
  "category": "Food & Dining",
  "confidence": 0.90,
  "reasoning": "Brief explanation"
}}

Categories: Food & Dining, Transportation, Shopping, Entertainment, Utilities, Healthcare, Education, Other"""

            response = await self._call_validation_api(prompt)
            return self._parse_categorization_response(response)

        except Exception as e:
            logger.error(f"Categorization error: {e}")
            return self._basic_categorization(description, amount)

    async def clean_merchant_name(self, raw_merchant: str) -> Dict[str, Any]:
        """Clean and standardize merchant names."""
        if not self.is_configured:
            return {"cleaned_name": raw_merchant.strip(), "confidence": 0.5}

        try:
            prompt = f"""Clean this merchant name and return JSON:

Raw merchant: "{raw_merchant}"

Return JSON format:
{{
  "cleaned_name": "Clean Merchant Name",
  "confidence": 0.95
}}

Rules:
1. Remove extra characters, codes, locations
2. Standardize common business names
3. Keep it readable and recognizable"""

            response = await self._call_validation_api(prompt)
            return self._parse_cleaning_response(response)

        except Exception as e:
            logger.error(f"Merchant cleaning error: {e}")
            return {"cleaned_name": raw_merchant.strip(), "confidence": 0.5}

    async def validate_budget_data(self, budget_data: Dict) -> Dict[str, Any]:
        """Validate budget data for reasonableness."""
        if not self.is_configured:
            return self._basic_budget_validation(budget_data)

        try:
            prompt = f"""Validate this budget data:

Budget Data:
- Category: {budget_data.get('category', 'N/A')}
- Amount: ${budget_data.get('amount', 0)}
- Period: {budget_data.get('period', 'monthly')}

Return JSON format:
{{
  "valid": true/false,
  "issues": ["list of issues"],
  "suggestions": ["suggestions for improvement"],
  "confidence": 0.90
}}

Check for reasonable amounts and valid categories."""

            response = await self._call_validation_api(prompt)
            return self._parse_validation_response(response)

        except Exception as e:
            logger.error(f"Budget validation error: {e}")
            return self._basic_budget_validation(budget_data)

    async def _call_validation_api(self, prompt: str, max_retries: int = 2) -> str:
        """Call OpenAI API for validation tasks using GPT-4o-mini."""
        if not self.openai_api_key:
            raise Exception("OpenAI API key not available")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        payload = {
            "model": self.validation_model,  # GPT-4o-mini for fast, simple tasks
            "messages": [
                {
                    "role": "system",
                    "content": "You are a data validation assistant. Provide quick, accurate validation in JSON format only."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens": self.max_tokens
        }

        # Add temperature for GPT-4 models
        payload["temperature"] = self.temperature

        for attempt in range(max_retries):
            try:
                # Short timeout for validation
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(self.openai_url, headers=headers, json=payload)

                    if response.status_code == 200:
                        result = response.json()
                        return result["choices"][0]["message"]["content"]
                    elif response.status_code == 429:  # Rate limit
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1)
                            continue
                        else:
                            raise Exception("API rate limit exceeded")
                    else:
                        raise Exception(f"API error: {response.status_code}")

            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.5)
                    continue
                else:
                    raise e

    def _parse_validation_response(self, response: str) -> Dict[str, Any]:
        """Parse validation response from AI."""
        try:
            cleaned = response.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {
                "valid": True,
                "issues": [],
                "suggestions": [],
                "confidence": 0.5
            }

    def _parse_categorization_response(self, response: str) -> Dict[str, Any]:
        """Parse categorization response from AI."""
        try:
            cleaned = response.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {
                "category": "Other",
                "confidence": 0.5,
                "reasoning": "Failed to parse AI response"
            }

    def _parse_cleaning_response(self, response: str) -> Dict[str, Any]:
        """Parse merchant cleaning response from AI."""
        try:
            cleaned = response.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {
                "cleaned_name": "Unknown Merchant",
                "confidence": 0.5
            }

    def _basic_validation(self, expense_data: Dict) -> Dict[str, Any]:
        """Basic validation without AI."""
        issues = []
        suggestions = []

        amount = expense_data.get('amount', 0)
        if amount <= 0:
            issues.append("Amount must be positive")
        if amount > 10000:
            issues.append("Amount seems unusually high")

        if not expense_data.get('description'):
            issues.append("Description is missing")

        if not expense_data.get('category'):
            suggestions.append("Consider adding a category")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions,
            "confidence": 0.7
        }

    def _basic_categorization(self, description: str, amount: float) -> Dict[str, Any]:
        """Basic categorization without AI."""
        description_lower = description.lower()

        if any(word in description_lower for word in ['restaurant', 'food', 'cafe', 'pizza', 'burger']):
            return {"category": "Food & Dining", "confidence": 0.8, "reasoning": "Food-related keywords"}
        elif any(word in description_lower for word in ['gas', 'fuel', 'uber', 'taxi']):
            return {"category": "Transportation", "confidence": 0.8, "reasoning": "Transportation keywords"}
        elif any(word in description_lower for word in ['store', 'shop', 'market', 'amazon']):
            return {"category": "Shopping", "confidence": 0.7, "reasoning": "Shopping keywords"}
        else:
            return {"category": "Other", "confidence": 0.5, "reasoning": "No clear category match"}

    def _basic_budget_validation(self, budget_data: Dict) -> Dict[str, Any]:
        """Basic budget validation without AI."""
        issues = []
        suggestions = []

        amount = budget_data.get('amount', 0)
        if amount <= 0:
            issues.append("Budget amount must be positive")

        if not budget_data.get('category'):
            issues.append("Budget category is required")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions,
            "confidence": 0.7
        }


# Global service instance
data_validation_service = DataValidationService()
