"""Real OCR service for receipt scanning using OpenAI GPT-4o."""
import base64
import json
import os
import io
import logging
from datetime import datetime
from typing import Dict, List
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
from PIL import Image


import httpx
from .model_config_service import model_config

logger = logging.getLogger(__name__)


class ReceiptOCRService:
    """
    Advanced OCR service for extracting structured data from receipt images using OpenAI GPT-4o.

    This service provides comprehensive receipt processing capabilities including:
    - Multi-format support (JPEG, PNG, PDF)
    - AI-powered data extraction with confidence scoring
    - Automatic validation and data cleaning
    - Fallback mechanisms for error handling
    - Duplicate detection and merchant normalization

    The service uses OpenAI's GPT-4o model with vision capabilities to analyze
    receipt images and extract structured data including merchant name, amount,
    date, items, and categorization.

    Attributes:
        openai_api_key (str): OpenAI API key for authentication
        openai_url (str): OpenAI API endpoint URL
        ocr_model (str): Model name for OCR processing
        validation_model (str): Model name for data validation

    Raises:
        ValueError: If OPENAI_API_KEY environment variable is not set

    Example:
        >>> ocr_service = ReceiptOCRService()
        >>> result = await ocr_service.extract_receipt_data(image_data, "receipt.jpg")
        >>> print(f"Merchant: {result['merchant']}, Amount: ${result['amount']}")
    """

    def __init__(self):
        """
        Initialize the OCR service with OpenAI configuration.

        Raises:
            ValueError: If OPENAI_API_KEY environment variable is not set
        """
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.openai_url = "https://api.openai.com/v1/chat/completions"

        # Get model configurations from centralized config
        self.ocr_model = model_config.get_model_for_feature("ocr")
        self.validation_model = model_config.get_model_for_feature(
            "validation")

    async def _convert_pdf_to_image_and_analyze(self, pdf_data: bytes) -> Dict:
        """
        Convert PDF pages to images and run them through the vision pipeline.
        Returns the best result (highest confidence) across the first few pages.
        """
        if not PDF2IMAGE_AVAILABLE:
            logger.warning("pdf2image not available - PDF conversion disabled")
            fallback = self._create_fallback_response()
            fallback["error"] = "PDF processing requires poppler installation"
            return fallback

        try:
            # Check for common Poppler installation paths on Windows
            poppler_path = None
            possible_paths = [
                r"C:\poppler\poppler-24.08.0\Library\bin",
                r"C:\Program Files\poppler\Library\bin",
                r"C:\poppler\Library\bin",
                r"C:\Program Files (x86)\poppler\Library\bin",
                r"C:\ProgramData\chocolatey\bin",
            ]

            for path in possible_paths:
                if os.path.exists(path):
                    poppler_path = path
                    logger.info(f"Found Poppler at: {poppler_path}")
                    break

            # Render first 2–3 pages to images
            # 150–200 DPI is usually enough
            if poppler_path:
                pages = convert_from_bytes(
                    pdf_data, dpi=200, poppler_path=poppler_path)
            else:
                pages = convert_from_bytes(pdf_data, dpi=200)

            best_result = self._create_fallback_response()
            best_conf = best_result.get("confidence", 0.0)

            for idx, page in enumerate(pages[:3]):
                buf = io.BytesIO()
                # Compress to reasonable JPEG
                page.save(buf, format="JPEG", optimize=True, quality=85)
                image_bytes = buf.getvalue()
                base64_image = base64.b64encode(image_bytes).decode("utf-8")

                prompt = self._create_receipt_analysis_prompt()
                result = await self._call_openai_vision(base64_image, prompt)

                conf = float(result.get("confidence", 0.0))
                if conf > best_conf:
                    best_conf = conf
                    best_result = result

            return best_result

        except Exception as e:
            logger.error(f"PDF→image conversion failed: {e}")
            # fall back to generic failure response
            fallback = self._create_fallback_response()
            fallback["error"] = f"PDF to image conversion failed: {str(e)}"
            return fallback

    async def extract_receipt_data(self, image_data: bytes, filename: str) -> Dict:
        """Extract structured data from receipt image using GPT-4 Vision."""

        try:
            # Check if this is a PDF file
            if image_data.startswith(b'%PDF'):
                logger.info("📄 PDF detected - trying text extraction first")
                pdf_result = await self._extract_pdf_text(image_data)

                # If PDF text extraction failed or has low confidence, try converting to image
                if (pdf_result.get("error") or
                    pdf_result.get("confidence", 0) < 0.5 or
                        not pdf_result.get("is_receipt", False)):

                    logger.info(
                        "📄 PDF text extraction failed/low confidence - trying image conversion")
                    try:
                        # Try to convert PDF to image and use vision API
                        image_result = await self._convert_pdf_to_image_and_analyze(image_data)
                        if image_result.get("confidence", 0) > pdf_result.get("confidence", 0):
                            logger.info(
                                "✅ Image conversion gave better results")
                            return image_result
                    except Exception as e:
                        logger.warning(
                            f"⚠️ PDF to image conversion failed: {e}")

                return pdf_result

            # Convert image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')

            # Create the prompt for GPT-4 Vision
            prompt = self._create_receipt_analysis_prompt()

            # Call OpenAI GPT-4 Vision API
            extracted_data = await self._call_openai_vision(base64_image, prompt)

            return extracted_data

        except (ValueError, TypeError, ConnectionError) as e:
            logger.error(f"OCR extraction error: {e}")
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
            logger.debug(
                f"📋 Validating receipt: {len(image_data)} bytes, filename: {filename}")
            return {"valid": True}

        except Exception as e:
            logger.warning(f"⚠️ Validation warning: {str(e)}")
            # Even if validation has issues, allow processing
            return {"valid": True, "warning": str(e)}

    def _create_receipt_analysis_prompt(self) -> str:
        """Compact prompt for GPT-4o Vision: validate & extract any receipt/transaction doc."""
        return """
You are an expert Receipt Validator & Extractor with fraud-detection capabilities.

You will be given an IMAGE. Your tasks:
1) Decide if it is a legitimate purchase/payment document (receipt, invoice, bill, subscription charge, or transaction confirmation).
2) If NOT a valid receipt → return NON-RECEIPT JSON.
3) If valid → return RECEIPT JSON with extracted fields.
4) Output ONLY a single JSON object. No explanations, markdown, or code fences.

VALID receipts include (non-exhaustive):
- Store/restaurant/grocery/gas receipts (paper or digital)
- App/digital receipts (Google Play, Apple App Store, Steam, Uber, Lyft, DoorDash, Amazon, etc.)
- Online order/email confirmations
- Bank/credit/debit transaction confirmations
- Service invoices/bills (utilities, phone, internet, subscriptions)

REJECT as non-receipt if:
- Random photo, meme, ID, ticket, document unrelated to purchases
- No clear merchant/service/business name
- No transaction amount/total
- Date clearly < 1990 or > 30 days in future
- Amounts obviously nonsensical (e.g., negative total)

NON-RECEIPT JSON FORMAT:
{
  "is_receipt": false,
  "confidence": 0.0,
  "error": "Short description of what the image shows",
  "merchant": "N/A",
  "date": "1900-01-01",
  "total_amount": 0.0,
  "category": "Other"
}

VALID RECEIPT JSON FORMAT:
{
  "is_receipt": true,
  "merchant": "Store or service name",
  "date": "YYYY-MM-DD",
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
  "category": "Food & Dining | Transportation | Shopping | Entertainment | Utilities | Healthcare | Education | Other",
  "payment_method": "credit_card | debit_card | cash | bank_transfer | digital_wallet | other",
  "address": "Store address if visible, else empty string",
  "phone": "Store phone if visible, else empty string",
  "confidence": 0.0,
  "validation_flags": {
    "has_merchant": true,
    "has_date": true,
    "has_items": true,
    "has_total": true,
    "amounts_consistent": true,
    "date_reasonable": true
  }
}

EXTRACTION RULES (for is_receipt = true):
- Merchant: main business/platform name at header or near address/logo.
- Date: use transaction/payment date; convert to "YYYY-MM-DD".
- Items: extract all line items with name, price, quantity (default quantity=1 if missing).
  - If digital receipt without itemization, create ONE item with best description (e.g., app/service name).
- Amounts:
  - total_amount = final charge ("TOTAL", "AMOUNT DUE", "AMOUNT CHARGED", etc.).
  - If subtotal and tax exist, use them; else set subtotal = total_amount and tax = 0.00.
  - validation_flags.amounts_consistent = true if subtotal + tax ≈ total_amount (small rounding allowed) or only total is present with no contradiction.
- Category:
  - Restaurants/cafes/food delivery → "Food & Dining"
  - Grocery/supermarkets → "Food & Dining"
  - Gas/fuel/transit/Uber/Lyft → "Transportation"
  - Retail/Amazon/clothing/general shopping → "Shopping"
  - App stores, games, streaming → "Entertainment"
  - Utilities (phone/internet/electricity/water) → "Utilities"
  - Medical/clinic/pharmacy → "Healthcare"
  - Tuition/courses → "Education"
  - Else → "Other"
- Payment method:
  - Visa/Mastercard/AMEX/CREDIT → "credit_card"
  - DEBIT → "debit_card"
  - PayPal/Apple Pay/Google Pay etc. → "digital_wallet"
  - Bank transfer/wire → "bank_transfer"
  - CASH → "cash"
  - Otherwise → "other"
- Address/phone: fill if clearly visible; else "".

CONFIDENCE & FLAGS:
- confidence:
  - 0.8–1.0: clear, typical receipt/transaction doc.
  - 0.4–0.7: legitimate but low-quality/cropped/partially missing.
  - 0.0–0.3: likely not a receipt or very unclear.
- validation_flags:
  - has_merchant: merchant present?
  - has_date: transaction date present?
  - has_items: at least one item/service line?
  - has_total: clear total/amount charged?
  - date_reasonable: year ≥ 1990 and not >30 days in future.

Return ONLY the JSON object.
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
        """Compact prompt for analyzing extracted PDF text as a receipt/transaction."""
        return """
