The Universal Rules That Work in BOTH UK and EU
These are the ones you should build into PayBridge. They're not UK-specific or EU-specific — they're the shared foundation:
Authentication & Payments
Strong Customer Authentication (SCA) — Both UK and EU require two-factor authentication for online payments. Same rule, same implementation. Build this once, it works for both.
Transaction Transparency — Show all fees, exchange rates, and total charges before payment confirmation. Both UK and EU require this. No hidden costs.
Payment Initiation Standards — Both follow PSD2-style open banking APIs. The technical standards are nearly identical.
Data Protection
Consent before collecting data — Both UK GDPR and EU GDPR require explicit opt-in. No pre-ticked boxes, no collecting data silently.
Right to deletion — Users can ask you to delete their data. Both jurisdictions require this. Design your PostgreSQL schema so a user can be fully removed.
Data minimisation — Only collect what you need. Don't ask for date of birth if you don't need it. Same rule in both.
72-hour breach notification — If there's a data breach, report it within 72 hours. Same deadline in both UK and EU.
Privacy policy and cookie consent — You already know this from your WordPress days. Same concept, just at fintech scale now.
Anti-Money Laundering
KYC (Customer Due Diligence) — Verify identity before allowing transactions. Same requirement in both UK and EU.
Enhanced Due Diligence (EDD) — Extra checks for high-risk customers like politically exposed persons. Same concept in both.
Suspicious Activity Reporting — Both require you to detect and report suspicious transactions. The agency is different (NCA in UK, FIU in EU countries) but the system you build is the same — detect, flag, report.
5-year record retention — Keep transaction records and KYC data for at least 5 years. Same in both.
Transaction monitoring — Continuous monitoring for unusual patterns. Same requirement, same implementation.
Consumer Protection
Safeguarding customer funds — Keep customer money separate from company money. Both require this.
Complaint handling process — Must have a formal process for customer complaints. Both require this.
Clear terms and conditions — No hidden clauses, everything must be understandable. Both require this.