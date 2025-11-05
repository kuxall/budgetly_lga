"""Real OCR service for receipt scanning using OpenAI GPT-4o."""
import base64
import json
import os
import io
import logging
from datetime import datetime
from typing import Dict, List

import httpx
from .model_config_service import model_config

logger = logging.getLogger(__name__)


class ReceiptOCRService:
    """Service for extracting data from receipt images using OpenAI GPT-4o."""

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.openai_url = "https://api.openai.com/v1/chat/completions"

        # Get model configurations
        self.ocr_model = model_config.get_model_for_feature("ocr")
        self.validation_model = model_config.get_model_for_feature(
            "validation")

    async def extract_receipt_data(self, image_data: bytes, filename: str) -> Dict:
        """Extract structured data from receipt image using GPT-4 Vision."""

        try:
            # Check if this is a PDF file
            if image_data.startswith(b'%PDF'):
                print("📄 PDF detected - trying text extraction first")
                pdf_result = await self._extract_pdf_text(image_data)

                # If PDF text extraction failed or has low confidence, try converting to image
                if (pdf_result.get("error") or
                    pdf_result.get("confidence", 0) < 0.5 or
                        not pdf_result.get("is_receipt", False)):

                    print(
                        "📄 PDF text extraction failed/low confidence - trying image conversion")
                    try:
                        # Try to convert PDF to image and use vision API
                        image_result = await self._convert_pdf_to_image_and_analyze(image_data)
                        if image_result.get("confidence", 0) > pdf_result.get("confidence", 0):
                            print("✅ Image conversion gave better results")
                            return image_result
                    except Exception as e:
                        print(f"⚠️ PDF to image conversion failed: {e}")

                return pdf_result

            # Convert image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')

            # Create the prompt for GPT-4 Vision
            prompt = self._create_receipt_analysis_prompt()

            # Call OpenAI GPT-4 Vision API
            extracted_data = await self._call_openai_vision(base64_image, prompt)

            return extracted_data

        except (ValueError, TypeError, ConnectionError) as e:
            print(f"OCR extraction error: {e}")
            return {
                "is_receipt": True,  # Allow processing to continue
                "error": str(e),
                "merchant": "Processing Error",
                "date": datetime.now().strftime('%Y-%m-%d'),
                "total_amount": 0.0,
                "items": [],
                "category": "Other",
                "payment_method": "other",
                "confidence": 0.0,
                "confidence_level": "error",
                "confidence_explanation": "Processing error occurred",
                "validation_warnings": [f"OCR processing failed: {str(e)}"]
            }

    async def validate_receipt_before_storage(self, image_data: bytes, filename: str) -> Dict:
        """Validate receipt before storage - accepts any valid image."""
        try:
            # Very permissive validation - accept almost any image
            if len(image_data) < 100:  # Very small threshold
                return {
                    "valid": False,
                    "error": "File too small",
                    "reason": "File appears to be empty or corrupted"
                }

            # No upper size limit - let the validation service handle optimization
            print(
                f"📋 Validating receipt: {len(image_data)} bytes, filename: {filename}")
            return {"valid": True}

        except Exception as e:
            print(f"⚠️ Validation warning: {str(e)}")
            # Even if validation has issues, allow processing
            return {"valid": True, "warning": str(e)}

    def _create_receipt_analysis_prompt(self) -> str:
        """Create a detailed prompt for GPT-4 to analyze receipts with enhanced validation."""
        return """
You are an expert receipt analyzer. Analyze this receipt image and extract information accurately.

MERCHANT NAME DETECTION - Look for business names in these locations:
- Top of receipt (header area)
- Business names with colons, dashes, or special formatting (e.g., "HS BAR : AGENCY01", "STORE - LOCATION")
- Names above address information
- Any text that appears to be a business identifier
- Restaurant/bar names, store chains, service providers
- Even abbreviated or coded business names should be captured

DATE EXTRACTION - Look for:
- Date in MM/DD/YY, DD/MM/YY, or YYYY-MM-DD format
- Time stamps (convert date to YYYY-MM-DD format)
- Transaction dates, not printed dates

AMOUNT EXTRACTION - Find the final total:
- Look for "TOTAL", "TOTAL DUE", "AMOUNT DUE"
- The largest monetary amount on the receipt
- Final amount after taxes and fees

If this is a legitimate receipt, return this JSON structure:

{
  "is_receipt": true,
  "merchant": "Exact business name from receipt (be liberal in detection)",
  "date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "subtotal": 0.00,
  "tax": 0.00,
  "items": [
    {
      "name": "Item name exactly as shown",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "category": "Food & Dining for restaurants/bars, Shopping for retail, Transportation for gas/transport, Other if unclear",
  "payment_method": "credit_card, debit_card, cash, or other",
  "address": "Store address if visible",
  "phone": "Store phone if visible", 
  "confidence": 0.85,
  "validation_flags": {
    "has_merchant": true,
    "has_date": true,
    "has_items": true,
    "has_total": true,
    "amounts_consistent": true,
    "date_reasonable": true
  }
}

IMPORTANT EXTRACTION GUIDELINES:
1. Be LIBERAL with merchant name detection - capture any business identifier
2. Extract ALL line items with their exact names and prices
3. Ensure total_amount matches the receipt's final total
4. For restaurants/bars/cafes, use "Food & Dining" category
5. Convert dates to YYYY-MM-DD format (e.g., 8/20/24 becomes 2024-08-20)
6. Include tax amounts separately if shown
7. Set confidence based on text clarity, not strictness of validation

ONLY return JSON, no additional text. Be accurate but not overly restrictive.
"""

    async def _call_openai_vision(self, base64_image: str, prompt: str) -> Dict:
        """Call OpenAI GPT-4 Vision API for receipt analysis."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        payload = {
            "model": self.ocr_model,  # Use configured OCR model (gpt-4o)
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": model_config.get_token_limit_for_feature("ocr")
        }

        # Add temperature for GPT-4 models
        payload["temperature"] = 0.1

        try:
            # Configure httpx client with better SSL handling
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                verify=True, 
                limits=httpx.Limits(
                    max_keepalive_connections=5, max_connections=10),
                http2=False  
            ) as client:
                print(f"📡 Making request to: {self.openai_url}")
                response = await client.post(self.openai_url, headers=headers, json=payload)
                print(f"📥 Response status: {response.status_code}")

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]

                    try:
                        cleaned_content = content.strip()
                        if cleaned_content.startswith('```json'):
                            # Remove ```json
                            cleaned_content = cleaned_content[7:]
                        if cleaned_content.endswith('```'):
                            # Remove ```
                            cleaned_content = cleaned_content[:-3]
                        cleaned_content = cleaned_content.strip()

                        # Parse the JSON response
                        try:
                            extracted_data = json.loads(cleaned_content)
                        except json.JSONDecodeError as json_err:
                            logger.error(f"JSON parsing failed: {json_err}")
                            return self._create_fallback_response()

                        # Validate and clean the data
                        validated_data = self._validate_extracted_data(
                            extracted_data)

                        return validated_data

                    except Exception as e:
                        logger.error(f"Data validation error: {e}")
                        return self._create_fallback_response()
                else:
                    error_text = response.text
                    print(
                        f"OpenAI API error: {response.status_code} - {error_text}")
                    return self._create_fallback_response()

        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            logger.error(f"Connection error to OpenAI: {type(e).__name__}")
            return {
                **self._create_fallback_response(),
                "error": "Connection error to AI service"
            }
        except httpx.TimeoutException as e:
            print(f"Timeout connecting to OpenAI: {e}")
            return {
                **self._create_fallback_response(),
                "error": "Request timeout - please try again"
            }
        except httpx.NetworkError as e:
            print(f"Network error connecting to OpenAI: {e}")
            return {
                **self._create_fallback_response(),
                "error": "Network connection error - please check your internet connection"
            }
        except Exception as e:
            print(f"Unexpected error calling OpenAI API: {e}")
            return {
                **self._create_fallback_response(),
                "error": f"API connection failed: {str(e)}"
            }

    def _validate_extracted_data(self, data: Dict) -> Dict:
        """Validate and clean extracted data with enhanced security checks."""

        # Check if AI determined this is actually a receipt
        # Default to True for backward compatibility
        is_receipt = data.get("is_receipt", True)

        if not is_receipt:
            # Return error response for non-receipts
            return {
                "error": data.get("error", "Image does not appear to be a valid receipt"),
                "is_receipt": False,
                "merchant": "N/A",
                "date": "1900-01-01",
                "total_amount": 0.0,
                "subtotal": 0.0,
                "tax": 0.0,
                "items": [],
                "category": "Other",
                "payment_method": "other",
                "address": "",
                "phone": "",
                "confidence": 0.0,
                "description": "Invalid receipt image",
                "validation_flags": data.get("validation_flags", {})
            }

        # Validate receipt data
        validated = {
            "is_receipt": True,
            "merchant": str(data.get("merchant", "Unknown Merchant")).strip(),
            "date": self._validate_date(data.get("date")),
            "total_amount": float(data.get("total_amount", 0.0)),
            "subtotal": float(data.get("subtotal", 0.0)),
            "tax": float(data.get("tax", 0.0)),
            "items": self._validate_items(data.get("items", [])),
            "category": self._validate_category(data.get("category", "Other")),
            "payment_method": self._validate_payment_method(data.get("payment_method", "other")),
            "address": str(data.get("address", "")).strip(),
            "phone": str(data.get("phone", "")).strip(),
            "confidence": max(0.0, min(1.0, float(data.get("confidence", 0.5)))),
            "validation_flags": data.get("validation_flags", {})
        }

        # Additional validation checks with granular confidence adjustment
        validation_issues = self._perform_additional_validation(validated)
        if validation_issues:
            # Adjust confidence based on severity of issues
            confidence_reduction = 0.0
            for issue in validation_issues:
                if any(critical in issue.lower() for critical in ["negative", "future date", "suspicious", "fake"]):
                    confidence_reduction += 0.4  # Critical issues
                elif any(moderate in issue.lower() for moderate in ["inconsistent", "missing", "unreasonable"]):
                    confidence_reduction += 0.2  # Moderate issues
                else:
                    confidence_reduction += 0.1  # Minor issues

            validated["confidence"] = max(
                0.0, validated["confidence"] - confidence_reduction)
            validated["validation_warnings"] = validation_issues

        # Auto-generate description
        validated["description"] = self._generate_description(validated)

        # Add confidence explanation
        validated["confidence_explanation"] = self._generate_confidence_explanation(
            validated)

        return validated

    def _validate_date(self, date_str: str) -> str:
        """Validate and format date."""
        if not date_str:
            return datetime.now().strftime('%Y-%m-%d')

        try:
            # Try to parse various date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']:
                try:
                    parsed_date = datetime.strptime(str(date_str), fmt)
                    return parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    continue

            # If no format works, return today
            return datetime.now().strftime('%Y-%m-%d')

        except (ValueError, TypeError):
            return datetime.now().strftime('%Y-%m-%d')

    def _validate_items(self, items: List) -> List[Dict]:
        """Validate and clean items list."""
        validated_items = []

        for item in items:
            if isinstance(item, dict):
                validated_item = {
                    "name": str(item.get("name", "Unknown Item")).strip(),
                    "price": max(0.0, float(item.get("price", 0.0))),
                    "quantity": max(1, int(item.get("quantity", 1)))
                }

                if validated_item["name"] and validated_item["price"] > 0:
                    validated_items.append(validated_item)

        return validated_items

    def _validate_category(self, category: str) -> str:
        """Validate category against allowed values."""
        valid_categories = [
            "Food & Dining", "Transportation", "Shopping", "Entertainment",
            "Utilities", "Healthcare", "Education", "Other"
        ]

        category = str(category).strip()

        # Exact match
        if category in valid_categories:
            return category

        # Fuzzy match
        category_lower = category.lower()
        for valid_cat in valid_categories:
            if category_lower in valid_cat.lower() or valid_cat.lower() in category_lower:
                return valid_cat

        return "Other"

    def _validate_payment_method(self, payment_method: str) -> str:
        """Validate payment method against allowed values."""
        valid_methods = [
            "credit_card", "debit_card", "cash", "bank_transfer",
            "digital_wallet", "check", "other"
        ]

        method = str(payment_method).lower().strip()

        if method in valid_methods:
            return method

        # Map common variations
        method_mapping = {
            "visa": "credit_card",
            "mastercard": "credit_card",
            "amex": "credit_card",
            "american express": "credit_card",
            "debit": "debit_card",
            "paypal": "digital_wallet",
            "apple pay": "digital_wallet",
            "google pay": "digital_wallet"
        }

        for key, value in method_mapping.items():
            if key in method:
                return value

        return "other"

    def _generate_description(self, data: Dict) -> str:
        """Generate a description for the expense."""
        merchant = data["merchant"]
        items_count = len(data["items"])

        if items_count == 0:
            return f"Purchase at {merchant}"
        if items_count == 1:
            return f"{data['items'][0]['name']} at {merchant}"
        return f"{items_count} items at {merchant}"

    def _generate_confidence_explanation(self, data: Dict) -> str:
        """Generate an explanation for the confidence score."""
        confidence = data.get("confidence", 0)
        validation_flags = data.get("validation_flags", {})
        validation_warnings = data.get("validation_warnings", [])

        if confidence >= 0.8:
            return "High confidence - all key receipt elements clearly identified"
        elif confidence >= 0.5:
            if validation_warnings:
                return f"Medium confidence - some validation issues: {', '.join(validation_warnings[:2])}"
            else:
                return "Medium confidence - receipt data partially clear"
        else:
            if not data.get("is_receipt", True):
                return "Low confidence - image may not be a valid receipt"
            elif validation_warnings:
                return f"Low confidence - multiple issues: {', '.join(validation_warnings[:3])}"
            else:
                return "Low confidence - receipt data unclear or incomplete"

    def _perform_additional_validation(self, data: Dict) -> List[str]:
        """Perform additional validation checks on extracted data."""
        issues = []

        # Check for reasonable amounts
        total_amount = data.get("total_amount", 0)
        if total_amount < 0:
            issues.append("Negative total amount detected")
        elif total_amount > 10000:  # $10,000 seems unreasonable for most receipts
            issues.append("Unusually high total amount")

        # Check date reasonableness
        try:
            receipt_date = datetime.strptime(data.get("date", ""), '%Y-%m-%d')
            today = datetime.now()
            days_diff = (today - receipt_date).days

            # Future date (allow 1 day for timezone differences)
            if days_diff < -1:
                issues.append("Future date detected")
            elif days_diff > 365 * 5:  # More than 5 years old
                issues.append("Very old receipt date")
        except (ValueError, TypeError):
            issues.append("Invalid date format")

        # Check merchant name
        merchant = data.get("merchant", "").strip()
        if len(merchant) < 2:
            issues.append("Missing or very short merchant name")
        elif any(char in merchant.lower() for char in ['test', 'sample', 'example', 'fake']):
            issues.append("Suspicious merchant name detected")

        # Check mathematical consistency
        subtotal = data.get("subtotal", 0)
        tax = data.get("tax", 0)
        total = data.get("total_amount", 0)

        if subtotal > 0 and tax >= 0 and total > 0:
            expected_total = subtotal + tax
            if abs(expected_total - total) > 0.02:  # Allow 2 cent rounding difference
                issues.append("Subtotal + tax doesn't match total")

        # Check items consistency
        items = data.get("items", [])
        if items:
            items_total = sum(item.get("price", 0) *
                              item.get("quantity", 1) for item in items)
            if subtotal > 0 and abs(items_total - subtotal) > 0.02:
                issues.append("Individual items don't sum to subtotal")

        return issues

    async def _extract_pdf_text(self, pdf_data: bytes) -> Dict:
        """Extract text from PDF and process with GPT-4 for receipt analysis."""
        try:
            import PyPDF2

            # Extract text from PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_data))

            # Extract text from all pages (limit to first 3 pages for receipts)
            text_content = ""
            max_pages = min(len(pdf_reader.pages), 3)

            for page_num in range(max_pages):
                page = pdf_reader.pages[page_num]
                text_content += page.extract_text() + "\n"

            if not text_content.strip():
                return {
                    "error": "No text found in PDF - may be image-based PDF",
                    "is_receipt": False,
                    "merchant": "Unknown",
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "total_amount": 0.0,
                    "items": [],
                    "category": "Other",
                    "payment_method": "other",
                    "confidence": 0.0
                }

            print(f"📄 Extracted {len(text_content)} characters from PDF")

            # Create a text-based prompt for GPT-4
            prompt = self._create_pdf_text_analysis_prompt()

            # Call OpenAI GPT-4 (text model, not vision)
            extracted_data = await self._call_openai_text(text_content, prompt)

            return extracted_data

        except Exception as e:
            print(f"❌ PDF text extraction failed: {e}")
            return {
                "error": f"PDF text extraction failed: {str(e)}",
                "is_receipt": False,
                "merchant": "Unknown",
                "date": datetime.now().strftime('%Y-%m-%d'),
                "total_amount": 0.0,
                "items": [],
                "category": "Other",
                "payment_method": "other",
                "confidence": 0.0
            }

    def _create_pdf_text_analysis_prompt(self) -> str:
        """Create a prompt for analyzing PDF text content."""
        return """
