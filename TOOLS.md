# Tools & Technologies

This document lists all tools, libraries, and technologies used to build PayBridge.

## Backend

**Runtime & Framework**
- Node.js (v20) - JavaScript runtime
- Express.js - Web framework for building APIs
- TypeScript - Type-safe JavaScript

**Database**
- PostgreSQL 15 - Relational database for all data
- Redis 7 - Caching, rate limiting, session management

**Payment Processors**
- Stripe SDK - GBP/USD/EUR payment processing
- Razorpay SDK - INR payment processing

**AI Integration**
- Hugging Face Inference API - AI-powered fraud detection

**Authentication & Security**
- JSON Web Tokens (JWT) - Access + refresh token authentication
- Speakeasy - TOTP 2FA (Google Authenticator)
- QRCode - QR code generation for 2FA setup
- bcrypt.js - Password hashing
- Helmet - HTTP security headers
- CORS - Cross-origin resource sharing
- Crypto (Node.js) - HMAC SHA256 webhook signature verification

**Validation & Logging**
- Zod - Request validation
- Winston - Structured logging with PII masking

**Database Clients**
- pg (node-postgres) - PostgreSQL client
- ioredis - Redis client

**Testing**
- Jest - Testing framework
- Supertest - HTTP assertion testing

**Other**
- dotenv - Environment variables
- node-cron - Scheduled currency rate refresh


## Frontend

**Core**
- React 19 - UI library
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server

**Styling**
- Tailwind CSS - Utility-first CSS framework

**Icons**
- Lucide React - Icon library

**Routing**
- React Router - Client-side routing

**HTTP Client**
- Axios - API requests with JWT interceptor

**State Management**
- React Context API - Global auth state management

**Testing**
- Vitest - Testing framework


## Development Tools

**Code Editor**
- Visual Studio Code

**Version Control**
- Git
- GitHub

**API Testing**
- Postman

**Package Manager**
- npm

**Containerization**
- Docker
- Docker Compose


## Deployment

**Backend Hosting**
- Render - Node.js hosting + PostgreSQL + Redis

**Frontend Hosting**
- Vercel - React app hosting

**Database Hosting**
- Render PostgreSQL - Cloud relational database

**Cache Hosting**
- Render Redis (Key Value) - Cloud Redis instance

**Monitoring**
- UptimeRobot - Server uptime monitoring and keep-alive