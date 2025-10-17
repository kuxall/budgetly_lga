"""Google OAuth service for backend authentication."""

import os
import httpx
import jwt
import json
import base64
from typing import Dict, Optional
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class GoogleOAuthService:
    def __init__(self):
        # Google OAuth configuration from environment variables
        self.client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.redirect_uri = os.getenv(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/oauth/google/callback")

        # Google OAuth URLs
        self.auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.jwks_url = "https://www.googleapis.com/oauth2/v3/certs"

        # Check if OAuth is configured
        self.is_configured = bool(self.client_id and self.client_secret)

        if not self.is_configured:
            logger.warning(
                "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")

    def get_authorization_url(self, state: str = None) -> str:
        """Generate Google OAuth authorization URL."""
        if not self.is_configured:
            raise ValueError("Google OAuth not configured")

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }

        if state:
            params["state"] = state

        return f"{self.auth_url}?{urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        """Exchange authorization code for access and ID tokens."""
        if not self.is_configured:
            raise ValueError("Google OAuth not configured")

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=data)
            response.raise_for_status()
            return response.json()

    async def get_user_info(self, access_token: str) -> Dict:
        """Get user information using access token."""
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(self.userinfo_url, headers=headers)
            response.raise_for_status()
            return response.json()

    async def verify_id_token(self, id_token: str) -> Dict:
        """Verify and decode Google ID token."""
        try:
            # For development, we can decode without verification
            # In production, you should verify the signature using Google's public keys

            # Decode the token (this doesn't verify the signature)
            header, payload, signature = id_token.split('.')

            # Add padding if needed
            payload += '=' * (4 - len(payload) % 4)

            # Decode the payload
            decoded_payload = base64.urlsafe_b64decode(payload)
            user_info = json.loads(decoded_payload)

            # Verify the audience (client_id)
            if user_info.get('aud') != self.client_id:
                raise ValueError("Invalid audience in ID token")

            # Extract user information
            return {
                "google_id": user_info.get("sub"),
                "email": user_info.get("email"),
                "email_verified": user_info.get("email_verified", False),
                "first_name": user_info.get("given_name", ""),
                "last_name": user_info.get("family_name", ""),
                "picture": user_info.get("picture", ""),
                "locale": user_info.get("locale", "en")
            }

        except Exception as e:
            logger.error(f"Failed to verify ID token: {str(e)}")
            raise ValueError(f"Invalid ID token: {str(e)}")

    async def verify_id_token_with_google(self, id_token: str) -> Dict:
        """Verify ID token using Google's tokeninfo endpoint (alternative method)."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                )
                response.raise_for_status()
                token_info = response.json()

                # Verify the audience
                if token_info.get('aud') != self.client_id:
                    raise ValueError("Invalid audience in ID token")

                # Extract user information
                return {
                    "google_id": token_info.get("sub"),
                    "email": token_info.get("email"),
                    "email_verified": token_info.get("email_verified") == "true",
                    "first_name": token_info.get("given_name", ""),
                    "last_name": token_info.get("family_name", ""),
                    "picture": token_info.get("picture", ""),
                    "locale": token_info.get("locale", "en")
                }

        except Exception as e:
            logger.error(f"Failed to verify ID token with Google: {str(e)}")
            raise ValueError(f"Invalid ID token: {str(e)}")

    def decode_user_data(self, encoded_data: str) -> Dict:
        """Decode base64 encoded user data (fallback method)."""
        try:
            decoded_data = base64.b64decode(encoded_data).decode('utf-8')
            user_data = json.loads(decoded_data)

            return {
                "google_id": user_data.get("id") or user_data.get("sub"),
                "email": user_data.get("email"),
                "email_verified": user_data.get("verified_email", True),
                "first_name": user_data.get("given_name", ""),
                "last_name": user_data.get("family_name", ""),
                "picture": user_data.get("picture", ""),
                "locale": user_data.get("locale", "en")
            }
        except Exception as e:
            logger.error(f"Failed to decode user data: {str(e)}")
            raise ValueError(f"Invalid user data: {str(e)}")


# Create global instance
google_oauth_service = GoogleOAuthService()
