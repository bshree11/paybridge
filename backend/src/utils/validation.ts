import {z} from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be atleast 8 characters'),
    consent: z.boolean().refine(val => val === true, 'Consent is required'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
});

export const verify2FASchema = z.object({
    token: z.string().length(6, 'Token must be 6 digits'),
});