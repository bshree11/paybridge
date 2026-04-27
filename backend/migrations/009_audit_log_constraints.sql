--- Audit logs (Append -Only - no updates, no deletes allowed)

CREATE TABLE audit_logs(
    id SERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id),
    actor_role VARCHAR(30),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

--- Prevent UPDATE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE not allowed on audit_logs table';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW 
  EXECUTE FUNCTION prevent_audit_update();

---Prevent DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
 RAISE EXCEPTION 'DELETE not allowed on audit_logs table';
 END;
 $$ LANGUAGE plpgsql;

 CREATE TRIGGER no_audit_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_delete();