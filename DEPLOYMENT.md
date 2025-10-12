# Deployment Guide for Moneta

This guide will walk you through deploying the Moneta application to production.

## Overview
- **Backend**: Railway (with persistent SQLite database)
- **Frontend**: Vercel
- **Time**: ~15-20 minutes

## Prerequisites

Before you start, make sure you have:
- [ ] Railway account (https://railway.app) - Free tier available
- [ ] Vercel account (https://vercel.com) - Free tier available
- [ ] Google AI Studio API key (https://makersuite.google.com/app/apikey)
- [ ] GitHub repository pushed with your code

---

## Part 1: Deploy Backend to Railway

### Step 1: Create New Railway Project

1. Go to https://railway.app and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `hackNC` repository

### Step 2: Configure Root Directory

Since your backend is in a subfolder:

1. In the Railway dashboard, go to your service settings
2. Find **"Root Directory"** setting
3. Set it to: `backend`
4. Save changes

### Step 3: Add Persistent Volume (IMPORTANT!)

This ensures your SQLite database persists across deployments:

1. In your Railway service, click the **"Variables"** tab
2. Scroll down to **"Volumes"**
3. Click **"+ New Volume"**
4. Set:
   - **Mount Path**: `/data`
   - Keep the default name
5. Click **"Add"**

### Step 4: Set Environment Variables

In the Railway dashboard under **"Variables"** tab, add these:

```
DATABASE_URL=sqlite:////data/app.db
GOOGLE_API_KEY=your_actual_google_ai_studio_api_key
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

**Note**: You'll update `ALLOWED_ORIGINS` after deploying the frontend in Part 2.

### Step 5: Configure Start Command (if needed)

Railway should auto-detect your Python app, but if it doesn't:

1. Go to **"Settings"** tab
2. Find **"Custom Start Command"**
3. Set it to:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Step 6: Deploy!

1. Railway will automatically deploy after you save the variables
2. Wait for the build to complete (2-3 minutes)
3. Once deployed, click on the service to get your URL
4. Your backend URL will look like: `https://hacknc-production.up.railway.app`
5. **Copy this URL** - you'll need it for the frontend!

### Step 7: Verify Backend is Running

Test your backend:

```bash
# Replace with your actual Railway URL
curl https://your-backend-url.railway.app/health

# Should return: {"status":"healthy"}
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create New Vercel Project

1. Go to https://vercel.com and log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will detect it's a Next.js app

### Step 2: Configure Root Directory

Since your frontend is in a subfolder:

1. In the project settings, find **"Root Directory"**
2. Click **"Edit"**
3. Select `frontend`
4. Click **"Continue"**

### Step 3: Set Environment Variables

In the **"Environment Variables"** section (before deploying):

1. Add variable:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-railway-url.railway.app` (from Part 1, Step 6)
2. Make sure it's enabled for **Production**, **Preview**, and **Development**
3. Click **"Add"**

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait for the build (2-3 minutes)
3. Once deployed, Vercel will give you a URL like: `https://your-app.vercel.app`
4. **Copy this URL** - you need to update Railway!

### Step 5: Update Railway CORS Settings

Go back to Railway:

1. Open your backend service
2. Go to **"Variables"** tab
3. Find `ALLOWED_ORIGINS`
4. Update it to your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
5. Save - Railway will automatically redeploy

---

## Part 3: Testing & Verification

### ✅ Backend Checklist

Test these endpoints (replace with your Railway URL):

```bash
# 1. Health check
curl https://your-backend.railway.app/health

# 2. API docs (open in browser)
open https://your-backend.railway.app/docs

# 3. Register a test user
curl -X POST https://your-backend.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'
```

### ✅ Frontend Checklist

Visit your Vercel URL and test:

1. **Signup Flow**
   - [ ] Sign up page loads
   - [ ] Can create new account
   - [ ] Redirects to main app after signup

2. **Login Flow**
   - [ ] Can log in with created account
   - [ ] Session persists on refresh
   - [ ] XP/streak displays correctly

3. **Main Features**
   - [ ] AI lessons generate successfully
   - [ ] Questions appear properly
   - [ ] Can submit answers
   - [ ] XP updates after completing lesson
   - [ ] AI coach chat works

4. **Password Reset**
   - [ ] Can request password reset
   - [ ] Token displays (or would send email in production)
   - [ ] Can reset password with token
   - [ ] Can log in with new password

### 🐛 Troubleshooting

**Backend Issues:**

- **"Application failed to respond"**: Check that start command is correct
- **Database errors**: Verify the volume is mounted at `/data` and `DATABASE_URL` is correct
- **AI not working**: Verify `GOOGLE_API_KEY` is set correctly

**Frontend Issues:**

- **"Failed to fetch"**: Check CORS settings in Railway
- **"NEXT_PUBLIC_API_URL is not defined"**: Verify environment variable is set in Vercel
- **404 errors**: Make sure Root Directory is set to `frontend`

**CORS Issues:**

If you see CORS errors in the browser console:
1. Verify `ALLOWED_ORIGINS` in Railway matches your Vercel URL EXACTLY
2. Make sure there's no trailing slash in either URL
3. Railway needs to redeploy after changing env vars (it does this automatically)

---

## Part 4: Post-Deployment Configuration

### Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

**Railway:**
1. Go to Service Settings
2. Add custom domain
3. Update `ALLOWED_ORIGINS` to include your custom domain

### Environment-Specific Settings

You can add different settings for preview/production:

**Vercel:**
- Set different `NEXT_PUBLIC_API_URL` for Preview deployments if needed
- Use Vercel's environment-specific variables

**Railway:**
- Railway supports multiple environments
- Consider separate projects for staging/production

### Monitoring

**Railway:**
- View logs in the Railway dashboard
- Set up metrics and alerts
- Monitor database size (volume usage)

**Vercel:**
- View deployment logs
- Check Analytics for traffic
- Monitor function execution times

---

## Quick Reference

### Railway Backend URL Format
```
https://your-service-name-production-xxxx.up.railway.app
```

### Vercel Frontend URL Format
```
https://your-app-name.vercel.app
```

### Environment Variables Summary

**Backend (Railway):**
```
DATABASE_URL=sqlite:////data/app.db
GOOGLE_API_KEY=your_key_here
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

**Frontend (Vercel):**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Scaling Considerations

When you're ready to scale:

1. **Database**: Migrate from SQLite to PostgreSQL
   - Railway offers managed Postgres
   - Update `DATABASE_URL` and install `psycopg2`

2. **Caching**: Add Redis for session storage
   - Railway offers managed Redis
   - Reduces database load

3. **Rate Limiting**: Implement API rate limiting
   - Protect against abuse
   - Use libraries like `slowapi`

4. **Email**: Set up actual email service
   - SendGrid, AWS SES, or Resend
   - For password reset emails

---

## Need Help?

If you run into issues:

1. **Check logs**:
   - Railway: View in dashboard under "Deployments" → "Logs"
   - Vercel: View in deployment details

2. **Common fixes**:
   - Redeploy after changing environment variables
   - Check root directory settings
   - Verify all URLs match exactly (no trailing slashes)

3. **Test locally first**:
   ```bash
   # Backend
   cd backend && uvicorn app.main:app --reload
   
   # Frontend
   cd frontend && npm run dev
   ```

Good luck with your deployment! 🚀

