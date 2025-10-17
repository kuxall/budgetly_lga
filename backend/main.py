"""Budgetly - AI-Powered Financial Management Platform."""

from fastapi import FastAPI, HTTPException, Request, status, Depends, Header, Response
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import os
import jwt
import secrets
import re
import bcrypt
import json

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Using system environment variables.")

# Import services
from services.data_services import data_service
from services.email_service import email_service

app = FastAPI(
    title="Budgetly API",
    description="AI-powered financial management platform",
    version="2.0.0"
)

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Utility functions


def validate_required_fields(data: Dict, required_fields: List[str]) -> None:
    """Validate required fields are present."""
    missing_fields = [
        field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required fields: {', '.join(missing_fields)}"
        )


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_jwt_token(user_id: str) -> str:
    """Create JWT token."""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Optional[Dict]:
    """Decode JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def create_password_reset_token(user_id: str) -> str:
    """Create password reset token."""
    payload = {
        "user_id": user_id,
        "type": "password_reset",
        # 1 hour expiry
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def validate_reset_token(token: str) -> Optional[str]:
    """Validate password reset token and return user_id."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def mark_reset_token_used(token: str) -> None:
    """Mark reset token as used (placeholder - in production, store used tokens)."""
    # In production, you'd store used tokens in a database or cache
    # to prevent token reuse
    pass

