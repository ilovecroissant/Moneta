# Authentication System Implementation

## Overview
Complete authentication system added to Moneta with login, signup, guest mode, and Google OAuth placeholder.

## Features Implemented

### 1. Backend Authentication
- **New User Model** (`/backend/app/models.py`)
  - Fields: `username`, `email`, `password_hash`, `google_id`, `display_name`, `xp`, `streak`, `last_login`
  - Removed old `handle` field, replaced with `username`
  
- **Authentication Schemas** (`/backend/app/schemas.py`)
  - `UserRegister`: username, email (optional), password
  - `UserLogin`: username, password
  - `GoogleAuthRequest`: google_token (placeholder)
  - `AuthResponse`: user data + session token
  - `UserResponse`: user profile data

- **Auth Router** (`/backend/app/routers/auth.py`)
  - **POST /auth/register** - Create new account
  - **POST /auth/login** - Login with credentials
  - **POST /auth/google** - Google OAuth (placeholder, returns 501)
  - **GET /auth/me?token={token}** - Get current user
  - **POST /auth/logout?token={token}** - Logout
  - **POST /auth/guest** - Enable guest mode
  
- **Session Management**
  - In-memory session store (development only)
  - 32-byte URL-safe session tokens
  - SHA-256 password hashing

### 2. Frontend Authentication
- **Login Page** (`/frontend/src/app/login/page.tsx`)
  - Mode toggle: Login vs Sign Up
  - Username + Password fields
  - Optional email for signup
  - "Continue with Google" button (shows "coming soon")
  - "Continue as Guest" button
  - Stores: `authToken`, `userData`, `isGuest` in localStorage
  - Redirects to main app after successful auth

- **Main App Protection** (`/frontend/src/app/page.tsx`)
  - Auth check on page load
  - Redirects to `/login` if not authenticated
  - Displays username in header
  - Shows "Guest Mode" indicator
  - Logout button in header
  - Clears localStorage on logout

### 3. Database Updates
- Old database deleted (incompatible schema)
- New database created with auth fields
- Progress router updated to use `username` instead of `handle`
- User table stores all progress data (xp, streak, completed_lessons)
- UserProgressRecord table removed (was redundant)

## Database Schema

### User Table
```sql
id              INTEGER PRIMARY KEY
email           VARCHAR NULLABLE UNIQUE
username        VARCHAR NOT NULL UNIQUE
password_hash   VARCHAR NULLABLE
google_id       VARCHAR NULLABLE UNIQUE
display_name    VARCHAR
xp              INTEGER DEFAULT 0
streak          INTEGER DEFAULT 0
created_at      DATETIME
last_login      DATETIME
```

## Authentication Flow

### Sign Up
1. User enters username, email (optional), password
2. POST to `/auth/register`
3. Backend validates uniqueness, hashes password
4. Creates user record, generates session token
5. Returns token + user data
6. Frontend stores in localStorage, redirects to main app

### Login
1. User enters username, password
2. POST to `/auth/login`
3. Backend validates credentials
4. Updates `last_login` timestamp
5. Generates session token
6. Returns token + user data
7. Frontend stores in localStorage, redirects to main app

### Guest Mode
1. User clicks "Continue as Guest"
2. Sets `isGuest=true` in localStorage
3. Redirects to main app without backend auth
4. No progress persistence (XP/streak not saved)

### Session Validation
1. Main app checks localStorage for `authToken` or `isGuest` flag
2. If neither exists, redirects to `/login`
3. If authenticated, can optionally call `/auth/me` to verify token

### Logout
1. User clicks "Logout" button
2. Clears `authToken`, `userData`, `isGuest` from localStorage
3. Redirects to `/login`

## Testing the Auth System

### 1. Test Registration
```bash
# Visit http://localhost:3000
# Should redirect to /login
# Click "Sign Up" tab
# Enter username, password (email optional)
# Click "Sign Up"
# Should redirect to main app with username displayed
```

### 2. Test Login
```bash
# Visit http://localhost:3000/login
# Enter registered username and password
# Click "Log In"
# Should redirect to main app
```

### 3. Test Guest Mode
```bash
# Visit http://localhost:3000/login
# Click "Continue as Guest"
# Should access app with "Guest Mode" indicator
# Complete a lesson - XP won't persist after refresh
```

### 4. Test Logout
```bash
# From authenticated session, click "Logout" in header
# Should redirect to /login
# LocalStorage should be cleared
```

### 5. Test Direct Access (Protection)
```bash
# Clear localStorage
# Visit http://localhost:3000
# Should immediately redirect to /login
```

## API Endpoints

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl "http://localhost:8000/auth/me?token=YOUR_TOKEN_HERE"
```

### Logout
```bash
curl -X POST "http://localhost:8000/auth/logout?token=YOUR_TOKEN_HERE"
```

## Known Limitations (Development)

1. **In-Memory Sessions**
   - Sessions lost on backend restart
   - Not suitable for production
   - Consider Redis or database storage for production

2. **Password Security**
   - Using SHA-256 (basic)
   - Consider bcrypt or Argon2 for production

3. **Google OAuth**
   - Placeholder endpoint (returns 501)
   - Needs Google OAuth library and credentials
   - Frontend button shows "coming soon" alert

4. **Token Expiration**
   - Sessions don't expire currently
   - Should add TTL for production

5. **Guest Mode**
   - Only client-side check
   - Progress not saved to backend
   - Refreshing page keeps guest mode

## Future Improvements

1. **Implement Google OAuth**
   - Install `google-auth` library
   - Get Google Cloud credentials
   - Verify tokens with Google API
   - Extract user info and create/login users

2. **Persistent Sessions**
   - Store sessions in database or Redis
   - Add session expiration (e.g., 7 days)
   - Implement refresh tokens

3. **Enhanced Security**
   - Use bcrypt for password hashing
   - Add rate limiting on auth endpoints
   - Implement CSRF protection
   - Add email verification

4. **Better Guest Experience**
   - Allow guest to register without losing progress
   - Migrate guest progress on account creation

5. **Password Reset**
   - Email-based password reset flow
   - Security questions
   - Two-factor authentication

## File Changes Summary

### Created
- `/backend/app/routers/auth.py` - Authentication router (318 lines)
- `/frontend/src/app/login/page.tsx` - Login/signup page (236 lines)
- `/docs/AUTH_IMPLEMENTATION.md` - This documentation

### Modified
- `/backend/app/models.py` - Updated User model with auth fields
- `/backend/app/schemas.py` - Added auth schemas
- `/backend/app/main.py` - Included auth router
- `/backend/app/routers/progress.py` - Updated to use username, sync User table
- `/frontend/src/app/page.tsx` - Added auth check, logout functionality, user display

### Deleted
- `/backend/app.db` - Old database (recreated with new schema)

## Status: ✅ Complete

The authentication system is fully functional and ready for testing. The backend creates new users, manages sessions, and the frontend properly protects routes and displays user information.

**Next recommended step:** Test the complete flow end-to-end by creating a new account, completing a lesson, logging out, and logging back in to verify XP persistence.
