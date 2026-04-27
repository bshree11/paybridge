--- Auth tables - Refresh Tokens + 2FA (Factor Authentication) fields on users

---Add 2FA fields to users table

ALTER TABLE users
  ADD COLUMN totp_secret VARCHAR(255),
  ADD COLUMN topt_enabled BOOLEAN DEFAULT false,
  ADD COLUMN backup_codes TEXT[];

---Refresh tokens table
CREATE TABLE refresh_tokens(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

