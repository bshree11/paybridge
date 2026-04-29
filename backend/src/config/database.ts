import { Pool } from 'pg';

export const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'paybridge',
});

pool.on('error', (err: Error) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};