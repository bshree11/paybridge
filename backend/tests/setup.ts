import { pool } from '../src/config/database';
import { redis } from '../src/config/redis';

afterAll(async ()=>{
    await pool.end();
    await redis.quit();
});