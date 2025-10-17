"""Budgetly - AI-Powered Financial Management Platform."""

from fastapi import FastAPI, HTTPException, Request, status
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
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

# Auth endpoints


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


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Budgetly API is running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
