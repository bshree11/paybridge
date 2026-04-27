--- Transaction disputes

CREATE TYPE dispute_status AS ENUM('disputed', 'investigating', 'resolved', 'refunded', 'rejected');

CREATE TABLE disputes(
    id SERIAL PRIMARY KEY,
    trasaction_id UUID NOT NULL REFERENCES transactions(id),
    raised_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'disputed',
    resolution TEXT,
    sar_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP 
);