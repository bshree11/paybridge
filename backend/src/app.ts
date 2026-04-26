import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './api/routes/health';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRoutes);

export default app;