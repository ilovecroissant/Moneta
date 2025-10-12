from datetime import datetime
from fastapi import APIRouter, HTTPException
from sqlmodel import select, or_, and_
from pydantic import BaseModel

from ..db import get_session
from ..models import User, FriendRequest, Friendship

router = APIRouter(tags=["friends"], prefix="/friends")


# Request models
class FriendRequestCreate(BaseModel):
    from_user_id: int
    to_user_id: int


@router.get("/search")
def search_users(query: str, current_user_id: int):
    """Search for users by username or email"""
    if not query or len(query) < 2:
        return {"users": []}
    
    with get_session() as session:
        # Search by username or email (case-insensitive)
        stmt = select(User).where(
            or_(
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        ).where(User.id != current_user_id).limit(10)
        
        users = session.exec(stmt).all()
        
        return {
            "users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name or user.username,
                    "xp": user.xp,
                    "streak": user.streak
                }
                for user in users
            ]
        }


@router.post("/request")
def send_friend_request(request: FriendRequestCreate):
    """Send a friend request"""
    from_user_id = request.from_user_id
    to_user_id = request.to_user_id
    
    if from_user_id == to_user_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    with get_session() as session:
        # Check if users exist
        from_user = session.get(User, from_user_id)
        to_user = session.get(User, to_user_id)
        
        if not from_user or not to_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already friends
        existing_friendship = session.exec(
            select(Friendship).where(
                or_(
                    and_(Friendship.user_id_1 == from_user_id, Friendship.user_id_2 == to_user_id),
                    and_(Friendship.user_id_1 == to_user_id, Friendship.user_id_2 == from_user_id)
                )
            )
        ).first()
        
        if existing_friendship:
            raise HTTPException(status_code=400, detail="Already friends")
        
        # Check if request already exists
        existing_request = session.exec(
            select(FriendRequest).where(
                and_(
                    FriendRequest.from_user_id == from_user_id,
                    FriendRequest.to_user_id == to_user_id,
                    FriendRequest.status == "pending"
                )
            )
        ).first()
        
        if existing_request:
            raise HTTPException(status_code=400, detail="Friend request already sent")
        
        # Create friend request
        friend_request = FriendRequest(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            status="pending"
        )
        session.add(friend_request)
        session.commit()
        session.refresh(friend_request)
        
        return {"message": "Friend request sent", "request_id": friend_request.id}


@router.get("/requests/{user_id}")
def get_friend_requests(user_id: int):
    """Get pending friend requests for a user"""
    with get_session() as session:
        # Get incoming requests
        incoming_stmt = select(FriendRequest).where(
            and_(
                FriendRequest.to_user_id == user_id,
                FriendRequest.status == "pending"
            )
        )
        incoming_requests = session.exec(incoming_stmt).all()
        
        # Get outgoing requests
        outgoing_stmt = select(FriendRequest).where(
            and_(
                FriendRequest.from_user_id == user_id,
                FriendRequest.status == "pending"
            )
        )
        outgoing_requests = session.exec(outgoing_stmt).all()
        
        # Get user info for requests
        incoming_data = []
        for req in incoming_requests:
            from_user = session.get(User, req.from_user_id)
            if from_user:
                incoming_data.append({
                    "request_id": req.id,
                    "from_user": {
                        "id": from_user.id,
                        "username": from_user.username,
                        "display_name": from_user.display_name or from_user.username,
                        "xp": from_user.xp,
                        "streak": from_user.streak
                    },
                    "created_at": req.created_at.isoformat()
                })
        
        outgoing_data = []
        for req in outgoing_requests:
            to_user = session.get(User, req.to_user_id)
            if to_user:
                outgoing_data.append({
                    "request_id": req.id,
                    "to_user": {
                        "id": to_user.id,
                        "username": to_user.username,
                        "display_name": to_user.display_name or to_user.username,
                        "xp": to_user.xp,
                        "streak": to_user.streak
                    },
                    "created_at": req.created_at.isoformat()
                })
        
        return {
            "incoming": incoming_data,
            "outgoing": outgoing_data
        }


@router.post("/requests/{request_id}/accept")
def accept_friend_request(request_id: int):
    """Accept a friend request"""
    with get_session() as session:
        friend_request = session.get(FriendRequest, request_id)
        
        if not friend_request:
            raise HTTPException(status_code=404, detail="Friend request not found")
        
        if friend_request.status != "pending":
            raise HTTPException(status_code=400, detail="Friend request already processed")
        
        # Update request status
        friend_request.status = "accepted"
        friend_request.updated_at = datetime.utcnow()
        
        # Create friendship
        friendship = Friendship(
            user_id_1=min(friend_request.from_user_id, friend_request.to_user_id),
            user_id_2=max(friend_request.from_user_id, friend_request.to_user_id)
        )
        
        session.add(friendship)
        session.commit()
        
        return {"message": "Friend request accepted"}


@router.post("/requests/{request_id}/reject")
def reject_friend_request(request_id: int):
    """Reject a friend request"""
    with get_session() as session:
        friend_request = session.get(FriendRequest, request_id)
        
        if not friend_request:
            raise HTTPException(status_code=404, detail="Friend request not found")
        
        if friend_request.status != "pending":
            raise HTTPException(status_code=400, detail="Friend request already processed")
        
        # Update request status
        friend_request.status = "rejected"
        friend_request.updated_at = datetime.utcnow()
        session.commit()
        
        return {"message": "Friend request rejected"}


@router.get("/{user_id}")
def get_friends(user_id: int):
    """Get list of friends for a user"""
    with get_session() as session:
        # Get friendships where user is either user_id_1 or user_id_2
        stmt = select(Friendship).where(
            or_(
                Friendship.user_id_1 == user_id,
                Friendship.user_id_2 == user_id
            )
        )
        friendships = session.exec(stmt).all()
        
        friends_data = []
        for friendship in friendships:
            # Get the friend's user ID (the other user in the friendship)
            friend_id = friendship.user_id_2 if friendship.user_id_1 == user_id else friendship.user_id_1
            friend = session.get(User, friend_id)
            
            if friend:
                friends_data.append({
                    "id": friend.id,
                    "username": friend.username,
                    "display_name": friend.display_name or friend.username,
                    "xp": friend.xp,
                    "streak": friend.streak,
                    "friends_since": friendship.created_at.isoformat()
                })
        
        return {"friends": friends_data}


@router.get("/{user_id}/count")
def get_friends_count(user_id: int):
    """Get the count of friends for a user"""
    with get_session() as session:
        # Count friendships where user is either user_id_1 or user_id_2
        stmt = select(Friendship).where(
            or_(
                Friendship.user_id_1 == user_id,
                Friendship.user_id_2 == user_id
            )
        )
        friendships = session.exec(stmt).all()
        
        return {"count": len(friendships)}


@router.delete("/{friendship_id}")
def remove_friend(user_id: int, friend_id: int):
    """Remove a friend"""
    with get_session() as session:
        # Find the friendship
        stmt = select(Friendship).where(
            or_(
                and_(Friendship.user_id_1 == min(user_id, friend_id), Friendship.user_id_2 == max(user_id, friend_id))
            )
        )
        friendship = session.exec(stmt).first()
        
        if not friendship:
            raise HTTPException(status_code=404, detail="Friendship not found")
        
        session.delete(friendship)
        session.commit()
        
        return {"message": "Friend removed"}
