--- Core tables - Users, Transactions, Settlements

---Create custom types (like enums in ts)

CREATE TYPE user_role AS ENUM ('user', 'merchant', 'compliance_officer', 'admin');
CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected', 'expired');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE processor_type AS ENUM ('stripe', 'razorpay');
CREATE TYPE settlement_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'user',
  kyc_status kyc_status DEFAULT 'unverified',
  preferred_currency VARCHAR(3) DEFAULT 'GBP',
  consent_given_at TIMESTAMP,
  consent_version VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id),
  idempotency_key VARCHAR(255) UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(10,6),
  converted_amount DECIMAL(12,2),
  conversion_fee DECIMAL(10,2) DEFAULT 0,
  processor processor_type NOT NULL,
  processor_charge_id VARCHAR(255),
  status transaction_status DEFAULT 'pending',
  fraud_score INTEGER,
  fraud_decision VARCHAR(20),
  dispute_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE settlements (
  id SERIAL PRIMARY KEY,
  processor processor_type NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  transaction_count INTEGER NOT NULL,
  status settlement_status DEFAULT 'pending',
  reconciliation_status VARCHAR(20),
  mismatch_amount DECIMAL(12,2),
  settled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  response_cache JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);