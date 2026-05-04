CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  url TEXT NOT NULL,
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbound_webhooks_merchant ON outbound_webhooks(merchant_id);
CREATE INDEX idx_outbound_webhooks_status ON outbound_webhooks(status);
CREATE INDEX idx_outbound_webhooks_event ON outbound_webhooks(event);
CREATE INDEX idx_outbound_webhooks_created_at ON outbound_webhooks(created_at);