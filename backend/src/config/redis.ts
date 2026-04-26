import Redis from 'ioredis';
import { env } from './environment';

export const redis = new Redis(env.REDIS_URL)

redis.on('connect', ()=>{
    console.log('Redis connected');
});

redis.on('error', (err: Error) =>{
    console.error('Redis connection error:', err);
});
