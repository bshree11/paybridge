import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './api/routes/health';
import authRoutes from './api/routes/auth';
import { errorHandler } from './api/middleware/errorHanlder';
import { requestLogger } from './api/middleware/requestLogger';
import { piiMasking } from './api/middleware/piiMasking';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(piiMasking);

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);
export default app;