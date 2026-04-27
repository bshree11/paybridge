--- KYC  records and Suspicious Acitivity Reports

CREATE TYPE kyc_doc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE sar_status AS ENUM ('open', 'investigating', 'resolved', 'escalated');

---KYC Records table
CREATE TABLE kyc_records(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    document_url VARCHAR(500) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    status kyc_doc_status DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    expires_in TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

---SAR Reports table
CREATE TABLE sar_reports(
    id SERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    assigned_to INTEGER REFERENCES users(id),
    status sar_status DEFAULT 'open',
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);