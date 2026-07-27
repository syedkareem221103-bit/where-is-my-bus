import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { getJWKS } from '../../utils/crypto';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgName, subdomain, contactEmail, adminEmail, password, firstName, lastName } = req.body;
      const result = await this.authService.register({
        orgName,
        subdomain,
        contactEmail,
        adminEmail,
        adminPasswordHash: password,
        firstName,
        lastName,
      });

      res.status(201).json({
        status: 'success',
        message: 'Organization and administrator registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, deviceType } = req.body;
      const result = await this.authService.login(email, password, deviceType || 'Unknown', req.ip || 'unknown');

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refresh(refreshToken, req.ip || 'unknown');

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new Error('User required'));
      await this.authService.logout(req.user.sub, req.user.sid, req.user.org, req.ip || 'unknown');

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new Error('User required'));
      const profile = await this.authService.getProfile(req.user.sub);

      res.status(200).json({
        status: 'success',
        data: { user: profile },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Serves public JSON Web Key Sets (JWKS) for ES256 token verification.
   * Client-side libraries should cache this response for up to 24 hours.
   */
  jwks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jwks = getJWKS();
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
      res.status(200).json(jwks);
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
