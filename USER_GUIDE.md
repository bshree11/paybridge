# PayBridge User Guide

## Getting Started

### 1. Create an Account
- Go to the signup page
- Enter your email and password
- Check the GDPR consent checkbox (required)
- Click "Create account"
- You'll be automatically logged in and redirected to the dashboard

### 2. Verify Your Identity (KYC)
Before making payments, you need to verify your identity:
- Go to the KYC page from the sidebar
- Select your document type (Passport, Driving Licence, or National ID)
- Enter your document number
- Fill in your full name, date of birth, and address
- Click "Submit for Verification"
- Status changes to "Pending" — a compliance officer will review it
- Once approved, your KYC status changes to "Verified"

### 3. Make a Payment
- Go to the Payments page
- Enter the amount
- Select the currency (GBP, USD, EUR, or INR)
- Select the recipient currency (for cross-currency payments)
- If currencies differ, you'll see a conversion preview with exchange rate and fees
- Select your card
- Click "Pay"
- The system runs fraud detection — if suspicious, you may need 2FA verification

### 4. View Transactions
- Go to the Transactions page
- See all your payment history with status badges
- Filter by status (Confirmed, Pending, Failed, Disputed, Refunded)
- Search by transaction ID
- Raise a dispute on any confirmed transaction if needed

### 5. Raise a Dispute
- Go to the Transactions page
- Find the transaction you want to dispute
- Click the "Dispute" button
- Enter your reason
- Submit — a compliance officer will review it
- You'll be notified of the resolution

---

## Settings

### Two-Factor Authentication (2FA)
- Go to the Settings page
- Click "Enable 2FA"
- Scan the QR code with Google Authenticator (or any TOTP app)
- Enter the 6-digit code from the app
- 2FA is now enabled — you'll need the code when logging in

### Consent Preferences
- Go to the Settings page
- Toggle marketing communications on/off
- Toggle analytics on/off
- Data processing consent is required and cannot be disabled
- Click "Save Preferences"

---

## Data Privacy (GDPR)

### Download Your Data
- Go to the Data Privacy page
- Click "Download My Data"
- A JSON file will download containing all your personal data

### Delete Your Account
- Go to the Data Privacy page
- Click "Delete My Account"
- Type "DELETE MY ACCOUNT" to confirm
- Your personal data will be anonymized
- Transaction records are kept for regulatory compliance but can't be linked to you

---

## Understanding Your Dashboard

### Total Balance
Shows the sum of all your confirmed transactions in GBP.

### Total Transactions
Shows how many transactions you've made (all time).

### KYC Status
- **Unverified** — You need to submit KYC documents
- **Pending** — Documents submitted, waiting for review
- **Verified** — Identity confirmed, you can make payments
- **Rejected** — Documents rejected, please resubmit

### Recent Transactions
Shows your last 5 transactions with status badges:
- **Confirmed** — Payment successful
- **Pending** — Payment processing
- **Failed** — Payment failed
- **Disputed** — Dispute raised
- **Refunded** — Money returned

---

## Payment Processing

### Supported Currencies
- GBP (British Pound) — processed via Stripe
- USD (US Dollar) — processed via Stripe
- EUR (Euro) — processed via Stripe
- INR (Indian Rupee) — processed via Razorpay

### Fees
- Same currency payments: No conversion fee
- Cross-currency payments: 1.5% conversion fee
- Exchange rates refresh every hour

### Fraud Detection
Every payment goes through a fraud detection system:
- **Score 0-30:** Payment approved automatically
- **Score 30-70:** Additional 2FA verification required
- **Score 70-100:** Payment blocked, Suspicious Activity Report filed

---

## For Compliance Officers

If your account has the `compliance_officer` role, you'll see a Compliance section in the sidebar:

### KYC Queue
- View all pending KYC submissions
- Click Approve or Reject for each submission
- Rejected submissions require a reason

### SAR Reports
- View all Suspicious Activity Reports
- Click to expand and see details
- Update status (Under Review, Escalated, Resolved, Filed)
- Add investigation notes
- Assign to other officers

---

## Troubleshooting

### "KYC verification required" when making payment
You need to verify your identity first. Go to KYC page and submit your documents.

### Payment shows "Additional 2FA verification required"
Your payment triggered fraud detection review. Enable 2FA in Settings and try again.

### "Payment blocked" error
The fraud detection system flagged your transaction as suspicious. This could be due to high amount, unusual time, or too many rapid transactions.

### Page shows loading spinner forever
The backend might be waking up (Render free tier). Wait 30-60 seconds and refresh.

### Can't log in after account deletion
Your account has been anonymized. You'll need to create a new account.