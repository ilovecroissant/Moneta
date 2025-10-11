from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    handle: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LLMCacheRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    prompt_hash: str = Field(index=True, unique=True)
    response_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserProgressRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    category: str = Field(default="all", index=True)
    level: int = Field(default=0, index=True)
    xp: int = Field(default=0)
    streak: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

