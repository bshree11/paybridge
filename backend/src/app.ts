import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './api/routes/health';
import authRoutes from './api/routes/auth';
import kycRoutes from './api/routes/kyc';
import complianceRoutes from './api/routes/compliance';
import paymentRoutes from './api/routes/payments';

import { errorHandler } 
  from './api/middleware/errorHandler';
import { requestLogger } 
  from './api/middleware/requestLogger';
import { piiMasking } 
  from './api/middleware/piiMasking';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(piiMasking);

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/kyc', kycRoutes);
app.use('/compliance', complianceRoutes);
app.use('/payments', paymentRoutes);


app.use(errorHandler);

export default app;