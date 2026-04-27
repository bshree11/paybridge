--- Currency exchange rates cache

CREATE TABLE currency_rates(
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    fetched_at TIMESTAMP DEFAULT NOW()
);