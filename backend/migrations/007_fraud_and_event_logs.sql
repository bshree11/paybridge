--- Fraud logs and event logs (PostgresSQL JSONB replaces mongodb)

CREATE TABLE fraud_logs(
    id SERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    score INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    recommended_action VARCHAR(20) NOT NULL,
    reasons JSONB NOT NULL,
    confidence INTEGER,
    raw_prompt TEXT,
    raw_response TEXT,
    velocity_check_result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_logs(
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_processing(
    id SERIAL PRIMARY KEY,
    processor VARCHAR(20) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processes_at TIMESTAMP DEFAULT NOW()
);
