ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS settled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id);

CREATE INDEX idx_transactions_settled ON transactions(settled);
CREATE INDEX idx_transactions_settlement_id ON transactions(settlement_id);