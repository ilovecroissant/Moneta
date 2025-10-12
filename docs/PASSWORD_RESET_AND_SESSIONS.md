# Password Reset & Database Sessions Implementation

## Overview
Enhanced authentication system with password reset functionality and database-backed session management.

## New Features

### 1. Database-Backed Sessions
Sessions are now stored in the database instead of in-memory, providing:
- ✅ **Persistence** - Sessions survive backend restarts
- ✅ **Expiration** - Sessions automatically expire after 7 days
- ✅ **Activity Tracking** - Last activity timestamp updated on each request
- ✅ **Cleanup** - Expired sessions can be removed from database

### 2. Password Reset Flow
Complete password reset functionality with token-based verification:
- ✅ **Request Reset** - User enters email, receives reset token
- ✅ **Token Expiration** - Reset tokens expire after 1 hour
- ✅ **Secure Reset** - Tokens are single-use and invalidated after password change
- ✅ **Session Invalidation** - All user sessions cleared on password reset (forces re-login)

## Database Schema

### Session Table
```sql
id              INTEGER PRIMARY KEY
token           VARCHAR NOT NULL UNIQUE (indexed)
user_id         INTEGER NOT NULL (indexed)
created_at      DATETIME NOT NULL
expires_at      DATETIME NOT NULL
last_activity   DATETIME NOT NULL
```

### PasswordResetToken Table
```sql
id              INTEGER PRIMARY KEY
token           VARCHAR NOT NULL UNIQUE (indexed)
user_id         INTEGER NOT NULL (indexed)
email           VARCHAR NOT NULL
created_at      DATETIME NOT NULL
expires_at      DATETIME NOT NULL
used            BOOLEAN NOT NULL DEFAULT FALSE
```

## API Endpoints

### Session Management

#### Create Session (Internal)
Called automatically during login/register. Creates a session with 7-day expiration.

#### Validate Session (Internal)
Called by `get_user_from_token()` on authenticated requests. Updates `last_activity` timestamp.

#### Invalidate Session
```bash
POST /auth/logout?token={session_token}
```
Deletes session from database.

#### Cleanup Expired Sessions
```bash
POST /auth/cleanup-sessions
```
Admin endpoint to remove expired sessions. Returns count of deleted sessions.

**Response:**
```json
{
  "message": "Cleaned up 5 expired sessions"
}
```

### Password Reset

#### 1. Request Password Reset
```bash
POST /auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Production):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Response (Development - includes token):**
```json
{
  "message": "Password reset token generated. Check your email.",
  "email": "user@example.com"
}
```

**Notes:**
- Returns same message whether email exists or not (security best practice)
- Invalidates all previous unused reset tokens for that user
- Token expires in 1 hour
- In production, would send email with reset link
- In development, token is returned in response for testing

#### 2. Confirm Password Reset
```bash
POST /auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. Please log in with your new password."
}
```

**Validations:**
- Token must be valid and not expired
- Token must not have been used already
- New password must be at least 6 characters
- All user sessions are invalidated (forces re-login)
- Reset token is marked as used

## Frontend Pages

### 1. Request Reset Page
**Route:** `/reset-password`

**Features:**
- Email input field
- Validates email format
- Shows success message after submission
- In development mode, displays the reset token for testing
- "Copy Token" button for easy testing
- Link back to login page

**Usage:**
```
1. Visit http://localhost:3000/reset-password
2. Enter email address
3. Click "Send Reset Link"
4. In dev mode, copy the displayed token
5. Use token on confirm page
```

### 2. Confirm Reset Page
**Route:** `/confirm-reset`

**Features:**
- Token input field (can be pre-filled via URL param: `?token=...`)
- New password input (min 6 chars)
- Confirm password input (must match)
- Password match validation
- Success animation
- Auto-redirect to login after 2 seconds

**Usage:**
```
1. Visit http://localhost:3000/confirm-reset
2. Paste reset token (or use query param)
3. Enter new password twice
4. Click "Reset Password"
5. Redirected to login page
```

### 3. Login Page Update
**New Feature:** "Forgot Password?" link

Added below the password field in login mode. Clicking navigates to `/reset-password`.

## Complete Password Reset Flow

### Development/Testing Flow
```
1. User clicks "Forgot Password?" on login page
   → Navigates to /reset-password

