# Moneta - AI-Powered Financial Literacy Platform

Full-stack financial literacy learning platform with AI-powered lessons, authentication, and progress tracking.

**Stack:** Next.js 15 + FastAPI + SQLModel + SQLite + Google Gemini AI

## Features

### 🔐 Authentication System
- **Login/Signup** - Username or email + password authentication
- **Password Reset** - Email-based password recovery with token expiration
- **Session Management** - Database-backed sessions with 7-day expiration
- **Guest Mode** - Try the platform without creating an account (no progress saving)
- **Google OAuth** - Coming soon (placeholder implemented)

### 📚 Learning Features
- **AI-Generated Lessons** - Dynamic financial literacy lessons powered by Google Gemini
- **Interactive Quizzes** - Multiple choice, fill-in-blank, and free-response questions
- **AI Coach** - Chat with an AI financial advisor for help
- **Progress Tracking** - XP, streaks, and lesson completion tracking
- **Gamification** - Duolingo-style UI with rewards and celebrations

### 💾 Data Persistence
- **User Profiles** - Username, email, XP, streak, last login
- **Session Storage** - Persistent sessions across backend restarts
- **Progress Records** - Per-user progress tracking with category-based progression

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Google AI Studio API key (for Gemini)
- Railway account (for backend deploy)
- Vercel account (for frontend deploy)

## Repo structure
```
frontend/          # Next.js 15 (App Router, TypeScript, TailwindCSS)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main learning platform
│   │   ├── login/page.tsx        # Login/Signup page
│   │   ├── reset-password/       # Password reset request
│   │   └── confirm-reset/        # Password reset confirmation
│   └── lib/
│       └── api.ts                # Backend API client
backend/           # FastAPI + SQLModel + SQLite
├── app/
│   ├── main.py                   # FastAPI app entry point
│   ├── models.py                 # Database models (User, Session, etc.)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── db.py                     # Database connection
│   └── routers/
│       ├── auth.py               # Authentication endpoints
│       ├── lessons.py            # Lesson generation & evaluation
│       ├── chat.py               # AI coach chatbot
│       └── progress.py           # User progress tracking
├── app.db                        # SQLite database (gitignored)
└── requirements.txt              # Python dependencies
docs/              # Documentation
├── BRANCHING.md                  # Git workflow
├── AUTH_IMPLEMENTATION.md        # Authentication system docs
└── PASSWORD_RESET_AND_SESSIONS.md # Password reset & session management
```

## Environment variables
### Backend (`backend/.env`)
```env
DATABASE_URL=sqlite:///./app.db
GOOGLE_API_KEY=your_google_ai_studio_api_key_here
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note:** 
- Get your Google AI Studio API key from: https://makersuite.google.com/app/apikey
- Never commit `.env` files to git
- Frontend only needs the backend URL; all AI calls go through the backend

## Local development

### Quick Start (Single Command)
```bash
cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000 & cd ../frontend && npm run dev
```

This starts both backend (port 8000) and frontend (port 3000) in one command.

### Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Create and fill GOOGLE_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Endpoints:**
- Health: `GET http://localhost:8000/health`
- API Docs: `http://localhost:8000/docs`
- Auth: `/auth/register`, `/auth/login`, `/auth/logout`
- Lessons: `/lessons/generate`, `/lessons/evaluate_answers`
- Chat: `/chat`
- Progress: `/progress/{username}`

### Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL
npm run dev                 # http://localhost:3000
```

**Routes:**
- Home/Login: `http://localhost:3000` (redirects to `/login` if not authenticated)
- Login/Signup: `http://localhost:3000/login`
- Password Reset: `http://localhost:3000/reset-password`
- Confirm Reset: `http://localhost:3000/confirm-reset`

### Database
The SQLite database (`backend/app.db`) is auto-created on first run with these tables:
- **user** - User accounts (username, email, password_hash, xp, streak, completed_lessons)
- **session** - Auth sessions (token, user_id, expires_at)
- **passwordresettoken** - Password reset tokens (token, email, expires_at)
- **xpevent** - XP change history for daily tracking
- **llmcacherecord** - AI response caching

**View database:**
```bash
sqlite3 backend/app.db ".tables"
sqlite3 backend/app.db "SELECT * FROM user;"
```

## API Overview

### Authentication Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new account (username, email, password) |
| `/auth/login` | POST | Login with username/email + password |
| `/auth/logout` | POST | Invalidate session token |
| `/auth/me` | GET | Get current user info (requires token) |
| `/auth/guest` | POST | Enable guest mode |
| `/auth/password-reset/request` | POST | Request password reset token |
| `/auth/password-reset/confirm` | POST | Reset password with token |

### Learning Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lessons/generate` | POST | Generate AI lesson (category, level, difficulty) |
| `/lessons/evaluate_answers` | POST | Evaluate quiz answers |
| `/lessons/check_free` | POST | Check free-response answer with AI |
| `/chat` | POST | Chat with AI financial coach |
| `/progress/{username}` | GET | Get user progress (XP, streak) |
| `/progress/{username}` | POST | Update user progress |

### Example: Create Account & Login
```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Response: {"user_id":1,"username":"testuser","email":"test@example.com",...,"token":"abc123..."}

# Login (with username or email)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"testuser","password":"password123"}'

# Get user info
curl "http://localhost:8000/auth/me?token=abc123..."
```

## User Flow

### First-Time User
1. Visit `localhost:3000` → Redirects to `/login`
2. Click "Sign Up" tab
3. Enter username, email, password → Submit
4. Automatically logged in → Redirected to main app
5. Start learning! XP and streak save to database

