import { Pool } from 'pg';
import { env } from './environment'

export const pool = new Pool({
    connectionString: env.DATABASE_URL,

});

pool.on('error', (err: Error) =>{
    console.error('Unexpected database error:', err);
    process.exit(-1);
});

export const query = (text: string, params?:any[]) => {
    return pool.query(text, params);
};