--- Seed data for testing

--- Password is 'password123' hashed with bcrypt

-- We'll generate real hashes in the seed script, this is just a placeholder

INSERT INTO users (email, password_hash, role, kyc_status, preferred_currency, consent_given_at, consent_version)
VALUES
  ('user@test.com', '$2b$10$placeholder', 'user', 'verified', 'GBP', NOW(), '1.0'),
  ('merchant@test.com', '$2b$10$placeholder', 'merchant', 'verified', 'GBP', NOW(), '1.0'),
  ('officer@test.com', '$2b$10$placeholder', 'compliance_officer', 'verified', 'GBP', NOW(), '1.0'),
  ('admin@test.com', '$2b$10$placeholder', 'admin', 'verified', 'GBP', NOW(), '1.0'),
  ('unverified@test.com', '$2b$10$placeholder', 'user', 'unverified', 'EUR', NOW(), '1.0'),
  ('pending@test.com', '$2b$10$placeholder', 'user', 'pending', 'USD', NOW(), '1.0');

-- Sample currency rates
INSERT INTO currency_rates (base_currency, target_currency, rate)
VALUES
  ('GBP', 'EUR', 1.170000),
  ('GBP', 'USD', 1.260000),
  ('GBP', 'INR', 104.500000),
  ('EUR', 'GBP', 0.854700),
  ('EUR', 'USD', 1.076900),
  ('EUR', 'INR', 89.320000),
  ('USD', 'GBP', 0.793600),
  ('USD', 'EUR', 0.928600),
  ('USD', 'INR', 84.000000),
  ('INR', 'GBP', 0.009570),
  ('INR', 'EUR', 0.011200),
  ('INR', 'USD', 0.011905);