You are an expert Receipt Validator & Extractor with fraud-detection capabilities.

You will be given RAW TEXT extracted from a PDF. It may be a receipt, invoice, bill, transaction confirmation, or something else.

Your tasks:
1) Decide if the text is a legitimate purchase/payment document.
2) If NOT a valid receipt → return NON-RECEIPT JSON.
3) If valid → return RECEIPT JSON with extracted fields.
4) Output ONLY a single JSON object. No explanations, markdown, or code fences.

Treat as valid if text clearly indicates:
- A merchant/service name,
- A transaction or billing date,
- A total amount (and optionally items),
Typical examples: store receipts, online order confirmations, invoices, bills, subscription charges, bank/card transaction records.

NON-RECEIPT JSON FORMAT:
{
  "is_receipt": false,
  "confidence": 0.0,
  "error": "Short description of what the text appears to be",
  "merchant": "N/A",
  "date": "1900-01-01",
  "total_amount": 0.0,
  "category": "Other"
}

VALID RECEIPT JSON FORMAT:
{
  "is_receipt": true,
  "merchant": "Store or service name",
  "date": "YYYY-MM-DD",
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
  "category": "Food & Dining | Transportation | Shopping | Entertainment | Utilities | Healthcare | Education | Other",
  "payment_method": "credit_card | debit_card | cash | bank_transfer | digital_wallet | other",
  "address": "Store address if visible in text, else empty string",
  "phone": "Store phone if visible in text, else empty string",
  "confidence": 0.0,
  "validation_flags": {
    "has_merchant": true,
    "has_date": true,
    "has_items": true,
    "has_total": true,
    "amounts_consistent": true,
    "date_reasonable": true
  }
}

