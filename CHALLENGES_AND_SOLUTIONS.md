# Challenges & Solutions — PayBridge

## 1. Multi-Processor Payment Routing

**Challenge:** Supporting multiple payment processors (Stripe + Razorpay) with different APIs, response formats, and currency support.

**Solution:** Created a BaseProcessor interface that both StripeProcessor and RazorpayProcessor implement. PaymentRoutingService picks the right processor based on currency (GBP/USD/EUR → Stripe, INR → Razorpay) and has automatic failover — if the primary processor fails, it tries the backup.

## 2. Fraud Detection Without Training Data

**Challenge:** Building fraud detection without millions of real transactions to train a model on.

**Solution:** Built a hybrid approach — 7 rule-based checks (amount thresholds, velocity, account age, cross-border, round numbers, night transactions, amount spikes) combined with Hugging Face AI at a 70/30 weight split (although free tier has limits). Rules are reliable and deterministic, AI catches patterns rules might miss. System still works if AI is down (fallback to rules-only).

## 3. Double-Entry Ledger Consistency

**Challenge:** Ensuring every payment creates exactly two entries (debit + credit) and money never appears or disappears.

**Solution:** Used PostgreSQL BEGIN/COMMIT transactions for atomic operations. Both entries are created inside a single transaction — if either fails, both roll back. Added a verifyBalance function that checks total debits equal total credits. Row-level locking (FOR UPDATE) prevents race conditions.

## 4. Preventing Double Payments

**Challenge:** Network issues could cause a customer to click "Pay" twice, resulting in duplicate charges.

**Solution:** Implemented idempotency using Redis + PostgreSQL. Each payment request includes a unique idempotencyKey. Before processing, we check if this key was used before. If yes, return the cached response. If no, process the payment and save the key. Redis provides fast lookup, PostgreSQL provides persistence.

## 5. GDPR Compliance vs FCA Record Retention

**Challenge:** GDPR says users can delete their data. FCA says we must keep transaction records for 5 years. These contradict each other.

**Solution:** Anonymization instead of deletion. When a user requests account deletion, we replace their personal data (name, email, password) with "DELETED_USER" and "deleted@anonymized.com". Transaction records remain but can't be linked back to the person. Both regulations satisfied.

## 6. Webhook Security

**Challenge:** Anyone could send fake webhook requests to our endpoint pretending to be Stripe or Razorpay.

**Solution:** Signature verification using HMAC SHA256. Both Stripe and Razorpay sign their webhook payloads with a secret key. We recreate the signature using our copy of the secret and compare using timing-safe comparison (prevents timing attacks). If signatures don't match, we reject the webhook.

## 7. Currency Rate Freshness

**Challenge:** Exchange rates change constantly. Using stale rates means incorrect conversions and potential financial loss.

**Solution:** Four-layer rate lookup: Redis cache (fastest) → PostgreSQL (reliable) → External API (fresh) → Hardcoded fallback (always works). A cron job refreshes all rates every hour. Even if the API goes down, the system uses cached or fallback rates — never breaks.


## 8. TypeScript Strict Mode in Production

**Challenge:** Unused variables and imports that worked fine in development caused build failures on Vercel's strict TypeScript compilation.

**Solution:** Cleaned up all unused imports, variables, and type assertions before deployment. Set up proper TypeScript configuration for both development flexibility and production strictness.