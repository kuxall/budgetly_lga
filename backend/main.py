"""Budgetly - AI-Powered Financial Management Platform."""

from fastapi import FastAPI, HTTPException, Request, status, Depends
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
import logging
import base64

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Using system environment variables.")


logger = logging.getLogger(__name__)

# Import services
from services.data_services import data_service
from services.email_service import email_service
from services.settings_service import setting_service, get_settings_service
from services.real_ocr_service import ocr_service
from services.image_validation_service import image_validation_service
from services.image_storage_service import persistent_storage
from services.duplicate_detection_service import get_duplicate_detection_service

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


# Income endpoints


@app.post("/api/v1/income")
async def create_income(request: Request, current_user: Dict = Depends(get_current_user)):
    """Create income record."""
    data = await request.json()

    validate_required_fields(data, ["source", "amount"])

    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be a positive number"
        )

    income_id = secrets.token_urlsafe(16)
    income = {
        "id": income_id,
        "user_id": current_user["id"],
        "source": data["source"],
        "amount": amount,
        "date": data.get("date", datetime.utcnow().date().isoformat()),
        "description": data.get("description", ""),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    data_service.add_income(income)
    return income


@app.get("/api/v1/income")
async def get_income(current_user: Dict = Depends(get_current_user)):
    """Get user income records."""
    user_income = data_service.get_income_by_user(current_user["id"])
    return user_income


@app.get("/api/v1/income/{income_id}")
async def get_income_by_id(income_id: str, current_user: Dict = Depends(get_current_user)):
    """Get specific income record."""
    income = data_service.get_income(income_id)

    if not income or income["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found"
        )

    return income


@app.put("/api/v1/income/{income_id}")
async def update_income(income_id: str, request: Request, current_user: Dict = Depends(get_current_user)):
    """Update income record."""
    data = await request.json()

    # Check if income exists and belongs to user
    income = data_service.get_income(income_id)
    if not income or income["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found"
        )

    # Validate amount if provided
    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a positive number"
            )

    # Update allowed fields
    updatable_fields = ["source", "amount", "date", "description"]
    updated_income = income.copy()

    for field in updatable_fields:
        if field in data:
            if field == "amount":
                updated_income[field] = float(data[field])
            else:
                updated_income[field] = data[field]

    updated_income["updated_at"] = datetime.utcnow().isoformat()

    success = data_service.update_income(income_id, updated_income)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update income record"
        )

    return updated_income