### Returning User
1. Visit `localhost:3000` → Redirects to `/login`
2. Enter username/email + password → Login
3. Previous XP and streak loaded from database
4. Continue where you left off

### Guest User
1. Visit `localhost:3000/login`
2. Click "Continue as Guest"
3. Access full platform features
4. Progress NOT saved (resets on refresh)

### Password Reset
1. Click "Forgot Password?" on login page
2. Enter email → Receive reset token (displayed on screen in dev mode)
3. Go to `/confirm-reset` → Enter token + new password
4. All sessions invalidated → Must login with new password

## Deployment

### Backend → Railway
1. Create a new service from the `backend/` folder (GitHub repo)
2. Add a **Persistent Volume** mounted at `/data`
3. Set environment variables:
   ```
   DATABASE_URL=sqlite:////data/app.db
   GOOGLE_API_KEY=your_key_here
   ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   ```
4. Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Note the Railway service URL (e.g., `https://your-app.railway.app`)

### Frontend → Vercel
1. Import the `frontend/` project from GitHub
2. In Project Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-service-url
   ```
3. Deploy
4. Update Railway `ALLOWED_ORIGINS` with your Vercel URL

### Post-Deployment Checklist
- [ ] Test signup/login on production
- [ ] Verify AI lesson generation works
- [ ] Check that XP/streak persists after refresh
- [ ] Test password reset flow
- [ ] Confirm sessions persist across backend restarts
- [ ] Enable HTTPS (automatic on Railway/Vercel)

## Development Workflow

### Branching Strategy
See `docs/BRANCHING.md` for full details.

**Branch naming:**
- `feat/frontend-*` - Frontend features
- `feat/backend-*` - Backend features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

**Workflow:**
1. Create feature branch from `main`
2. Make changes and commit
3. Open PR with description
4. Get 1+ review approval
5. Squash merge to `main`

### Testing Locally
```bash
# Test authentication
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Test lesson generation
curl -X POST http://localhost:8000/lessons/generate \
  -H "Content-Type: application/json" \
  -d '{"category":"Budgeting Basics","level":1,"num_questions":3,"difficulty":"beginner"}'

# View database
sqlite3 backend/app.db "SELECT username, xp, streak FROM user;"
```

## Tech Stack Details

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** React hooks (useState, useEffect)
- **Auth:** localStorage + session tokens
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI
- **ORM:** SQLModel
- **Database:** SQLite (development) / PostgreSQL (production ready)
- **AI:** Google Gemini 1.5 Pro
- **Authentication:** Session-based with database storage
- **Password Hashing:** SHA-256 (upgrade to bcrypt recommended for production)

### Database Schema
```sql
-- Users table
CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    username VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR,
    google_id VARCHAR UNIQUE,
    display_name VARCHAR,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    created_at DATETIME,
    last_login DATETIME
);

-- Sessions table
CREATE TABLE session (
    id INTEGER PRIMARY KEY,
    token VARCHAR NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    created_at DATETIME,
    expires_at DATETIME,
    last_activity DATETIME
);

-- Password reset tokens
CREATE TABLE passwordresettoken (
    id INTEGER PRIMARY KEY,
    token VARCHAR NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    email VARCHAR,
    created_at DATETIME,
    expires_at DATETIME,
    used BOOLEAN DEFAULT FALSE
);
```

## Configuration

### Session Management
- **Session Duration:** 7 days
- **Storage:** Database (persists across restarts)
- **Token Format:** 32-byte URL-safe random string

### Password Reset
- **Token Duration:** 1 hour
- **Single Use:** Tokens invalidated after use
- **Email:** Currently displays token on screen (dev mode)
  - For production: Integrate SendGrid/AWS SES for email delivery

### AI Settings
- **Model:** gemini-1.5-pro
- **Caching:** LLM responses cached in database
- **Rate Limiting:** None (add for production)

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -ti:8000 | xargs kill -9

# Recreate virtual environment
cd backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database issues
```bash
# Delete and recreate database
rm backend/app.db
# Restart backend - tables will auto-create
```

### localStorage errors (SSR)
Make sure components using localStorage have client-side checks:
```typescript
const [isMounted, setIsMounted] = useState(false);
useEffect(() => setIsMounted(true), []);
if (!isMounted) return <div>Loading...</div>;
```

## Documentation
- **`docs/BRANCHING.md`** - Git workflow and branching strategy
- **`docs/AUTH_IMPLEMENTATION.md`** - Complete authentication system documentation
- **`docs/PASSWORD_RESET_AND_SESSIONS.md`** - Password reset and session management details
- **`docs/SETUP_COMPLETE.md`** - Initial setup guide

## Security Notes

### Current Implementation (Development)
- ✅ Session-based authentication
- ✅ Password hashing (SHA-256)
- ✅ CORS configuration
- ✅ Token expiration (7 days)
- ✅ Password reset tokens (1 hour)

### Production Recommendations
- [ ] Upgrade to bcrypt/Argon2 for password hashing
- [ ] Add rate limiting on auth endpoints
- [ ] Implement CSRF protection
- [ ] Add email verification on signup
- [ ] Enable HTTPS only (automatic on Railway/Vercel)
- [ ] Add security headers (helmet.js equivalent)
- [ ] Implement Google OAuth (placeholder ready)
- [ ] Add 2FA option
- [ ] Database: Migrate to PostgreSQL for production scale
- [ ] Add Redis for session storage (optional, for scale)

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## Notes
- Keep the Gemini API key only on the backend. Frontend never calls Gemini directly.
- SQLite file persists on Railway via the attached volume at `/data`.
- Sessions persist across backend restarts (stored in database, not in-memory)
- Guest mode progress doesn't save (intended behavior)
- Email is required for signup (needed for password reset)

## License
MIT
