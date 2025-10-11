# Finance Learning App (React + FastAPI + Gemini)

Monorepo with `frontend/` (Next.js + Tailwind) and `backend/` (FastAPI + SQLModel + SQLite). AI via Google Gemini (Google AI Studio API key). Backend deploy on Railway (persistent volume), frontend on Vercel.

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Railway account (for backend deploy)
- Vercel account (for frontend deploy)

## Repo structure
```
frontend/   # Next.js (App Router, TS, Tailwind)
backend/    # FastAPI + SQLModel + SQLite
docs/       # docs like branching strategy
```

## Environment variables
- Root `.env` is not required for dev, but we provide examples.
- Backend (copy to `backend/.env`):
```env
DATABASE_URL=sqlite:///./app.db
GOOGLE_API_KEY=
ALLOWED_ORIGINS=http://localhost:3000
```
- Frontend (copy to `frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Local development
### Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # if not present, create and fill GOOGLE_API_KEY
uvicorn app.main:app --reload --port 8000
```
Health check: `GET http://localhost:8000/health`

### Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local  # if not present, create with NEXT_PUBLIC_API_BASE_URL
npm run dev  # http://localhost:3000
```

## Branching strategy
See `docs/BRANCHING.md`. Use `feat/frontend-*`, `feat/backend-*`, `feat/sim-*` branches; PR with 1 review; squash merge.

## Deploy
### Backend → Railway
1) Create a new service from the `backend/` folder (GitHub repo).
2) Add a Persistent Volume mounted at `/data`.
3) Set environment variables:
   - `DATABASE_URL=sqlite:////data/app.db`
   - `GOOGLE_API_KEY=...`
   - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
4) Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   (Alternatively, a `backend/Procfile` is provided.)

### Frontend → Vercel
1) Import the `frontend/` project.
2) In Project Settings → Environment Variables, set:
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-service-url>`
3) Deploy.

## Notes
- Keep the Gemini API key only on the backend. Frontend never calls Gemini directly.
- SQLite file persists on Railway via the attached volume at `/data`.

## Quick start (one-time)
```bash
# in one terminal
cd backend && python3 -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && cp .env.example .env \
  && uvicorn app.main:app --reload --port 8000

# in another terminal
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

## License
MIT
