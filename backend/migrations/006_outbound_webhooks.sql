--- Outbound webhooks for merchant notifications

CREATE TYPE webhook_status AS ENUM ('pending', 'delivered', 'failed');

CREATE TABLE outbound_webhooks(
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    hmac_signature VARCHAR(255) NOT NULL,
    status webhook_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_error TEXT,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);