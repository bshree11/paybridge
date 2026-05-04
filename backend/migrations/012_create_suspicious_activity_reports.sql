CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' 
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FILED')),
  reason TEXT NOT NULL,
  fraud_score INTEGER,
  triggered_rules JSONB DEFAULT '[]',
  notes JSONB DEFAULT '[]',
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sar_user_id ON suspicious_activity_reports(user_id);
CREATE INDEX idx_sar_status ON suspicious_activity_reports(status);
CREATE INDEX idx_sar_priority ON suspicious_activity_reports(priority);
CREATE INDEX idx_sar_created_at ON suspicious_activity_reports(created_at);
CREATE INDEX idx_sar_assigned_to ON suspicious_activity_reports(assigned_to);
CREATE SEQUENCE IF NOT EXISTS sar_reference_seq START 1;