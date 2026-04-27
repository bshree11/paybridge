--- Double-entry ledger

CREATE TYPE ledger_direction AS ENUM ('debit', 'credit');

CREATE TABLE ledger_entries(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    direction ledger_direction NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    running_balance DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