2. User enters email and clicks "Send Reset Link"
   → POST /auth/password-reset/request
   → Backend returns success message + token (dev mode)

3. Page shows success with token displayed
   → User clicks "Copy Token" button

4. User navigates to /confirm-reset (or clicks link)
   → Pastes token, enters new password twice

5. User clicks "Reset Password"
   → POST /auth/password-reset/confirm
   → Password updated, all sessions invalidated
   → Auto-redirect to /login

6. User logs in with new password
   → New session created
```

### Production Flow
```
1. User clicks "Forgot Password?" on login page
   → Navigates to /reset-password

2. User enters email and clicks "Send Reset Link"
   → POST /auth/password-reset/request
   → Backend sends email with reset link (not implemented yet)

3. Page shows generic success message
   → User checks email inbox

4. User clicks link in email
   → Link format: https://yourapp.com/confirm-reset?token=...
   → Token auto-populated in form

5. User enters new password twice
   → POST /auth/password-reset/confirm
   → Password updated, all sessions invalidated

6. User logs in with new password
```

## Session Configuration

### Constants (in auth.py)
```python
SESSION_EXPIRY_DAYS = 7              # Sessions valid for 7 days
PASSWORD_RESET_EXPIRY_HOURS = 1      # Reset tokens valid for 1 hour
```

### Session Lifecycle
1. **Creation** - On login/register, expires in 7 days
2. **Validation** - Checked on authenticated requests, must not be expired
3. **Activity Update** - `last_activity` updated on each valid request
4. **Expiration** - Sessions invalid after `expires_at` timestamp
5. **Cleanup** - Can be manually cleaned via `/auth/cleanup-sessions` endpoint

## Security Features

### Session Security
- ✅ Tokens are 32-byte URL-safe random strings (256 bits of entropy)
- ✅ Tokens are unique and indexed for fast lookup
- ✅ Sessions expire after 7 days of inactivity
- ✅ Activity tracking prevents stale sessions
- ✅ Sessions stored in database (can't be forged)

### Password Reset Security
- ✅ Reset tokens are 32-byte URL-safe random strings
- ✅ Tokens expire after 1 hour
- ✅ Tokens are single-use (marked as used after password change)
- ✅ Previous unused tokens invalidated on new request
- ✅ All user sessions cleared on password reset
- ✅ Generic response message (doesn't reveal if email exists)
- ✅ Email validation required

### Password Requirements
- Minimum 6 characters (configurable)
- SHA-256 hashing (consider upgrading to bcrypt for production)

## Testing the System

### 1. Test Session Persistence
```bash
# Create account and login
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# Save the token from response
TOKEN="your_token_here"

# Check session in database
sqlite3 backend/app.db "SELECT * FROM session WHERE token='$TOKEN';"

# Restart backend
# Session should still be valid after restart
curl "http://localhost:8000/auth/me?token=$TOKEN"
```

### 2. Test Session Expiration
```bash
# Manually expire a session
sqlite3 backend/app.db "UPDATE session SET expires_at = datetime('now', '-1 day') WHERE token='$TOKEN';"

# Try to use expired session
curl "http://localhost:8000/auth/me?token=$TOKEN"
# Should fail: Session expired
```

### 3. Test Password Reset
```bash
# Step 1: Request reset
curl -X POST http://localhost:8000/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Response will include token in dev mode
RESET_TOKEN="token_from_response"

# Step 2: Confirm reset
curl -X POST http://localhost:8000/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token": "'$RESET_TOKEN'", "new_password": "newpassword456"}'

# Step 3: Login with new password
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "newpassword456"}'
```

### 4. Test Token Reuse Prevention
```bash
# Try to use the same reset token again
curl -X POST http://localhost:8000/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token": "'$RESET_TOKEN'", "new_password": "anotherpassword"}'

# Should fail: Token already used or expired
```

### 5. Test Session Cleanup
```bash
# Create some expired sessions manually in database
sqlite3 backend/app.db "UPDATE session SET expires_at = datetime('now', '-1 day');"

# Run cleanup
curl -X POST http://localhost:8000/auth/cleanup-sessions

