# Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment Setup

### Accounts & Keys
- [ ] Railway account created (https://railway.app)
- [ ] Vercel account created (https://vercel.com)
- [ ] Google AI Studio API key obtained (https://makersuite.google.com/app/apikey)
- [ ] Code pushed to GitHub repository

### Local Environment Files
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Fill in `GOOGLE_API_KEY` in `backend/.env`
- [ ] Test backend locally: `cd backend && uvicorn app.main:app --reload`
- [ ] Copy `frontend/.env.example` to `frontend/.env.local`
- [ ] Test frontend locally: `cd frontend && npm run dev`

---

## Backend Deployment (Railway)

### Setup
- [ ] Created new Railway project from GitHub repo
- [ ] Set **Root Directory** to `backend`
- [ ] Added **Persistent Volume** mounted at `/data`

### Environment Variables Set
- [ ] `DATABASE_URL=sqlite:////data/app.db`
- [ ] `GOOGLE_API_KEY=your_actual_key_here`
- [ ] `ALLOWED_ORIGINS=http://localhost:3000` (update after frontend deploy)

### Verification
- [ ] Railway deployment successful (check logs)
- [ ] Noted Railway URL: `_________________________.railway.app`
- [ ] Health check works: `curl https://YOUR-URL.railway.app/health`
- [ ] API docs accessible: `https://YOUR-URL.railway.app/docs`

---

## Frontend Deployment (Vercel)

### Setup
- [ ] Imported project from GitHub
- [ ] Set **Root Directory** to `frontend`
- [ ] Set **Framework Preset** to Next.js

### Environment Variables Set
- [ ] `NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.railway.app`

### Verification
- [ ] Vercel deployment successful
- [ ] Noted Vercel URL: `_________________________.vercel.app`
- [ ] Frontend loads in browser
- [ ] No console errors (F12 → Console)

---

## Final Configuration

### Update Railway CORS
- [ ] Go back to Railway project
- [ ] Update `ALLOWED_ORIGINS` to: `https://YOUR-VERCEL-URL.vercel.app`
- [ ] Wait for Railway to redeploy (~1 min)

---

## Testing in Production

### Authentication Flow
- [ ] Can access signup page
- [ ] Can create new account
- [ ] Redirects to main app after signup
- [ ] Can log out
- [ ] Can log back in
- [ ] Session persists on page refresh

### Learning Features
- [ ] Can generate a lesson (test with "Budgeting Basics")
- [ ] Questions display correctly
- [ ] Can select/input answers
- [ ] Can submit answers
- [ ] XP increases after completing lesson
- [ ] Streak updates correctly

### AI Features
- [ ] AI Coach chat works
- [ ] Can send messages and get responses
- [ ] Free-response questions get evaluated

### Password Reset
- [ ] Can request password reset
- [ ] Reset token displays
- [ ] Can reset password with token
- [ ] Can log in with new password
- [ ] Old sessions invalidated

### Data Persistence
- [ ] Create account and earn some XP
- [ ] Log out and log back in
- [ ] XP and streak persist
- [ ] Completed lessons tracked

---

## Production URLs

**Backend API:**
```
https://_________________________________.railway.app
```

**Frontend App:**
```
https://_________________________________.vercel.app
```

**API Documentation:**
```
https://_________________________________.railway.app/docs
```

---

## Troubleshooting

### If something doesn't work:

**Backend Issues:**
- Check Railway logs: Railway Dashboard → Deployments → View Logs
- Verify environment variables are set correctly
- Check volume is mounted at `/data`
- Verify start command is correct

**Frontend Issues:**
- Check Vercel deployment logs
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for errors (F12)
- Verify root directory is set to `frontend`

**CORS Errors:**
- Verify `ALLOWED_ORIGINS` in Railway matches Vercel URL exactly
- No trailing slashes in URLs
- Railway needs to redeploy after changing env vars

**Database Issues:**
- Volume must be mounted at `/data`
- `DATABASE_URL` must be `sqlite:////data/app.db` (4 slashes!)
- Check Railway logs for SQLite errors

---

## Post-Deployment Tasks

### Optional Enhancements
- [ ] Set up custom domain on Vercel
- [ ] Set up custom domain on Railway
- [ ] Update `ALLOWED_ORIGINS` to include custom domain
- [ ] Set up email service (SendGrid/AWS SES) for password resets
- [ ] Enable monitoring/alerts on Railway
- [ ] Set up error tracking (Sentry)

### Share Your App!
- [ ] Test all features one more time
- [ ] Share Vercel URL with friends/team
- [ ] Monitor logs for any issues
- [ ] Celebrate! 🎉

---

## Quick Commands

### Test Backend Health
```bash
curl https://YOUR-BACKEND.railway.app/health
```

### Test Registration
```bash
curl -X POST https://YOUR-BACKEND.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'
```

### View Railway Logs
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and view logs
railway login
railway logs
```

### View Database (if needed)
Railway doesn't provide direct SQLite access, but you can:
1. Add a debug endpoint to query the database
2. Or download the volume contents through Railway CLI

