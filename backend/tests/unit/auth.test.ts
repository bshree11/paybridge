import supertest from 'supertest';
import app from '../../src/app';

const request = supertest(app);

describe('Auth Endpoints', ()=>{
    const testUser = {
        email: `testUser${Date.now()}@test.com`,
        password: 'password123',
        consent: true,
    };

    let accessToken: string;
    let refreshToken: string;

    it('should register a new user', async()=>{
        const res = await request
        .post('/auth/register')
        .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body.user.role).toBe('user');
        expect(res.body.user.kyc_status).toBe('unverified');

    });

    it('should reject duplicate email', async()=>{
        const res = await request
        .post('/auth/register')
        .send(testUser);

        expect(res.status).toBe(400);
    });

    it('should login successfully', async()=>{
        const res = await request
        .post('/auth/login')
        .send({
            email: testUser.email,
            password: testUser.password,
        });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.requires2FA).toBe(false);

        accessToken = res.body.accessToken;
        refreshToken= res.body.refreshToken;
    });

    it('Should reject wrong password', async()=>{
        const res= await request
        .post('/auth/login')
        .send({
            email: testUser.email,
            password: 'wrongpassword',
        });
        expect(res.status).toBe(401);
    });

    it('should refresh tokens', async()=>{
        const res = await request
        .post('/auth/refresh')
        .send({refreshToken});

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();

        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    it('should logout successfully', async()=>{
        const res = await request
        .post('/auth/logout')
        .set('Authorization', `Bearer${accessToken}`)
        .send({refreshToken});

        expect(res.status).toBe(200);
        expect(res.body.message).toBe(

            'Logged out successfully'
        );
    });

});