TEXT-BASED EXTRACTION RULES (for is_receipt = true):
- Merchant: use header/company name, invoice header, or obvious sender/issuer.
- Date: pick transaction/billing/payment date; convert to "YYYY-MM-DD".
- Items:
  - Use itemized lines, table rows, or bullet lines with descriptions and prices.
  - If no clear itemization (e.g., “Monthly subscription” only), create ONE item with best description.
- Amounts:
  - total_amount = “Total”, “Amount due”, “Amount charged”, etc.
  - If subtotal and tax are present, use them; else set subtotal = total_amount and tax = 0.00.
  - amounts_consistent = true if subtotal + tax ≈ total_amount or only total exists.
- Category + payment_method: same logic as the image prompt (Food & Dining, Transportation, Shopping, etc., and credit_card / debit_card / cash / bank_transfer / digital_wallet / other).
- Address/phone: include only if clearly present in text; else "".

VALIDATION & CONFIDENCE:
- date_reasonable = false if parsed date < 1990 or >30 days in the future.
- confidence:
  - 0.8–1.0: clear receipt/invoice/transaction doc.
  - 0.4–0.7: legitimate but noisy/partial.
  - 0.0–0.3: probably not a receipt.

Base everything ONLY on the provided text.  
Return ONLY the JSON object.
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
