# PayBridge API Documentation

Base URL: `https://paybridge-i9nw.onrender.com/api`
Local: `http://localhost:3000/api`

---

## Authentication

All protected routes require a JWT token in the Authorization header:
Authorization: Bearer your-token-here

Access tokens expire after 15 minutes. Use the refresh endpoint to get new tokens.

---

## Auth Endpoints

### Register User
POST /api/auth/register

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "consent": true
}
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "kyc_status": "unverified"
  }
}
```

### Login User
POST /api/auth/login

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "requires2FA": false
}
```

### Get Current User (Protected)
GET /api/auth/me

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "kycStatus": "verified",
    "twoFactorEnabled": false
  }
}
```

### Refresh Tokens
POST /api/auth/refresh

Request Body:
```json
{
  "refreshToken": "refresh_token_here"
}
```

Response:
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### Logout (Protected)
POST /api/auth/logout

Request Body:
```json
{
  "refreshToken": "refresh_token_here"
}
```

Response:
```json
{
  "message": "Logged out successfully"
}
```

### Setup 2FA (Protected)
POST /api/auth/2fa/setup

Response:
```json
{
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

### Verify 2FA Setup (Protected)
POST /api/auth/2fa/verify

Request Body:
```json
{
  "token": "123456"
}
```

Response:
```json
{
  "message": "2FA enabled successfully",
  "backupCodes": ["code1", "code2", "code3"]
}
```

### 2FA Login
POST /api/auth/2fa/login

Request Body:
```json
{
  "challengeToken": "temp_token",
  "totpCode": "123456"
}
```

Response:
```json
{
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

---

## Payment Endpoints (All Protected)

### Create Payment
POST /api/payments

Request Body:
```json
{
  "amount": 50.00,
  "currency": "GBP",
  "cardToken": "tok_visa",
  "idempotencyKey": "unique_key_123"
}
```

Response (Success):
```json
{
  "transactionId": "uuid",
  "amount": 50.00,
  "currency": "GBP",
  "status": "confirmed",
  "chargeId": "ch_xxx"
}
```

Response (Fraud Review - 202):
```json
{
  "error": "Additional verification required. Please complete 2FA."
}
```

Response (Fraud Blocked - 403):
```json
{
  "error": "Transaction blocked due to suspicious activity"
}
```

### Get My Payments
GET /api/payments/my

Response:
```json
[
  {
    "id": "uuid",
    "amount": 50.00,
    "source_currency": "GBP",
    "target_currency": "GBP",
    "status": "confirmed",
    "processor": "stripe",
    "fraud_score": 15,
    "created_at": "2026-05-10T08:30:00Z"
  }
]
```

### Get Single Payment
GET /api/payments/:id

Response:
```json
{
  "id": "uuid",
  "amount": 50.00,
  "source_currency": "GBP",
  "status": "confirmed",
  "processor": "stripe",
  "created_at": "2026-05-10T08:30:00Z"
}
```

---

## KYC Endpoints (All Protected)

### Submit KYC Documents
POST /api/kyc/submit

Request Body:
```json
{
  "documentUrl": "doc_passport_123456789",
  "documentType": "passport"
}
```

Response:
```json
{
  "kycRecord": {
    "id": 1,
    "status": "pending"
  }
}
```

### Get KYC Status
GET /api/kyc/status

Response:
```json
{
  "status": "verified",
  "record": {
    "id": 1,
    "document_type": "passport",
    "status": "verified",
    "created_at": "2026-05-10T08:00:00Z"
  }
}
```

---

## Compliance Endpoints (Officer/Admin only)

### Get Pending KYC Queue
GET /api/compliance/kyc/queue

Response:
```json
{
  "queue": [
    {
      "id": 1,
      "user_id": 5,
      "document_type": "passport",
      "status": "pending",
      "email": "user@example.com",
      "created_at": "2026-05-10T08:00:00Z"
    }
  ]
}
```

### Approve KYC
PATCH /api/compliance/kyc/:id/approve

Response:
```json
{
  "message": "KYC approved"
}
```

### Reject KYC
PATCH /api/compliance/kyc/:id/reject

Request Body:
```json
{
  "reason": "Document unclear, please resubmit"
}
```

Response:
```json
{
  "message": "KYC rejected"
}
```

---

## SAR Endpoints (Officer/Admin only)

### List All SARs
GET /api/sar?status=open&limit=20&offset=0

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "transaction_id": "uuid",
      "status": "open",
      "notes": [
        {
          "note": "SAR auto-created by fraud detection system",
          "by": "SYSTEM",
          "at": "2026-05-10T08:00:00Z"
        }
      ],
      "created_at": "2026-05-10T08:00:00Z"
    }
  ],
  "pagination": { "total": 5 }
}
```

### Create Manual SAR
POST /api/sar

Request Body:
```json
{
  "transactionId": "uuid",
  "reason": "Suspicious transaction pattern detected"
}
```

### Update SAR Status
PATCH /api/sar/:id/status

Request Body:
```json
{
  "status": "under_review",
  "note": "Investigating transaction history"
}
```

### Add Note to SAR
POST /api/sar/:id/notes

Request Body:
```json
{
  "note": "Contacted user for verification, awaiting response"
}
```

### Assign SAR to Officer
PATCH /api/sar/:id/assign

Request Body:
```json
{
  "officerId": "2"
}
```

---

## GDPR Endpoints (All Protected)

### Export All User Data
GET /api/gdpr/export

Response: JSON file containing all user data including transactions, KYC records, fraud checks, disputes, and audit logs.

### Delete / Anonymize Account
DELETE /api/gdpr/account

Response:
```json
{
  "success": true,
  "message": "Account anonymized successfully. You will be logged out."
}
```

Note: Account is anonymized (not deleted) to comply with FCA 5-year record retention.

### Get Consent Status
GET /api/gdpr/consent

Response:
```json
{
  "data_processing_consent": true,
  "marketing_consent": false,
  "analytics_consent": true,
  "consent_updated_at": "2026-05-10T08:00:00Z"
}
```

### Update Consent Preferences
PATCH /api/gdpr/consent

Request Body:
```json
{
  "dataProcessing": true,
  "marketing": false,
  "analytics": true
}
```

Response:
```json
{
  "success": true,
  "message": "Consent preferences updated"
}
```

---

## Dispute Endpoints (All Protected)

### Raise a Dispute
POST /api/disputes

Request Body:
```json
{
  "transactionId": "uuid",
  "reason": "I did not authorize this payment"
}
```

### Get My Disputes
GET /api/disputes/my

Response:
```json
{
  "disputes": [
    {
      "id": 1,
      "transaction_id": "uuid",
      "reason": "Unauthorized charge",
      "status": "disputed",
      "created_at": "2026-05-10T08:00:00Z"
    }
  ],
  "total": 1
}
```

### Get All Disputes (Officer/Admin only)
GET /api/disputes?status=disputed&limit=20

### Merchant Respond to Dispute
PATCH /api/disputes/:id/respond

Request Body:
```json
{
  "response": "Payment was authorized, order was delivered"
}
```

### Resolve with Refund (Officer only)
PATCH /api/disputes/:id/refund

Request Body:
```json
{
  "resolution": "Refund approved — customer was charged incorrectly"
}
```

### Resolve Rejected (Officer only)
PATCH /api/disputes/:id/reject

Request Body:
```json
{
  "resolution": "Transaction verified as legitimate"
}
```

---

## Webhook Endpoints

### Stripe Webhook
POST /api/webhooks/stripe

Headers: `stripe-signature` required

Handles these events:
- `payment_intent.succeeded` — Updates transaction to confirmed
- `payment_intent.payment_failed` — Updates transaction to failed
- `charge.refunded` — Updates transaction to refunded

### Razorpay Webhook
POST /api/webhooks/razorpay

Headers: `x-razorpay-signature` required

Handles these events:
- `payment.captured` — Updates transaction to confirmed
- `payment.failed` — Updates transaction to failed
- `refund.processed` — Updates transaction to refunded

---

## Settlement Endpoints (Admin only)

### Run Daily Settlement
POST /api/settlements/run

Response:
```json
{
  "success": true,
  "data": {
    "totalAmount": 1000.00,
    "totalFees": 25.00,
    "totalNet": 975.00,
    "settlements": [
      {
        "currency": "GBP",
        "txCount": 15,
        "totalAmount": 1000.00,
        "fees": 25.00,
        "net": 975.00
      }
    ]
  }
}
```

### Complete Settlement
PATCH /api/settlements/:id/complete

### Get Settlement History
GET /api/settlements?merchantId=uuid&limit=20

---

## Roles

**user** — Can make payments, submit KYC, raise disputes, manage their data.

**compliance_officer** — Can approve/reject KYC, manage SARs, resolve disputes.

**admin** — Full access to all endpoints including settlements and system management.

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message here"
}
```

Common Status Codes:
 `200` — Success
 `201` — Created
 `202` — Requires additional verification (2FA)
 `400` — Bad request / Validation error
 `401` — Unauthorized / Invalid token
 `403` — Forbidden / Fraud blocked
 `404` — Not found
 `429` — Rate limited
 `500` — Internal server error


## Rate Limits

 Endpoint               Limit 

 Register           3 requests per hour 
 Login              5 requests per 15 minutes 
 Refresh            10 requests per 15 minutes 
 Payments           10 requests per minute 
