import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { metricsController } from '../controllers/admin.controller.js';

export const adminRouter = Router();
adminRouter.get('/metrics', requireAuth, requirePermission('system:admin'), metricsController);