@app.delete("/api/v1/income/{income_id}")
async def delete_income(income_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete income record."""
    # Check if income exists and belongs to user
    income = data_service.get_income(income_id)
    if not income or income["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income record not found"
        )

    success = data_service.delete_income(income_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete income record"
        )

    return {"message": "Income record deleted successfully"}


# Expense endpoints


@app.post("/api/v1/expenses")
async def create_expense(request: Request, current_user: Dict = Depends(get_current_user)):
    """Create expense record."""
    data = await request.json()

    validate_required_fields(data, ["description", "amount"])

    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be a positive number"
        )

    expense_id = secrets.token_urlsafe(16)
    expense = {
        "id": expense_id,
        "user_id": current_user["id"],
        "description": data["description"],
        "amount": amount,
        "category": data.get("category", "Other"),
        "date": data.get("date", datetime.utcnow().date().isoformat()),
        "payment_method": data.get("payment_method", "credit_card"),
        "notes": data.get("notes", ""),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    data_service.add_expense(expense)
    return expense


@app.get("/api/v1/expenses")
async def get_expenses(current_user: Dict = Depends(get_current_user)):
    """Get user expense records."""
    user_expenses = data_service.get_expenses_by_user(current_user["id"])
    return user_expenses


@app.get("/api/v1/expenses/{expense_id}")
async def get_expense(expense_id: str, current_user: Dict = Depends(get_current_user)):
    """Get specific expense."""
    expense = data_service.get_expense(expense_id)

    if not expense or expense["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    return expense


@app.put("/api/v1/expenses/{expense_id}")
async def update_expense(expense_id: str, request: Request, current_user: Dict = Depends(get_current_user)):
    """Update expense."""
    data = await request.json()

    # Check if expense exists and belongs to user
    expense = data_service.get_expense(expense_id)
    if not expense or expense["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Validate amount if provided
    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a positive number"
            )

    # Update allowed fields
    updatable_fields = ["amount", "description",
                        "category", "date", "payment_method", "notes"]
    updated_expense = expense.copy()

    for field in updatable_fields:
        if field in data:
            if field == "amount":
                updated_expense[field] = float(data[field])
            else:
                updated_expense[field] = data[field]

    updated_expense["updated_at"] = datetime.utcnow().isoformat()

    success = data_service.update_expense(expense_id, updated_expense)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update expense"
        )

    return updated_expense


@app.delete("/api/v1/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete expense record."""
    # Check if expense exists and belongs to user
    expense = data_service.get_expense(expense_id)
    if not expense or expense["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )

    success = data_service.delete_expense(expense_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete expense record"
        )

    return {"message": "Expense record deleted successfully"}


# Budget endpoints


@app.post("/api/v1/budgets")
async def create_budget(request: Request, current_user: Dict = Depends(get_current_user)):
    """Create budget."""
    data = await request.json()

    validate_required_fields(data, ["category", "amount"])

    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be a positive number"
        )

    # Check if budget already exists for this category and period
    user_budgets = data_service.get_budgets_by_user(current_user["id"])
    existing_budget = None
    for budget in user_budgets:
        if (budget["category"] == data["category"] and
                budget["period"] == data.get("period", "monthly")):
            existing_budget = budget
            break

    if existing_budget:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Budget already exists for {data['category']} ({data.get('period', 'monthly')})"
        )

    budget_id = secrets.token_urlsafe(16)
    budget = {
        "id": budget_id,
        "user_id": current_user["id"],
        "category": data["category"],
        "amount": amount,
        "period": data.get("period", "monthly"),
        "description": data.get("description", ""),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    data_service.add_budget(budget)
    return budget


@app.get("/api/v1/budgets")
async def get_budgets(current_user: Dict = Depends(get_current_user)):
    """Get user budgets."""
    user_budgets = data_service.get_budgets_by_user(current_user["id"])
    return user_budgets


@app.get("/api/v1/settings")
async def get_user_settings(current_user: Dict = Depends(get_current_user)):
    """Get all user settings."""
    try:
        settings_service = get_settings_service()
        settings = settings_service.get_user_settings(current_user["id"])

        return {
            "success": True,
            "settings": settings
        }

    except Exception as e:
        logger.error(f"Error getting user settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user settings: {str(e)}"
        ) from e


@app.put("/api/v1/settings/profile")
async def update_profile_settings(request: Request, current_user: Dict = Depends(get_current_user)):
    """Update user profile settings."""
    try:
        data = await request.json()
        settings_service = get_settings_service()

        updated_settings = settings_service.update_profile(
            current_user["id"], data)

        return {
            "success": True,
            "settings": updated_settings,
            "message": "Profile updated successfully"
        }

    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        ) from e


@app.put("/api/v1/settings/preferences")
async def update_preferences_settings(request: Request, current_user: Dict = Depends(get_current_user)):
    """Update user preferences."""
    try:
        from services.settings_service import get_settings_service

        data = await request.json()
        settings_service = get_settings_service()

        updated_settings = settings_service.update_preferences(
            current_user["id"], data)

        return {
            "success": True,
            "settings": updated_settings,
            "message": "Preferences updated successfully"
        }

    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        ) from e


@app.put("/api/v1/settings/notifications")
async def update_notification_settings(request: Request, current_user: Dict = Depends(get_current_user)):
    """Update notification preferences."""
    try:
        from services.settings_service import get_settings_service

        data = await request.json()
        settings_service = get_settings_service()

        updated_settings = settings_service.update_notifications(
            current_user["id"], data)

        return {
            "success": True,
            "settings": updated_settings,
            "message": "Notification preferences updated successfully"
        }

    except Exception as e:
        logger.error(f"Error updating notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notifications: {str(e)}"
        ) from e


@app.put("/api/v1/settings/receipts")
async def update_receipt_settings(request: Request, current_user: Dict = Depends(get_current_user)):
    """Update receipt processing settings."""
    try:
        from services.settings_service import get_settings_service

        data = await request.json()
        settings_service = get_settings_service()

        updated_settings = settings_service.update_receipt_settings(
            current_user["id"], data)

        return {
            "success": True,
            "settings": updated_settings,
            "message": "Receipt settings updated successfully"
        }

    except Exception as e:
        logger.error(f"Error updating receipt settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update receipt settings: {str(e)}"
        ) from e


