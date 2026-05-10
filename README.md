# PayBridge — Payment Orchestration Engine

A production-grade payment orchestration platform built with Node.js, React, and TypeScript. Supports multi-processor routing (Stripe + Razorpay), AI-powered fraud detection, KYC/AML compliance, double-entry ledger, and real-time currency conversion.

## Live Demo

- **Frontend:** [https://paybridge-eight.vercel.app](https://paybridge-eight.vercel.app)
- **Backend:** [https://paybridge-i9nw.onrender.com](https://paybridge-i9nw.onrender.com)

> ⚠️ Backend is on Render free tier — first request may take 30-60 seconds to wake up.

## Features

- **Multi-Processor Payments** — GBP/USD/EUR → Stripe, INR → Razorpay with automatic failover
- **AI Fraud Detection** — 7-rule scoring engine + Hugging Face AI (70/30 combined scoring)
- **KYC Verification** — Document submission, compliance officer approval/rejection
- **Double-Entry Ledger** — Atomic debit + credit bookkeeping with balance verification
- **Multi-Currency** — Live exchange rates, hourly refresh, 1.5% conversion fee
- **SAR Reporting** — Auto-generated Suspicious Activity Reports when fraud score > 70
- **GDPR Compliance** — Data export, account anonymization, consent management
- **Dispute System** — Customer raises dispute, merchant responds, officer resolves
- **Settlement** — Daily batch settlement with 2.5% platform fee
- **Webhook System** — Inbound (Stripe/Razorpay) + Outbound (HMAC-signed to merchants)
- **2FA Authentication** — TOTP via Google Authenticator
- **Role-Based Access** — User, Compliance Officer, Admin roles

## Screenshots

### Login Page
![Login](backend/docs/screenshots/login.png)

### Sign Up Page
![Signup](backend/docs/screenshots/signup.png)

### Dashboard
![Dashboard](backend/docs/screenshots/dashboard.png)

### KYC Verification
![KYC](backend/docs/screenshots/kyc.png)

### Send Payment
![Payments](backend/docs/screenshots/payments.png)

### Settings
![Settings](backend/docs/screenshots/settings.png)

### Data Privacy (GDPR)
![GDPR](backend/docs/screenshots/gdpr.png)

## Tech Stack

### Backend
 Node.js (v20) + Express + TypeScript
 PostgreSQL 15
 Redis 7
 Stripe + Razorpay SDKs
 Hugging Face Inference API
 JWT + TOTP 2FA (speakeasy + QR code)
 Winston Logger
 Zod Validation
 Jest + Supertest

### Frontend
 React 19 + TypeScript
 Vite
 Tailwind CSS
 Lucide React (icons)
 Axios (with JWT interceptor)
 Vitest

### Deployment
 Backend: Render
 Frontend: Vercel
 Cache: Render Redis
 Database: Render PostgreSQL
 Monitoring: UptimeRobot
 Containerization: Docker + Docker Compose

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Clone & Install

```bash
git clone https://github.com/bshree11/paybridge.git
cd paybridge

# Start PostgreSQL + Redis
cd backend
docker-compose up -d

# Install backend
npm install

# Install frontend
cd ../frontend
npm install
```

### Environment Variables

**Backend (`backend/.env`):**

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Clone & Install

```bash
git clone https://github.com/bshree11/paybridge.git
cd paybridge

# Start PostgreSQL + Redis
cd backend
docker-compose up -d

# Install backend
npm install

# Install frontend
cd ../frontend
npm install
```

### Environment Variables

**Backend (`backend/.env`):**

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/paybridge
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
STRIPE_SECRET_KEY=sk_test_xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
HF_API_TOKEN=hf_xxx

### Run Locally

```bash
# Terminal 1 — Backend
cd backend
docker-compose up -d
node -e "require('ts-node').register(); require('./src/server.ts')" (wsl in windows)

# Terminal 2 — Frontend
cd frontend
npm run dev
```
```

## Project Structure

paybridge/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── middleware/     # Auth, RBAC, rate limiting, PII masking
│   │   │   └── routes/        # API route definitions
│   │   ├── config/            # Database, Redis, environment
│   │   ├── processors/        # Stripe, Razorpay integrations
│   │   ├── services/          # Business logic
│   │   └── utils/             # Logger, errors, validation
│   ├── migrations/            # SQL migration files (001-019)
│   ├── tests/                 # Jest tests
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client with JWT interceptor
│   │   ├── components/        # Layout, sidebar, reusable components
│   │   ├── context/           # AuthContext (global auth state)
│   │   ├── pages/             # All page components
│   │   └── test/              # Vitest tests
│   └── vite.config.ts
└── README.md

## API Endpoints

### Auth
 Method       Endpoint            Description 

 POST     /api/auth/register    Register new user 
 POST    /api/auth/login           Login 
 POST    /api/auth/refresh       Refresh JWT tokens 
 POST    /api/auth/logout          Logout 
 GET     /api/auth/me            Get current user 
 POST    /api/auth/2fa/setup       Setup 2FA 
 POST   /api/auth/2fa/verify    Verify 2FA code 

### Payments

 Method     Endpoint           Description 

 POST   /api/payments        Create payment 
 GET    /api/payments/my     Get user's payments 
 GET    /api/payments/:id    Get single payment 

### KYC & Compliance

 Method     Endpoint                        Description 

 POST   /api/kyc/submit                   Submit KYC documents 
 GET    /api/kyc/status                   Get KYC status 
 GET   /api/compliance/kyc/queue          Pending KYC queue 
 PATCH  /api/compliance/kyc/:id/approve   Approve KYC 
 PATCH  /api/compliance/kyc/:id/reject    Reject KYC 

### SAR Reports

 Method       Endpoint         Description 

 GET        /api/sar            List all SARs 
 POST      /api/sar            Create manual SAR 
 PATCH    /api/sar/:id/status  Update SAR status 
 POST     /api/sar/:id/notes   Add investigation note 

### GDPR

Method         Endpoint            Description 

 GET        /api/gdpr/export    Export all user data 
 DELETE    /api/gdpr/account     Anonymize account 
 PATCH    /api/gdpr/consent     Update consent preferences 

### Disputes

 Method        Endpoint               Description 

 POST       /api/disputes          Raise a dispute 
 GET       /api/disputes/my        Get user's disputes 
 PATCH  /api/disputes/:id/refund   Resolve with refund 
 PATCH  /api/disputes/:id/reject   Resolve rejected 

### Webhooks

 Method           Endpoint          Description 

 POST      /api/webhooks/stripe     Stripe webhook receiver 
 POST     /api/webhooks/razorpay   Razorpay webhook receiver 

## Compliance

PayBridge is built with UK and EU financial regulations in mind:

- **SCA/PSD2** — 2FA for payments, full transaction transparency
- **UK GDPR** — Consent management, data export, right to erasure, data minimisation
- **FCA** — 5-year record retention, append-only audit logs
- **AML/KYC** — Identity verification, Enhanced Due Diligence
- **SAR** — Auto-generated reports when fraud score exceeds threshold
- **Fund Safeguarding** — Double-entry ledger with atomic transactions
- **Complaint Handling** — Formal dispute resolution process

## Payment Flow

Customer → Frontend → API → KYC Check → Idempotency Check
→ Velocity Check → Fraud Detection (7 Rules + AI)
→ Payment Routing (Stripe/Razorpay) → Ledger Entry
→ Webhook Notification to Merchant

## Fraud Detection Scoring

 Rule                         Check                    Points  

 High Amount                > £5,000                    +20 
 Very High Amount           > £10,000                   +30 
 Velocity Spike           > 3 transactions              +25 
                              in 10 min 
 New Account               Account < 7 days old         +15
 Amount Spike              10x above average            +20 
 Cross-Border              Different currency 
                            than default                 +10 
 Round Number              Exact £1,000 multiples        +10 
 Night Transaction         Between 1AM-5AM UTC           +5 

**Score 0-30:** Approve | **30-70:** Require 2FA | **70-100:** Reject + Auto SAR

Combined scoring: 70% rule-based + 30% Hugging Face AI

## Tests

```bash
# Backend (12 tests)
cd backend
npm test

# Frontend (8 tests)
cd frontend
npm test
```

**20 tests total** covering fraud detection, ledger, payment routing, webhook security, settlement, GDPR, currency conversion, and more.

## Future Improvements

 Apple Pay / Google Pay integration
 Real-time transaction notifications (WebSocket)
 Advanced analytics and reporting

## Author

**Bhagyashree Badiger**
- GitHub: [@bshree11](https://github.com/bshree11)