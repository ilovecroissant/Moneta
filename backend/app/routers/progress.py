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
    with get_session() as session:
        user = session.exec(select(User).where(User.handle == handle)).first()
        if user:
            return user
    with get_session() as session:
        user = User(handle=handle)
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
    unlocked = [f"{c}:1" for c in CATEGORIES] if rec.xp >= 0 else []
    return Progress(handle=handle, xp=rec.xp, streak=rec.streak, unlocked=unlocked)


@router.post("/{handle}", response_model=Progress)
def set_progress(handle: str, body: ProgressUpdate) -> Progress:
    user = _get_or_create_user(handle)
    rec = _get_or_create_progress(user.id)
    with get_session() as session:
        rec = session.get(UserProgressRecord, rec.id)
        if body.xp is not None:
            rec.xp = body.xp
        if body.streak is not None:
            rec.streak = body.streak
        session.add(rec)
        session.commit()
        session.refresh(rec)
    unlocked = [f"{c}:1" for c in CATEGORIES] if rec.xp >= 0 else []
    return Progress(handle=handle, xp=rec.xp, streak=rec.streak, unlocked=unlocked)


