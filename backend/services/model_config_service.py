"""Model configuration service for managing different OpenAI models per feature."""
import os
from typing import Dict, Optional


class ModelConfigService:
    """Service for managing OpenAI model configurations for different features."""

    def __init__(self):
        self.models = {
            "ocr": os.getenv("OPENAI_OCR_MODEL", "gpt-4o"),

            "insights": os.getenv("OPENAI_INSIGHTS_MODEL", "gpt-4o"),

            "validation": os.getenv("OPENAI_VALIDATION_MODEL", "gpt-4o-mini"),

            # Default fallback model
            "default": os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4o")
        }

        # Token limits for each feature
        self.token_limits = {
            "ocr": int(os.getenv("OPENAI_OCR_MAX_TOKENS", "1000")),
            "insights": int(os.getenv("OPENAI_INSIGHTS_MAX_TOKENS", "2000")),
            "validation": int(os.getenv("OPENAI_VALIDATION_MAX_TOKENS", "500")),
            "default": 1500
        }

        # Model capabilities and use cases
        self.model_info = {
            "gpt-4o": {
                "description": "GPT-4o - Advanced model with vision support",
                "use_cases": ["AI insights", "OCR processing", "financial analysis", "image processing"],
                "cost": "medium",
                "speed": "fast"
            },
            "gpt-4o-mini": {
                "description": "GPT-4o Mini - Cost-effective for simple tasks",
                "use_cases": ["data validation", "simple text processing", "basic queries"],
                "cost": "low",
                "speed": "very_fast"
            },
            "gpt-4-turbo": {
                "description": "GPT-4 Turbo - Reliable for complex tasks",
                "use_cases": ["complex analysis", "detailed insights", "comprehensive processing"],
                "cost": "high",
                "speed": "medium"
            }
        }

    def get_model_for_feature(self, feature: str) -> str:
        """Get the appropriate model for a specific feature."""
        return self.models.get(feature, self.models["default"])

    def get_token_limit_for_feature(self, feature: str) -> int:
        """Get the token limit for a specific feature."""
        return self.token_limits.get(feature, self.token_limits["default"])

    def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get information about a specific model."""
        return self.model_info.get(model_name)

    def get_all_models(self) -> Dict[str, str]:
        """Get all configured models."""
        return self.models.copy()

    def update_model_for_feature(self, feature: str, model: str) -> bool:
        """Update the model for a specific feature."""
        if feature in self.models:
            self.models[feature] = model
            return True
        return False

    def get_feature_recommendations(self) -> Dict[str, Dict]:
        """Get recommended model usage for each feature."""
        return {
            "ocr": {
                "recommended_model": "gpt-4o",
                "reason": "Excellent OCR processing with vision support",
                "alternatives": ["gpt-4o-mini", "gpt-4-turbo"]
            },
            "insights": {
                "recommended_model": "gpt-4o",
                "reason": "Advanced AI analysis for complex financial insights",
                "alternatives": ["gpt-4-turbo", "gpt-4o-mini"]
            },
            "validation": {
                "recommended_model": "gpt-4o-mini",
                "reason": "Fast validation with low cost",
                "alternatives": ["gpt-4o", "gpt-4-turbo"]
            }
        }


# Global model config service instance
model_config = ModelConfigService()
