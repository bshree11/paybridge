# PayBridge Deployment Guide

## Architecture
Frontend (Vercel) → Backend API (Render) → PostgreSQL (Render) + Redis (Render)

## Frontend — Vercel

### Setup
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Import the `paybridge` repository
3. Set Root Directory to `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy

### Environment
The frontend uses `import.meta.env.PROD` to detect production mode and automatically switches API URL from `localhost:3000` to the Render backend URL.

### Auto-Deploy
Every push to `main` triggers automatic redeployment on Vercel.

---

## Backend — Render

### Web Service Setup
1. Go to [render.com](https://render.com) and sign in with GitHub
2. Create New → Web Service
3. Connect `paybridge` repository
4. Root Directory: `backend`
5. Build Command: `npm install --include=dev && npx tsc`
6. Start Command: `node dist/src/server.js`
7. Select Free tier

### PostgreSQL Setup
1. Create New → PostgreSQL
2. Name: `paybridge-db`
3. Database: `paybridge`
4. Select Free tier
5. Copy Internal Database URL

### Redis Setup
1. Create New → Key Value (Redis)
2. Name: `paybridge-redis`
3. Select Free tier
4. Copy Internal Redis URL

### Environment Variables

Set these in the Render Web Service → Environment tab:
NODE_ENV=production
PORT=3000
DATABASE_URL=`Internal PostgreSQL URL from Render`
REDIS_URL=`Internal Redis URL from Render`
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret
STRIPE_SECRET_KEY=sk_test_xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
HF_API_TOKEN=hf_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RAZORPAY_WEBHOOK_SECRET=xxx

### Database Migrations

After creating the PostgreSQL database, run migrations from your local terminal:

```bash
cd backend
PGPASSWORD=<your_password> psql -h <render_host> -U <username> <database> -f migrations/001_initial_schema.sql
PGPASSWORD=<your_password> psql -h <render_host> -U <username> <database> -f migrations/002_auth_tables.sql
PGPASSWORD=<your_password> psql -h <render_host> -U <username> <database> -f migrations/003_kyc_and_sar.sql
# ... continue for all migration files (001-011)
```

### Auto-Deploy
Every push to `main` triggers automatic redeployment on Render.

---

## Monitoring — UptimeRobot

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add New Monitor
3. Type: HTTP(s)
4. URL: `https://paybridge-i9nw.onrender.com/health`
5. Interval: 5 minutes or 10 mins (however you want)

This prevents the Render free tier from sleeping.

---

## Docker (Local Development)

```bash
cd backend
docker-compose up -d    # Starts PostgreSQL + Redis
```

The `docker-compose.yml` includes PostgreSQL 15, Redis 7, and the backend app service.

A multi-stage `Dockerfile` is included for production container builds.

---

## Live URLs

- **Frontend:** https://paybridge-eight.vercel.app
- **Backend:** https://paybridge-i9nw.onrender.com
- **Health Check:** https://paybridge-i9nw.onrender.com/health
