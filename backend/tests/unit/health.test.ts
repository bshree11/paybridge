import supertest from 'supertest';
import app from '../../src/app';

const request = supertest(app);

describe('Health Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const response = await request.get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });
});