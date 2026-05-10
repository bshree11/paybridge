import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './api/routes/health';
import authRoutes from './api/routes/auth';
import kycRoutes from './api/routes/kyc';
import complianceRoutes from './api/routes/compliance';
import paymentRoutes from './api/routes/payments';
import sarRoutes from './api/routes/sar';
import webhookRoutes from './api/routes/webhooks';
import gdprRoutes from './api/routes/gdpr';
import disputeRoutes from './api/routes/disputes';
import settlementRoutes from './api/routes/settlements';


import { errorHandler } 
  from './api/middleware/errorHandler';
import { requestLogger } 
  from './api/middleware/requestLogger';
import { piiMasking } 
  from './api/middleware/piiMasking';

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'https://paybridge.vercel.app', /\.vercel\.app$/],
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);
app.use(piiMasking);

app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sar', sarRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/settlements', settlementRoutes);


app.use(errorHandler);

export default app;