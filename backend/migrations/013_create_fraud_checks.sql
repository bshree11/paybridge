CREATE TABLE IF NOT EXISTS fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  total_score INTEGER NOT NULL,
  decision VARCHAR(10) NOT NULL 
    CHECK (decision IN ('APPROVE', 'REVIEW', 'REJECT')),
  rules_triggered JSONB NOT NULL DEFAULT '[]',
  sar_id UUID REFERENCES suspicious_activity_reports(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_checks_user_id ON fraud_checks(user_id);
CREATE INDEX idx_fraud_checks_decision ON fraud_checks(decision);
CREATE INDEX idx_fraud_checks_total_score ON fraud_checks(total_score);
CREATE INDEX idx_fraud_checks_checked_at ON fraud_checks(checked_at);