You are an expert receipt analyzer. Analyze this receipt text and determine if it's a legitimate receipt, then extract information accordingly.

FIRST: Validate if this is actually a receipt by checking for:
- Merchant/business name
- Transaction date and time
- Itemized purchases or services
- Total amount and payment information
- Receipt format (not random text or document)

If this is NOT a legitimate receipt, return:
{
  "is_receipt": false,
  "confidence": 0.0,
  "error": "Not a valid receipt - describe what you see instead",
  "merchant": "N/A",
  "date": "1900-01-01",
  "total_amount": 0.0,
  "category": "Other"
}

If this IS a legitimate receipt, extract the following information in JSON format:

{
  "is_receipt": true,
  "merchant": "Store/restaurant name",
  "date": "YYYY-MM-DD format",
  "total_amount": 0.00,
  "subtotal": 0.00,
  "tax": 0.00,
  "items": [
    {
      "name": "Item name",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "category": "One of: Food & Dining, Transportation, Shopping, Entertainment, Utilities, Healthcare, Education, Other",
  "payment_method": "One of: credit_card, debit_card, cash, bank_transfer, digital_wallet, other",
  "address": "Store address if visible",
  "phone": "Store phone if visible",
  "confidence": 0.95,
  "validation_flags": {
    "has_merchant": true,
    "has_date": true,
    "has_items": true,
    "has_total": true,
    "amounts_consistent": true,
    "date_reasonable": true
  }
}

CRITICAL VALIDATION RULES:
1. REJECT if text shows: random documents, emails, articles, or non-receipt content
2. REJECT if no clear merchant name or business information
3. REJECT if no transaction date or unreasonable date
4. REJECT if no itemized content or total amount
5. REJECT if amounts don't make mathematical sense
6. Set confidence to 0.0-0.3 for suspicious or unclear text
7. Set confidence to 0.4-0.7 for poor quality but legitimate receipts
8. Set confidence to 0.8-1.0 for clear, legitimate receipts

EXTRACTION RULES (only if is_receipt = true):
1. Extract ALL visible items with their exact prices
2. Ensure total_amount matches the receipt total exactly
3. Verify subtotal + tax = total (flag if inconsistent)
4. Choose the most appropriate category based on merchant and items
5. Payment method: look for card types, cash mentions, etc.
6. Use actual date from receipt, validate it's reasonable
7. For grocery stores use "Food & Dining"
8. For gas stations use "Transportation"
9. For restaurants/cafes use "Food & Dining"

SECURITY REQUIREMENTS:
- Return ONLY valid JSON, no additional text or explanations
- Do not process or describe inappropriate content
- Flag suspicious patterns in validation_flags
- Be conservative with confidence scores for unclear text

Analyze the receipt text carefully and provide accurate validation and extraction.
"""

    async def _call_openai_text(self, text_content: str, prompt: str) -> Dict:
        """Call OpenAI GPT-4 for text-based receipt analysis."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        payload = {
            "model": self.ocr_model,  # Use configured OCR model for text processing
            "messages": [
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": f"Please analyze this receipt text:\n\n{text_content}"
                }
            ],
            "max_tokens": model_config.get_token_limit_for_feature("ocr")
        }

        # Add temperature for GPT-4 models
        payload["temperature"] = 0.1

        try:
            print(f"🤖 Calling OpenAI text API with model: {self.ocr_model}")
            print(f"📊 Text length: {len(text_content)} characters")

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                verify=True,
                limits=httpx.Limits(
                    max_keepalive_connections=5, max_connections=10),
                http2=False
            ) as client:
                print(f"📡 Making request to: {self.openai_url}")
                response = await client.post(self.openai_url, headers=headers, json=payload)
                print(f"📥 Response status: {response.status_code}")

                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]

                    try:
                        # Clean the content - remove markdown code blocks if present
                        cleaned_content = content.strip()
                        if cleaned_content.startswith('```json'):
                            cleaned_content = cleaned_content[7:]
                        if cleaned_content.endswith('```'):
                            cleaned_content = cleaned_content[:-3]
                        cleaned_content = cleaned_content.strip()

                        print(f"Cleaned content: {cleaned_content}")

                        # Parse the JSON response
                        extracted_data = json.loads(cleaned_content)
                        print(f"Parsed JSON successfully: {extracted_data}")

                        # Validate and clean the data
                        validated_data = self._validate_extracted_data(
                            extracted_data)
                        print(f"Validated data: {validated_data}")

                        return validated_data

                    except json.JSONDecodeError as e:
                        print(f"JSON parsing error: {e}")
                        print(f"Raw content: {content}")
                        return self._create_fallback_response()
                    except Exception as e:
                        print(f"Validation error: {e}")
                        return self._create_fallback_response()
                else:
                    error_text = response.text
                    print(
                        f"OpenAI API error: {response.status_code} - {error_text}")
                    return self._create_fallback_response()

        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            print(f"Connection Error connecting to OpenAI: {e}")
            return {
                **self._create_fallback_response(),
                "error": f"Connection error: {str(e)}"
            }
        except httpx.TimeoutException as e:
            print(f"Timeout connecting to OpenAI: {e}")
            return {
                **self._create_fallback_response(),
                "error": "Request timeout - please try again"
            }
        except httpx.NetworkError as e:
            print(f"Network error connecting to OpenAI: {e}")
            return {
                **self._create_fallback_response(),
                "error": "Network connection error - please check your internet connection"
            }
        except Exception as e:
            print(f"Unexpected error calling OpenAI API: {e}")
            return {
                **self._create_fallback_response(),
                "error": f"API connection failed: {str(e)}"
            }

    def _create_fallback_response(self) -> Dict:
        """Create a fallback response when OCR fails."""
        return {
            "is_receipt": False,
            "merchant": "Unknown Merchant",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "total_amount": 0.0,
            "subtotal": 0.0,
            "tax": 0.0,
            "items": [],
            "category": "Other",
            "payment_method": "other",
            "address": "",
            "phone": "",
            "confidence": 0.0,
            "description": "Manual entry required - OCR failed",
            "error": "Failed to extract receipt data",
            "validation_flags": {}
        }


# Global OCR service instance
ocr_service = ReceiptOCRService()