@app.put("/api/v1/settings/security")
async def update_security_settings(request: Request, current_user: Dict = Depends(get_current_user)):
    """Update security settings."""
    try:
        from services.settings_service import get_settings_service

        data = await request.json()
        settings_service = get_settings_service()

        updated_settings = settings_service.update_security_settings(
            current_user["id"], data)

        return {
            "success": True,
            "settings": updated_settings,
            "message": "Security settings updated successfully"
        }

    except Exception as e:
        logger.error(f"Error updating security settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security settings: {str(e)}"
        ) from e


@app.post("/api/v1/auth/change-password")
async def change_password(request: Request, current_user: Dict = Depends(get_current_user)):
    """Change user password."""
    try:
        data = await request.json()

        # Validate required fields
        validate_required_fields(data, ["currentPassword", "newPassword"])

        current_password = data["currentPassword"]
        new_password = data["newPassword"]

        # Verify current password
        if not verify_password(current_password, current_user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Validate new password strength
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long"
            )

        # Update password
        current_user["password_hash"] = hash_password(new_password)
        current_user["updated_at"] = datetime.utcnow().isoformat()

        # Save to data service
        data_service.save_user(current_user["id"], current_user)

        return {
            "success": True,
            "message": "Password changed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        ) from e


@app.get("/api/v1/settings/statistics")
async def get_user_statistics(current_user: Dict = Depends(get_current_user)):
    """Get user account statistics."""
    try:
        from services.settings_service import get_settings_service

        settings_service = get_settings_service()
        statistics = settings_service.get_user_statistics(current_user["id"])

        return {
            "success": True,
            "statistics": statistics
        }

    except Exception as e:
        logger.error(f"Error getting user statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user statistics: {str(e)}"
        ) from e


@app.post("/api/v1/settings/export-data")
async def export_user_data(current_user: Dict = Depends(get_current_user)):
    """Export user data (placeholder for future implementation)."""
    try:
        # TODO: Implement actual data export functionality
        # This would typically generate a ZIP file with all user data

        return {
            "success": True,
            "message": "Data export initiated. You'll receive an email when ready.",
            "note": "This is a placeholder implementation"
        }

    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export user data: {str(e)}"
        ) from e


@app.delete("/api/v1/settings/delete-account")
async def delete_user_account(current_user: Dict = Depends(get_current_user)):
    """Delete user account and all associated data."""
    try:
        user_id = current_user["id"]

        # TODO: Implement comprehensive account deletion
        # This should delete:
        # - User profile
        # - All expenses
        # - All budgets
        # - All income records
        # - All settings
        # - All stored images

        # For now, just deactivate the account
        current_user["is_active"] = False
        current_user["deleted_at"] = datetime.utcnow().isoformat()
        current_user["updated_at"] = datetime.utcnow().isoformat()

        data_service.save_user(user_id, current_user)

        return {
            "success": True,
            "message": "Account deletion initiated. You will be logged out shortly."
        }

    except Exception as e:
        logger.error(f"Error deleting user account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        ) from e


# @app.delete("/api/v1/budgets/{budget_id}")
# async def delete_budget(budget_id: str, current_user: Dict = Depends(get_current_user)):
#     """Delete budget."""
#     # Find budget
#     budget = None
#     for b in data_service.budgets_db:
#         if b["id"] == budget_id and b["user_id"] == current_user["id"]:
#             budget = b
#             break
@app.put("/api/v1/budgets/{budget_id}")
async def update_budget(budget_id: str, request: Request, current_user: Dict = Depends(get_current_user)):
    """Update an existing budget."""
    data = await request.json()
    
    # Find the budget that belongs to the user
    user_budget = None
    for budget in data_service.budgets_db:
        if budget["id"] == budget_id and budget["user_id"] == current_user["id"]:
            user_budget = budget
            break

    if not user_budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Validate amount if provided
    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a positive number"
            )

    # Create updated budget
    updated_budget = user_budget.copy()

    # Update allowed fields
    allowed_fields = ["category", "amount", "period", "description"]
    for field in allowed_fields:
        if field in data:
            if field == "amount":
                updated_budget[field] = float(data[field])
            else:
                updated_budget[field] = data[field]

    updated_budget["updated_at"] = datetime.utcnow().isoformat()

    # Update in data service
    success = data_service.update_budget(budget_id, updated_budget)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update budget"
        )

    return updated_budget


