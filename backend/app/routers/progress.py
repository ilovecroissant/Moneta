from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import select
from datetime import datetime, timedelta

from ..db import get_session
from ..models import User, XPEvent
from ..schemas import Progress


router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressUpdate(BaseModel):
    xp: int | None = None
    streak: int | None = None
    completed_lessons: list[int] | None = None
    unlocked_achievements: list[str] | None = None
    perfect_scores: int | None = None


def _get_or_create_user(handle: str) -> User:
    """Legacy function for backward compatibility - gets user by username"""
    with get_session() as session:
        user = session.exec(select(User).where(User.username == handle)).first()
        if user:
            return user
    # Create a basic user if not found (for backward compatibility)
    # Use a dummy email for legacy/guest users
    with get_session() as session:
        dummy_email = f"{handle}@legacy.local"
        user = User(username=handle, email=dummy_email, xp=0, streak=0)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


@router.get("/{handle}", response_model=Progress)
def get_progress(handle: str) -> Progress:
    user = _get_or_create_user(handle)
    
    # Sequential unlock is now handled by frontend based on completion order
    # No need for unlock tokens anymore
    unlocked = []
    
    # Parse completed lessons from comma-separated string
    completed_lessons = []
    if user.completed_lessons:
        completed_lessons = [int(x) for x in user.completed_lessons.split(",") if x.strip()]
    
    # Parse unlocked achievements from comma-separated string
    unlocked_achievements = []
    if user.unlocked_achievements:
        unlocked_achievements = [x.strip() for x in user.unlocked_achievements.split(",") if x.strip()]
    
    # Compute today's XP from XPEvent
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    with get_session() as session:
        events = session.exec(
            select(XPEvent).where(
                XPEvent.user_id == user.id,
                XPEvent.created_at >= start_of_day,
            )
        ).all()
    daily_xp = sum(e.xp_delta for e in events)

    # Return XP, streak, and completed lessons from User table
    return Progress(
        handle=handle, 
        xp=user.xp, 
        streak=user.streak, 
        unlocked=unlocked,
        completed_lessons=completed_lessons,
        daily_xp=daily_xp,
        unlocked_achievements=unlocked_achievements,
        perfect_scores=user.perfect_scores,
    )


@router.post("/{handle}", response_model=Progress)
def set_progress(handle: str, body: ProgressUpdate) -> Progress:
    user = _get_or_create_user(handle)
    
    with get_session() as session:
        user_db = session.get(User, user.id)
        
        if body.xp is not None:
            # Log XP delta if increased
            old_xp = user_db.xp or 0
            new_xp = body.xp
            user_db.xp = new_xp
            delta = (new_xp or 0) - (old_xp or 0)
            if delta > 0:
                xp_event = XPEvent(user_id=user_db.id, xp_delta=delta)
                session.add(xp_event)
        
        if body.streak is not None:
            user_db.streak = body.streak
        
        if body.completed_lessons is not None:
            # Convert list to comma-separated string
            user_db.completed_lessons = ",".join(str(x) for x in body.completed_lessons)
        
        if body.unlocked_achievements is not None:
            # Convert list to comma-separated string
            user_db.unlocked_achievements = ",".join(body.unlocked_achievements)
        
        if body.perfect_scores is not None:
            user_db.perfect_scores = body.perfect_scores
        
        session.add(user_db)
        session.commit()
        session.refresh(user_db)
    
    # Sequential unlock is now handled by frontend based on completion order
    unlocked = []
    
    # Parse completed lessons for response
    completed_lessons = []
    if user_db.completed_lessons:
        completed_lessons = [int(x) for x in user_db.completed_lessons.split(",") if x.strip()]
    
    # Parse unlocked achievements for response
    unlocked_achievements = []
    if user_db.unlocked_achievements:
        unlocked_achievements = [x.strip() for x in user_db.unlocked_achievements.split(",") if x.strip()]
    
    # Compute today's XP for response
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    with get_session() as session:
        events = session.exec(
            select(XPEvent).where(
                XPEvent.user_id == user_db.id,
                XPEvent.created_at >= start_of_day,
            )
        ).all()
    daily_xp = sum(e.xp_delta for e in events)

    # Return values from User table
    return Progress(
        handle=handle, 
        xp=user_db.xp, 
        streak=user_db.streak, 
        unlocked=unlocked,
        completed_lessons=completed_lessons,
        daily_xp=daily_xp,
        unlocked_achievements=unlocked_achievements,
        perfect_scores=user_db.perfect_scores,
    )


