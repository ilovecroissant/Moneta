from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
import hashlib
import secrets
from datetime import datetime, timedelta

from ..db import get_session
from ..models import User, Session, PasswordResetToken
from ..schemas import (
    UserRegister,
    UserLogin,
    GoogleAuthRequest,
    AuthResponse,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordResetResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Session configuration
SESSION_EXPIRY_DAYS = 7  # Sessions expire after 7 days
PASSWORD_RESET_EXPIRY_HOURS = 1  # Reset tokens expire after 1 hour


def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash


def create_session_token(user_id: int) -> str:
    """Create a session token and store in database"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS)
    
    with get_session() as db_session:
        session = Session(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
            last_activity=datetime.utcnow()
        )
        db_session.add(session)
        db_session.commit()
    
    return token


def get_user_from_token(token: str) -> int | None:
    """Get user ID from session token (database lookup)"""
    with get_session() as db_session:
        statement = select(Session).where(
            Session.token == token,
            Session.expires_at > datetime.utcnow()
        )
        session = db_session.exec(statement).first()
        
        if session:
            # Update last activity
            session.last_activity = datetime.utcnow()
            db_session.add(session)
            db_session.commit()
            return session.user_id
        
        return None


def invalidate_session(token: str) -> bool:
    """Delete session from database"""
    with get_session() as db_session:
        statement = select(Session).where(Session.token == token)
        session = db_session.exec(statement).first()
        
        if session:
            db_session.delete(session)
            db_session.commit()
            return True
        
        return False


def cleanup_expired_sessions():
    """Remove expired sessions from database"""
    with get_session() as db_session:
        statement = select(Session).where(Session.expires_at <= datetime.utcnow())
        expired_sessions = db_session.exec(statement).all()
        
        for session in expired_sessions:
            db_session.delete(session)
        
        db_session.commit()
        return len(expired_sessions)


@router.post("/register", response_model=AuthResponse)
def register(user_data: UserRegister) -> AuthResponse:
    """Register a new user with username and password"""
    with get_session() as session:
        # Check if username already exists
        existing_user = session.exec(
            select(User).where(User.username == user_data.username)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Check if email already exists (if provided)
        if user_data.email:
            existing_email = session.exec(
                select(User).where(User.email == user_data.email)
            ).first()
            
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            display_name=user_data.username,
            xp=0,
            streak=0,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow(),
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Create session token
        token = create_session_token(new_user.id)
        
        return AuthResponse(
            user_id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            display_name=new_user.display_name,
            xp=new_user.xp,
            streak=new_user.streak,
            token=token,
        )


@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin) -> AuthResponse:
    """Login with username or email and password"""
    with get_session() as session:
        # Try to find user by username or email
        user = session.exec(
            select(User).where(
                (User.username == credentials.username_or_email) |
                (User.email == credentials.username_or_email)
            )
        ).first()
        
        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create session token
        token = create_session_token(user.id)
        
        return AuthResponse(
            user_id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            xp=user.xp,
            streak=user.streak,
            token=token,
        )


@router.post("/google", response_model=AuthResponse)
def google_auth(auth_data: GoogleAuthRequest) -> AuthResponse:
    """Authenticate with Google OAuth"""
    # TODO: Verify Google token with Google's API
    # For now, this is a placeholder
    # In production, you would:
    # 1. Verify the token with Google
    # 2. Extract user info (email, name, google_id)
    # 3. Create or update user
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented. Use regular login/signup for now."
    )


@router.get("/me", response_model=UserResponse)
def get_current_user(token: str) -> UserResponse:
    """Get current user info from session token"""
    user_id = get_user_from_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    with get_session() as session:
        user = session.get(User, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            xp=user.xp,
            streak=user.streak,
        )


@router.post("/logout")
def logout(token: str) -> dict:
    """Logout and invalidate session token"""
    invalidate_session(token)
    return {"message": "Logged out successfully"}


@router.post("/guest", response_model=dict)
def guest_mode() -> dict:
    """Enter guest mode (no authentication required)"""
    return {
        "message": "Guest mode enabled",
        "note": "Progress will not be saved"
    }


@router.post("/password-reset/request", response_model=PasswordResetResponse)
def request_password_reset(request: PasswordResetRequest) -> PasswordResetResponse:
    """
    Request a password reset token.
    In production, this would send an email with the reset link.
    For development, we return the token in the response.
    """
    with get_session() as session:
        # Find user by email
        statement = select(User).where(User.email == request.email)
        user = session.exec(statement).first()
        
        if not user:
            # For security, don't reveal if email exists or not
            # Return success message even if user doesn't exist
            return PasswordResetResponse(
                message="If an account exists with this email, a password reset link has been sent."
            )
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)
        
        # Invalidate any existing reset tokens for this user
        existing_tokens = session.exec(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False
            )
        ).all()
        
        for old_token in existing_tokens:
            old_token.used = True
            session.add(old_token)
        
        # Create new reset token
        reset_token = PasswordResetToken(
            token=token,
            user_id=user.id,
            email=user.email,
            expires_at=expires_at
        )
        session.add(reset_token)
        session.commit()
        
        # In production, send email with reset link here
        # For development, return the token in response
        return PasswordResetResponse(
            message="Password reset token generated. Check your email.",
            email=user.email,  # Only for development - remove in production
            token=token  # Only for development - remove in production!
        )


@router.post("/password-reset/confirm", response_model=PasswordResetResponse)
def confirm_password_reset(request: PasswordResetConfirm) -> PasswordResetResponse:
    """
    Confirm password reset with token and set new password.
    """
    with get_session() as session:
        # Find valid reset token
        statement = select(PasswordResetToken).where(
            PasswordResetToken.token == request.token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        )
        reset_token = session.exec(statement).first()
        
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Get the user
        user = session.exec(
            select(User).where(User.id == reset_token.user_id)
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )
        
        # Update password
        user.password_hash = hash_password(request.new_password)
        session.add(user)
        
        # Mark token as used
        reset_token.used = True
        session.add(reset_token)
        
        # Invalidate all existing sessions for this user (force re-login)
        existing_sessions = session.exec(
            select(Session).where(Session.user_id == user.id)
        ).all()
        
        for user_session in existing_sessions:
            session.delete(user_session)
        
        session.commit()
        
        return PasswordResetResponse(
            message="Password reset successfully. Please log in with your new password."
        )


@router.post("/cleanup-sessions")
def cleanup_sessions_endpoint() -> dict:
    """
    Admin endpoint to cleanup expired sessions.
    In production, this should be called by a scheduled task.
    """
    count = cleanup_expired_sessions()
    return {
        "message": f"Cleaned up {count} expired sessions"
    }

