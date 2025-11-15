"""Input sanitization service to prevent XSS and injection attacks."""

import re
import html
from typing import Any, Dict, List, Union


class InputSanitizer:
    """Sanitize user inputs to prevent XSS and injection attacks."""

    # Dangerous patterns that should be removed
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:',  # JavaScript protocol
        r'on\w+\s*=',  # Event handlers (onclick, onload, etc.)
        r'<iframe[^>]*>.*?</iframe>',  # Iframes
        r'<object[^>]*>.*?</object>',  # Objects
        r'<embed[^>]*>',  # Embeds
    ]

    @staticmethod
    def sanitize_string(value: str, max_length: int = None) -> str:
        """
        Sanitize a string input.

        Args:
            value: String to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)

        # Strip whitespace
        value = value.strip()

        # Remove dangerous patterns
        for pattern in InputSanitizer.DANGEROUS_PATTERNS:
            value = re.sub(pattern, '', value, flags=re.IGNORECASE)

        # HTML escape to prevent XSS
        value = html.escape(value)

        # Enforce max length
        if max_length and len(value) > max_length:
            value = value[:max_length]

        return value

    @staticmethod
    def sanitize_email(email: str) -> str:
        """
        Sanitize email address.

        Args:
            email: Email to sanitize

        Returns:
            Sanitized email in lowercase
        """
        if not isinstance(email, str):
            return ""

        # Convert to lowercase and strip
        email = email.lower().strip()

        # Remove any dangerous characters
        email = re.sub(r'[<>"\']', '', email)

        return email

    @staticmethod
    def sanitize_number(value: Any, min_val: float = None, max_val: float = None) -> float:
        """
        Sanitize numeric input.

        Args:
            value: Value to sanitize
            min_val: Minimum allowed value
            max_val: Maximum allowed value

        Returns:
            Sanitized number
        """
        try:
            num = float(value)

            # Check bounds
            if min_val is not None and num < min_val:
                num = min_val
            if max_val is not None and num > max_val:
                num = max_val

            return num
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def sanitize_dict(data: Dict, schema: Dict = None) -> Dict:
        """
        Recursively sanitize dictionary values.

        Args:
            data: Dictionary to sanitize
            schema: Optional schema defining field types and constraints
                   Format: {
                       'field_name': {
                           'type': 'string'|'number'|'email',
                           'max_length': int,
                           'min_val': float,
                           'max_val': float
                       }
                   }

        Returns:
            Sanitized dictionary
        """
        if not isinstance(data, dict):
            return {}

        sanitized = {}

        for key, value in data.items():
            # Sanitize the key itself
            safe_key = InputSanitizer.sanitize_string(str(key), max_length=100)

            # Get schema for this field if available
            field_schema = schema.get(key, {}) if schema else {}
            field_type = field_schema.get('type', 'string')

            # Sanitize based on type
            if isinstance(value, dict):
                sanitized[safe_key] = InputSanitizer.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[safe_key] = [
                    InputSanitizer.sanitize_string(str(item))
                    if isinstance(item, str) else item
                    for item in value
                ]
            elif isinstance(value, str):
                if field_type == 'email':
                    sanitized[safe_key] = InputSanitizer.sanitize_email(value)
                else:
                    max_length = field_schema.get('max_length')
                    sanitized[safe_key] = InputSanitizer.sanitize_string(
                        value, max_length)
            elif isinstance(value, (int, float)):
                if field_type == 'number':
                    min_val = field_schema.get('min_val')
                    max_val = field_schema.get('max_val')
                    sanitized[safe_key] = InputSanitizer.sanitize_number(
                        value, min_val, max_val)
                else:
                    sanitized[safe_key] = value
            else:
                # Keep other types as-is (bool, None, etc.)
                sanitized[safe_key] = value

        return sanitized


# Global sanitizer instance
input_sanitizer = InputSanitizer()


# Common schemas for different data types
EXPENSE_SCHEMA = {
    'description': {'type': 'string', 'max_length': 500},
    'amount': {'type': 'number', 'min_val': 0, 'max_val': 1000000000},
    'category': {'type': 'string', 'max_length': 100},
    'notes': {'type': 'string', 'max_length': 1000},
    'payment_method': {'type': 'string', 'max_length': 50},
}

INCOME_SCHEMA = {
    'description': {'type': 'string', 'max_length': 500},
    'amount': {'type': 'number', 'min_val': 0, 'max_val': 1000000000},
    'source': {'type': 'string', 'max_length': 200},
    'notes': {'type': 'string', 'max_length': 1000},
}

BUDGET_SCHEMA = {
    'category': {'type': 'string', 'max_length': 100},
    'amount': {'type': 'number', 'min_val': 0, 'max_val': 1000000000},
    'period': {'type': 'string', 'max_length': 50},
}

USER_SCHEMA = {
    'email': {'type': 'email'},
    'first_name': {'type': 'string', 'max_length': 100},
    'last_name': {'type': 'string', 'max_length': 100},
}