# Auth endpoints


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user."""
    token = credentials.credentials
    payload = decode_jwt_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("user_id")
    if user_id not in data_service.users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return data_service.users_db[user_id]


@app.post("/api/v1/auth/login")
async def login(request: Request):
    """Login user."""
    data = await request.json()

    # Validate required fields
    validate_required_fields(data, ["email", "password"])

    email = data["email"].lower().strip()
    password = data["password"]

    # Find user
    user = None
    for u in data_service.users_db.values():
        if u["email"] == email:
            user = u
            break

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )

    # Create token
    access_token = create_jwt_token(user["id"])

    # Return response (exclude password hash)
    user_response = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "user": user_response,
        "tokens": {
            "access_token": access_token,
            "token_type": "bearer"
        },
        "message": "Login successful"
    }


@app.post("/api/v1/auth/register")
async def register(request: Request):
    """Register a new user."""
    data = await request.json()

    # Validate required fields
    validate_required_fields(data, ["email", "password"])

    email = data["email"].lower().strip()
    password = data["password"]

    # Validate email format
    if not validate_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    # Check if user already exists
    if any(user["email"] == email for user in data_service.users_db.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user_id = secrets.token_urlsafe(16)
    user = {
        "id": user_id,
        "email": email,
        "first_name": data.get("first_name", ""),
        "last_name": data.get("last_name", ""),
        "password_hash": hash_password(password),
        "is_active": True,
        "is_verified": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    data_service.save_user(user_id, user)

    # Create token
    access_token = create_jwt_token(user_id)

    # Return response (exclude password hash)
    user_response = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "user": user_response,
        "tokens": {
            "access_token": access_token,
            "token_type": "bearer"
        },
        "message": "Registration successful"
    }


@app.post("/api/v1/auth/forgot-password")
async def forgot_password(request: Request):
    """Request password reset."""
    try:
        data = await request.json()
        # Validate required fields
        validate_required_fields(data, ["email"])

        email = data["email"].lower().strip()

        # Validate email format
        if not validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )

        # Find user
        user = None
        for u in data_service.users_db.values():
            if u["email"] == email:
                user = u
                break

        # Always return success to prevent email enumeration
        # But only send email if user exists
        if user and user.get("is_active", True):
            # Generate reset token
            reset_token = create_password_reset_token(user["id"])

            # Send password reset email
            user_name = f'{user.get("first_name", "")} {user.get("last_name", "")}'.strip(
            )
            await email_service.send_password_reset_email(
                email,
                reset_token,
                user_name
            )

        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        ) from e


@app.post("/api/v1/auth/reset-password")
async def reset_password(request: Request):
    """Reset password using token."""
    data = await request.json()

    # Validate required fields
    validate_required_fields(data, ["token", "new_password"])

    token = data["token"]
    new_password = data["new_password"]

    # Validate password strength (basic)
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    # Validate reset token
    user_id = validate_reset_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Find user
    if user_id not in data_service.users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user = data_service.users_db[user_id]

    # Update password
    user["password_hash"] = hash_password(new_password)
    user["updated_at"] = datetime.utcnow().isoformat()

    # Save updated user
    data_service.save_user(user_id, user)

    # Mark token as used
    mark_reset_token_used(token)

    # Create new access token for immediate login
    access_token = create_jwt_token(user_id)

    # Return response (exclude password hash)
    user_response = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "message": "Password reset successful",
        "user": user_response,
        "tokens": {
            "access_token": access_token,
            "token_type": "bearer"
        }
    }


@app.get("/api/v1/auth/profile")
async def get_profile(current_user: Dict = Depends(get_current_user)):
    """Get user profile."""
    user_response = {k: v for k, v in current_user.items()
                     if k != "password_hash"}
    return user_response


@app.get("/api/v1/auth/oauth/google")
async def google_oauth_login():
    """Initiate Google OAuth login."""
    try:
        from services.google_oauth_service import google_oauth_service

        if not google_oauth_service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
            )

        authorization_url = google_oauth_service.get_authorization_url()

        return {
            "authorization_url": authorization_url,
            "message": "Redirect user to this URL for Google OAuth"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google OAuth: {str(e)}"
        ) from e


@app.get("/api/v1/auth/oauth/google/callback")
async def google_oauth_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is required"
        )

    try:
        from services.google_oauth_service import google_oauth_service

        # Exchange code for tokens
        tokens = await google_oauth_service.exchange_code_for_tokens(code)

        # Verify ID token and get user info
        user_info = await google_oauth_service.verify_id_token(tokens["id_token"])

        # Check if user exists
        existing_user = None
        for user in data_service.users_db.values():
            if user["email"] == user_info["email"]:
                existing_user = user
                break

        if existing_user:
            # Update existing user with Google ID if not set
            if not existing_user.get("google_id"):
                existing_user["google_id"] = user_info["google_id"]
                existing_user["updated_at"] = datetime.utcnow().isoformat()
                data_service.save_user(existing_user["id"], existing_user)

            user = existing_user
        else:
            # Create new user
            user_id = secrets.token_urlsafe(16)
            user = {
                "id": user_id,
                "email": user_info["email"],
                "first_name": user_info["first_name"],
                "last_name": user_info["last_name"],
                "google_id": user_info["google_id"],
                "password_hash": "",  # No password for OAuth users
                "is_active": True,
                "is_verified": user_info["email_verified"],
                "profile_picture": user_info.get("picture", ""),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            data_service.save_user(user_id, user)

        # Create JWT token
        access_token = create_jwt_token(user["id"])

        # Return response (exclude password hash)
        user_response = {k: v for k, v in user.items() if k != "password_hash"}

        return {
            "user": user_response,
            "tokens": {
                "access_token": access_token,
                "token_type": "bearer"
            },
            "message": "Google OAuth login successful"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Google OAuth callback: {str(e)}"
        ) from e


@app.post("/api/v1/auth/oauth/google/token")
async def google_oauth_token_login(request: Request):
    """Login with Google ID token (for frontend integration)."""
    try:
        from services.google_oauth_service import google_oauth_service

        data = await request.json()
        id_token_str = data.get("id_token")
        user_data = data.get("user_data")

        if not id_token_str and not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID token or user data is required"
            )

        # Handle direct user data (preferred method)
        if user_data:
            user_info = {
                "google_id": user_data.get("id"),
                "email": user_data.get("email"),
                "email_verified": user_data.get("verified_email", True),
                "first_name": user_data.get("given_name", ""),
                "last_name": user_data.get("family_name", ""),
                "picture": user_data.get("picture", ""),
                "locale": user_data.get("locale", "en")
            }
        else:
            # Try to verify as JWT token first, then fallback to base64 decode
            try:
                user_info = await google_oauth_service.verify_id_token(id_token_str)
            except Exception as jwt_error:
                # If JWT verification fails, try to decode as base64 JSON (fallback)
                try:
                    import base64
                    decoded_data = base64.b64decode(
                        id_token_str).decode('utf-8')
                    parsed_data = json.loads(decoded_data)

                    user_info = {
                        "google_id": parsed_data.get("sub"),
                        "email": parsed_data.get("email"),
                        "email_verified": parsed_data.get("email_verified", True),
                        "first_name": parsed_data.get("given_name", ""),
                        "last_name": parsed_data.get("family_name", ""),
                        "picture": parsed_data.get("picture", ""),
                        "locale": parsed_data.get("locale", "en")
                    }
                except Exception as decode_error:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid token format. JWT error: {str(jwt_error)}, Decode error: {str(decode_error)}"
                    )

        # Check if user exists
        existing_user = None
        for user in data_service.users_db.values():
            if user["email"] == user_info["email"]:
                existing_user = user
                break

        if existing_user:
            # Update existing user with Google ID if not set
            if not existing_user.get("google_id"):
                existing_user["google_id"] = user_info["google_id"]
                existing_user["updated_at"] = datetime.utcnow().isoformat()
                data_service.save_user(existing_user["id"], existing_user)

            user = existing_user
        else:
            # Create new user
            user_id = secrets.token_urlsafe(16)
            user = {
                "id": user_id,
                "email": user_info["email"],
                "first_name": user_info["first_name"],
                "last_name": user_info["last_name"],
                "google_id": user_info["google_id"],
                "password_hash": "",  # No password for OAuth users
                "is_active": True,
                "is_verified": user_info["email_verified"],
                "profile_picture": user_info.get("picture", ""),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            data_service.save_user(user_id, user)

        # Create JWT token
        access_token = create_jwt_token(user["id"])

        # Return response (exclude password hash)
        user_response = {k: v for k, v in user.items() if k != "password_hash"}

        return {
            "user": user_response,
            "tokens": {
                "access_token": access_token,
                "token_type": "bearer"
            },
            "message": "Google OAuth login successful"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Google OAuth token: {str(e)}"
        ) from e


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Budgetly API is running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
