import crypto from 'crypto';
import { env } from '../config/environment';

const ALGORITHM = 'aes-256-cbc';
const SECRET = env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
const IV_LENGTH = 16;

export function encrypt(text: string): string{
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string) : string{
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf8');
    return decrypted;
}