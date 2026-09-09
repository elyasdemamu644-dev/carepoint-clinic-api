import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.routes.js';
import { appointmentRouter } from './routes/appointment.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'success', data: { timestamp: new Date().toISOString(), uptime: process.uptime() } });
});

app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/admin', adminRouter);
app.use(notFound);
app.use(errorHandler);