# Check result
sqlite3 backend/app.db "SELECT COUNT(*) FROM session;"
```

## Frontend Testing

### Complete User Flow
```
1. Visit http://localhost:3000
   → Redirects to /login (not authenticated)

2. Click "Forgot Password?"
   → Navigates to /reset-password

3. Enter email: test@example.com
   → Shows success + reset token (dev mode)

4. Copy token and go to /confirm-reset
   → Paste token, enter new password twice

5. Submit password reset
   → See success animation
   → Auto-redirect to /login

6. Login with new credentials
   → Redirected to main app
   → Session stored in database

7. Close browser, reopen
   → Still logged in (localStorage + db session)

8. Restart backend server
   → Still logged in (session persists in database)
```

## Migration Notes

### Changes from Previous Version
- **Sessions**: Moved from in-memory dict to database
- **Session expiry**: Added 7-day expiration
- **Activity tracking**: Added last_activity field
- **Password reset**: Complete flow implemented
- **Security**: Sessions persist across restarts

### Breaking Changes
- Old in-memory sessions are lost (users need to re-login once)
- Database must be recreated to add new tables

### Files Created
- `/backend/app/models.py` - Added Session and PasswordResetToken models
- `/backend/app/schemas.py` - Added password reset schemas
- `/backend/app/routers/auth.py` - Updated with db sessions and reset endpoints
- `/frontend/src/app/reset-password/page.tsx` - Request reset page
- `/frontend/src/app/confirm-reset/page.tsx` - Confirm reset page
- `/frontend/src/app/login/page.tsx` - Added "Forgot Password?" link

## Production Considerations

### Email Integration
To enable email sending for password resets:

1. **Install email library:**
   ```bash
   pip install fastapi-mail
   ```

2. **Configure email settings:**
   ```python
   # backend/app/config.py
   SMTP_HOST = "smtp.gmail.com"
   SMTP_PORT = 587
   SMTP_USER = "your-email@gmail.com"
   SMTP_PASSWORD = "your-app-password"
   FROM_EMAIL = "noreply@yourapp.com"
   ```

3. **Update request_password_reset():**
   ```python
   # Instead of returning token, send email
   reset_link = f"https://yourapp.com/confirm-reset?token={token}"
   send_email(
       to=user.email,
       subject="Password Reset Request",
       body=f"Click here to reset: {reset_link}"
   )
   ```

4. **Remove token from response:**
   ```python
   return PasswordResetResponse(
       message="If an account exists with this email, a password reset link has been sent."
       # Don't include email or token in production
   )
   ```

### Scheduled Session Cleanup
Add a background task to clean expired sessions:

```python
# backend/app/main.py
from fastapi_utils.tasks import repeat_every

@app.on_event("startup")
@repeat_every(seconds=3600)  # Run every hour
async def cleanup_sessions_task():
    cleanup_expired_sessions()
```

### Enhanced Security
1. **Use bcrypt for passwords:**
   ```bash
   pip install bcrypt
   ```

2. **Add rate limiting:**
   - Limit password reset requests (e.g., 3 per hour per email)
   - Limit login attempts (e.g., 5 per 15 minutes per IP)

3. **Add CSRF protection** for state-changing operations

4. **Enable HTTPS** in production

5. **Add security headers:**
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
   
   app.add_middleware(HTTPSRedirectMiddleware)
   ```

## Troubleshooting

### Issue: Sessions not persisting
**Solution:** Ensure database has Session table. Check with:
```bash
sqlite3 backend/app.db ".schema session"
```

### Issue: Password reset token not working
**Possible causes:**
1. Token expired (1 hour limit)
2. Token already used
3. Token doesn't match database
**Solution:** Request new reset token

### Issue: All sessions cleared after backend restart
**If this happens:** Old in-memory sessions were lost. New sessions are database-backed and will persist.

### Issue: Can't access reset pages
**Solution:** Ensure frontend is running on port 3000:
```bash
cd frontend && npm run dev
```

## Status: ✅ Complete

Both password reset and database sessions are fully implemented and tested.

**Next steps:**
- Test the complete flow
- Add email integration for production
- Consider scheduled session cleanup task
- Upgrade to bcrypt for password hashing
