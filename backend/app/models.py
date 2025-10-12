from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)  # Required for password reset
    username: str = Field(index=True, unique=True)
    password_hash: Optional[str] = Field(default=None)  # None for OAuth users
    google_id: Optional[str] = Field(default=None, index=True, unique=True)  # For Google OAuth
    display_name: Optional[str] = Field(default=None)
    xp: int = Field(default=0)
    streak: int = Field(default=0)
    completed_lessons: str = Field(default="")  # Comma-separated lesson IDs
    unlocked_achievements: str = Field(default="")  # Comma-separated achievement IDs
    perfect_scores: int = Field(default=0)  # Count of perfect quiz scores
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)


class LLMCacheRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    prompt_hash: str = Field(index=True, unique=True)
    response_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class XPEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    xp_delta: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    user_id: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # Session expiration time
    last_activity: datetime = Field(default_factory=datetime.utcnow)


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    user_id: int = Field(index=True)
    email: str  # Store email for verification
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # Token expiration (e.g., 1 hour)
    used: bool = Field(default=False)  # Mark as used after password reset


class FriendRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    from_user_id: int = Field(index=True)  # User who sent the request
    to_user_id: int = Field(index=True)  # User who receives the request
    status: str = Field(default="pending")  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Friendship(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id_1: int = Field(index=True)  # First user
    user_id_2: int = Field(index=True)  # Second user
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyXPLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    date: datetime = Field(index=True)  # Date of the XP log
    xp_earned: int = Field(default=0)  # Total XP earned on this date
    hour: int = Field(default=0)  # Hour of the day (0-23)
    created_at: datetime = Field(default_factory=datetime.utcnow)

