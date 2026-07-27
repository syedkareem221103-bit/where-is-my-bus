import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', validateRequest(registerSchema), controller.register);
router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', validateRequest(refreshSchema), controller.refresh);
router.get('/.well-known/jwks.json', controller.jwks);

// Protected endpoints
router.post('/logout', authenticateUser, controller.logout);
router.get('/profile', authenticateUser, controller.profile);

export default router;
