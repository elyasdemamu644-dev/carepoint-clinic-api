import { Router } from 'express';
import { LoginSchema, RegisterSchema } from '../schemas/auth.schema.js';
import { GoogleCallbackSchema } from '../schemas/appointment.schema.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { registerController, loginController, refreshController, logoutController } from '../controllers/auth.controller.js';
import { googleCallbackController, googleRedirectController } from '../controllers/oauth.controller.js';

export const authRouter = Router();

authRouter.post('/register', validateRequest(RegisterSchema), registerController);
authRouter.post('/login', validateRequest(LoginSchema), loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', requireAuth, logoutController);
authRouter.get('/google', googleRedirectController);
authRouter.get('/google/callback', validateRequest(GoogleCallbackSchema), googleCallbackController);
