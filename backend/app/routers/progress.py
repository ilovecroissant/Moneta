from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import select

from ..db import get_session
from ..models import User, UserProgressRecord
from ..schemas import Progress


router = APIRouter(prefix="/progress", tags=["progress"])


CATEGORIES = [
    "Budgeting & Saving Basics",
    "Credit & Debt",
    "Investing & Risk",
    "Taxes & Retirement",
]


class ProgressUpdate(BaseModel):
    xp: int | None = None
    streak: int | None = None


def _get_or_create_user(handle: str) -> User:
    """Legacy function for backward compatibility - gets user by username"""
    with get_session() as session:
        user = session.exec(select(User).where(User.username == handle)).first()
        if user:
            return user
    # Create a basic user if not found (for backward compatibility)
    with get_session() as session:
        user = User(username=handle, xp=0, streak=0)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def _get_or_create_progress(user_id: int) -> UserProgressRecord:
    with get_session() as session:
        rec = session.exec(
            select(UserProgressRecord).where(
                UserProgressRecord.user_id == user_id,
                UserProgressRecord.category == "all",
                UserProgressRecord.level == 0,
            )
        ).first()
        if rec:
            return rec
    with get_session() as session:
        rec = UserProgressRecord(user_id=user_id)
        session.add(rec)
        session.commit()
        session.refresh(rec)
        return rec


@router.get("/{handle}", response_model=Progress)
def get_progress(handle: str) -> Progress:
    user = _get_or_create_user(handle)
    rec = _get_or_create_progress(user.id)
    unlocked = [f"{c}:1" for c in CATEGORIES] if user.xp >= 0 else []
    # Return XP and streak from User table (authoritative source)
    return Progress(handle=handle, xp=user.xp, streak=user.streak, unlocked=unlocked)


@router.post("/{handle}", response_model=Progress)
def set_progress(handle: str, body: ProgressUpdate) -> Progress:
    user = _get_or_create_user(handle)
    rec = _get_or_create_progress(user.id)
    with get_session() as session:
        rec = session.get(UserProgressRecord, rec.id)
        user_db = session.get(User, user.id)
        
        if body.xp is not None:
            rec.xp = body.xp
            user_db.xp = body.xp  # Also update User table
        if body.streak is not None:
            rec.streak = body.streak
            user_db.streak = body.streak  # Also update User table
        
        session.add(rec)
        session.add(user_db)
        session.commit()
        session.refresh(rec)
        session.refresh(user_db)
    unlocked = [f"{c}:1" for c in CATEGORIES] if rec.xp >= 0 else []
    return Progress(handle=handle, xp=rec.xp, streak=rec.streak, unlocked=unlocked)


