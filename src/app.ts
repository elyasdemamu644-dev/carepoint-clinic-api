import express from 'express';
import appointmentRoutes from './routes/appointment.routes.js';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/appointments', appointmentRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