@app.delete("/api/v1/budgets/{budget_id}")
async def delete_budget(budget_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a budget."""
    # Check if budget exists and belongs to user
    user_budget = data_service.get_budget(budget_id)
    if not user_budget or user_budget["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    # Delete the budget
    if not data_service.delete_budget(budget_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete budget"
        )

    return {"message": "Budget deleted successfully"}


# Categories API endpoint for AI suggestions
@app.post("/api/v1/categories/suggest")
async def suggest_category(request: Request, current_user: Dict = Depends(get_current_user)):
    """Suggest expense category based on description and amount."""
    data = await request.json()

    validate_required_fields(data, ["description", "amount"])

    description = data["description"].lower().strip()
    amount = float(data["amount"])

    # Simple rule-based category suggestion
    # In production, you could use ML/AI for better suggestions
    category_suggestions = {
        "food": ["Food & Dining", 0.9],
        "restaurant": ["Food & Dining", 0.9],
        "grocery": ["Food & Dining", 0.8],
        "uber": ["Transportation", 0.9],
        "lyft": ["Transportation", 0.9],
        "gas": ["Transportation", 0.8],
        "fuel": ["Transportation", 0.8],
        "amazon": ["Shopping", 0.8],
        "walmart": ["Shopping", 0.8],
        "target": ["Shopping", 0.8],
        "netflix": ["Entertainment", 0.9],
        "spotify": ["Entertainment", 0.9],
        "movie": ["Entertainment", 0.8],
        "electric": ["Utilities", 0.9],
        "water": ["Utilities", 0.9],
        "internet": ["Utilities", 0.8],
        "phone": ["Utilities", 0.8],
        "doctor": ["Healthcare", 0.9],
        "pharmacy": ["Healthcare", 0.8],
        "hospital": ["Healthcare", 0.9],
    }

    # Find best match
    best_category = "Other"
    best_confidence = 0.5

    for keyword, (category, confidence) in category_suggestions.items():
        if keyword in description:
            if confidence > best_confidence:
                best_category = category
                best_confidence = confidence

    # Adjust confidence based on amount (very high or very low amounts might be less reliable)
    if amount > 1000 or amount < 1:
        best_confidence *= 0.8

    return {
        "category": best_category,
        "confidence": best_confidence,
        "description": description,
        "amount": amount
    }

# OCR Receipt Processing Endpoints


@app.post("/api/v1/expenses/upload-receipt")
async def upload_receipt(request: Request, current_user: Dict = Depends(get_current_user)):
    """Upload and process receipt with comprehensive validation"""

    try:
        # Parse multipart form data
        form = await request.form()

        # Get uploaded file
        uploaded_file = form.get("file")
        if not uploaded_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file uploaded"
            )

        # Read file data
        file_data = await uploaded_file.read()
        filename = uploaded_file.filename or "unknown"

        # STEP 1: Multi-layer file validation (BEFORE any storage)
        validation_result = await image_validation_service.validate_file(
            file_data, filename, current_user["id"]
        )

        if not validation_result["valid"]:
            return {
                "success": False,
                "error": validation_result["error"],
                "reason": validation_result["reason"]
            }

        # Use sanitized data from validation
        sanitized_data = validation_result["sanitized_data"]

        # STEP 2: Receipt authenticity validation (CRITICAL - BEFORE storage)
        receipt_validation = await ocr_service.validate_receipt_before_storage(
            sanitized_data, filename
        )

        if not receipt_validation["valid"]:
            return {
                "success": False,
                "error": receipt_validation["error"],
                "reason": receipt_validation["reason"],
                "validation_stage": "receipt_authenticity"
            }

        # STEP 3: AI OCR processing (only for validated receipts)
        extracted_data = await ocr_service.extract_receipt_data(sanitized_data, filename)

        if not extracted_data.get("is_receipt", True):
            return {
                "success": False,
                "error": "Invalid receipt content",
                "reason": "AI analysis indicates this is not a valid receipt"
            }

        # STEP 4: Duplicate detection
        duplicate_service = get_duplicate_detection_service(data_service)
        duplicate_check = duplicate_service.check_duplicate_expense(
            extracted_data, current_user["id"]
        )

        if duplicate_check["is_duplicate"]:
            return {
                "success": False,
                "error": "Receipt already processed",
                "is_duplicate": True,
                "existing_expense": duplicate_check["existing_expense"],
                "duplicate_confidence": duplicate_check["confidence"],
                "message": duplicate_check["message"]
            }

        # STEP 5: Store receipt with persistent 24-hour token
        image_token = persistent_storage.store_receipt(
            sanitized_data, current_user["id"], filename, extracted_data
        )

        # STEP 6: Confidence-based expense creation
        confidence = extracted_data.get("confidence", 0.0)
        should_auto_create = (
            confidence >= 0.8 and  # High confidence threshold
            extracted_data.get("total_amount", 0) > 0 and
            extracted_data.get("merchant", "").strip() != "" and
            len(extracted_data.get("validation_warnings", [])) == 0
        )

        if should_auto_create:
            # Auto-create expense
            expense_id = secrets.token_urlsafe(16)
            expense = {
                "id": expense_id,
                "user_id": current_user["id"],
                "description": extracted_data.get("merchant", "Receipt Expense"),
                "amount": extracted_data.get("total_amount", 0),
                "category": extracted_data.get("category", "Other"),
                "date": extracted_data.get("date", datetime.utcnow().date().isoformat()),
                "payment_method": extracted_data.get("payment_method", "other"),
                "notes": f"Auto-created from receipt (confidence: {confidence:.1%})",
                "receipt_token": image_token,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }

            data_service.add_expense(expense)

            # Link receipt to expense
            persistent_storage.update_receipt_expense(
                image_token, current_user["id"], expense_id
            )

            return {
                "success": True,
                "auto_created": True,
                "expense": expense,
                "confidence": confidence,
                "confidence_level": extracted_data.get("confidence_level", "high"),
                "confidence_explanation": extracted_data.get("confidence_explanation", ""),
                "extracted_data": extracted_data,
                "receipt_token": image_token,
                "message": "Receipt processed and expense created automatically"
            }
        else:
            # Require manual review
            return {
                "success": True,
                "auto_created": False,
                "requires_review": True,
                "confidence": confidence,
                "confidence_level": extracted_data.get("confidence_level", "medium"),
                "confidence_explanation": extracted_data.get("confidence_explanation", ""),
                "extracted_data": extracted_data,
                "receipt_token": image_token,
                "validation_warnings": extracted_data.get("validation_warnings", []),
                "message": "Receipt processed but requires manual review before creating expense"
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Receipt processing failed: {str(e)}"
        )


@app.post("/api/v1/expenses/create-from-receipt")
async def create_expense_from_receipt(request: Request, current_user: Dict = Depends(get_current_user)):
    """Create expense from receipt data (manual review flow)"""

    try:
        data = await request.json()

        # Validate required fields
        validate_required_fields(data, ["receipt_token"])

        receipt_token = data["receipt_token"]

        # Get receipt data
        receipt_data = persistent_storage.get_receipt(
            receipt_token, current_user["id"])
        if not receipt_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found or expired"
            )

        # Use provided data or fall back to extracted data
        extracted_data = receipt_data.get("extracted_data", {})

        expense_data = {
            "description": data.get("description") or extracted_data.get("merchant", "Receipt Expense"),
            "amount": data.get("amount") or extracted_data.get("total_amount", 0),
            "category": data.get("category") or extracted_data.get("category", "Other"),
            "date": data.get("date") or extracted_data.get("date", datetime.utcnow().date().isoformat()),
            "payment_method": data.get("payment_method") or extracted_data.get("payment_method", "other"),
            "notes": data.get("notes", f"Created from receipt (manual review)")
        }

        # Validate expense data
        validate_required_fields(expense_data, ["description", "amount"])

        try:
            amount = float(expense_data["amount"])
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a positive number"
            )

        # Create expense
        expense_id = secrets.token_urlsafe(16)
        expense = {
            "id": expense_id,
            "user_id": current_user["id"],
            "description": expense_data["description"],
            "amount": amount,
            "category": expense_data["category"],
            "date": expense_data["date"],
            "payment_method": expense_data["payment_method"],
            "notes": expense_data["notes"],
            "receipt_token": receipt_token,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        data_service.add_expense(expense)

        # Link receipt to expense
        persistent_storage.update_receipt_expense(
            receipt_token, current_user["id"], expense_id
        )

        return {
            "success": True,
            "expense": expense,
            "message": "Expense created successfully from receipt"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense from receipt: {str(e)}"
        )


@app.get("/api/v1/receipts/list")
async def list_user_receipts(current_user: Dict = Depends(get_current_user)):
    """List all user receipts with expense status"""

    try:
        receipts = persistent_storage.list_user_receipts(current_user["id"])

        # Enhance receipt data with expense information
        enhanced_receipts = []
        for receipt in receipts:
            enhanced_receipt = {
                "token": receipt["token"],
                "filename": receipt["filename"],
                "created_at": receipt["created_at"],
                "expires_at": receipt["expires_at"],
                "processing_status": receipt.get("processing_status", "stored"),
                "expense_id": receipt.get("expense_id"),
                "accessed_count": receipt.get("accessed_count", 0),
                "extracted_data": {
                    "merchant": receipt.get("extracted_data", {}).get("merchant", ""),
                    "amount": receipt.get("extracted_data", {}).get("total_amount", 0),
                    "date": receipt.get("extracted_data", {}).get("date", ""),
                    "category": receipt.get("extracted_data", {}).get("category", ""),
                    "confidence": receipt.get("extracted_data", {}).get("confidence", 0)
                }
            }
            enhanced_receipts.append(enhanced_receipt)

        return {
            "success": True,
            "receipts": enhanced_receipts,
            "total_count": len(enhanced_receipts)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list receipts: {str(e)}"
        )


@app.get("/api/v1/receipts/image/{token}")
async def get_receipt_image(token: str, current_user: Dict = Depends(get_current_user)):
    """Secure receipt image retrieval with persistent storage"""

    try:
        receipt_data = persistent_storage.get_receipt(
            token, current_user["id"])

        if not receipt_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found or expired"
            )

        # Return image data as base64
        image_data = receipt_data["image_data"]
        filename = receipt_data["filename"]

        # Determine content type based on original file
        if filename.lower().endswith('.pdf'):
            content_type = "application/pdf"
        else:
            content_type = "image/jpeg"  # Images are sanitized to JPEG

        return {
            "success": True,
            "image_data": base64.b64encode(image_data).decode() if isinstance(image_data, bytes) else image_data,
            "filename": filename,
            "content_type": content_type,
            "extracted_data": receipt_data.get("extracted_data", {}),
            "processing_status": receipt_data.get("processing_status", "stored")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve receipt image: {str(e)}"
        )


@app.delete("/api/v1/receipts/image/{token}")
async def delete_receipt_image(token: str, current_user: Dict = Depends(get_current_user)):
    """Delete receipt and optionally associated expense"""

    try:
        # Get receipt data first to check for associated expense
        receipt_data = persistent_storage.get_receipt(
            token, current_user["id"])

        if not receipt_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found or expired"
            )

        # Delete receipt from storage
        success = persistent_storage.delete_receipt(token, current_user["id"])

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete receipt"
            )

        # Note: We don't automatically delete the associated expense
        # as users might want to keep the expense record

        return {
            "success": True,
            "message": "Receipt deleted successfully",
            "had_associated_expense": receipt_data.get("expense_id") is not None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete receipt: {str(e)}"
        )


@app.get("/api/v1/receipts/stats")
async def get_receipt_stats(current_user: Dict = Depends(get_current_user)):
    """Get receipt processing statistics for the user"""

    try:
        # Get user receipts
        receipts = persistent_storage.list_user_receipts(current_user["id"])

        # Calculate statistics
        total_receipts = len(receipts)
        processed_receipts = len(
            [r for r in receipts if r.get("processing_status") == "processed"])
        pending_receipts = total_receipts - processed_receipts

        # Confidence distribution
        confidence_levels = {"high": 0, "medium": 0, "low": 0}
        for receipt in receipts:
            extracted_data = receipt.get("extracted_data", {})
            level = extracted_data.get("confidence_level", "medium")
            if level in confidence_levels:
                confidence_levels[level] += 1

        # Get storage stats
        storage_stats = persistent_storage.get_storage_stats()

        return {
            "success": True,
            "user_stats": {
                "total_receipts": total_receipts,
                "processed_receipts": processed_receipts,
                "pending_receipts": pending_receipts,
                "confidence_distribution": confidence_levels
            },
            "storage_stats": storage_stats
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get receipt stats: {str(e)}"
        )
