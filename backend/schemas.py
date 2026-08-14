from pydantic import BaseModel, EmailStr
from datetime import datetime


# ======================================================
# REGISTER
# ======================================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


# ======================================================
# LOGIN
# ======================================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ======================================================
# LOGIN RESPONSE
# ======================================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    email: EmailStr


# ======================================================
# EVENT
# ======================================================

class EventCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: datetime