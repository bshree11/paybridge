import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../../services/AuthService';
import { query } from '../../config/database';

//takes user data from req.body and calls AuthService to process it and then gives back data to user.

export async function registerUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const { email, password, consent} = req.body;
        const user = await authService.register(
            email, password, consent
        );
        res.status(201).json({user});

    }catch(error){
        next(error)
    }
}

export async function getMe(req: any, res: any) {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT id, email, role, kyc_status, totp_enabled as two_factor_enabled 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        kycStatus: user.kyc_status,
        twoFactorEnabled: user.two_factor_enabled,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
}

export async function loginUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const { email, password} = req.body;
        const result = await authService.login(
            email, password
        );
        res.status(200).json(result);
    }catch(error){
        next(error);
    }
}

export async function refreshToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const {refreshToken} = req.body;
        const result = await authService.refreshTokens(
            refreshToken
        );
        res.status(200).json(result);
    }catch(error){
        next(error);
    }
}

export async function logoutUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const { refreshToken } = req.body;
        const jti = req.user?.jti || '';
        await authService.logout(refreshToken, jti);
        res.status(200).json({
            message: 'Logged out successfully'
        });

    }catch(error){
        next(error);
    }
}


export async function setup2FA(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const userId = req.user?.userId as number;
    const result = await authService.setup2FA(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verify2FASetup(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const userId = req.user?.userId as number;
    const { token } = req.body;
    const result = await authService.verify2FASetup(
      userId, token
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verify2FALogin(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const { challengeToken, totpCode } = req.body;
    const result = await authService.verify2FALogin(
      challengeToken, totpCode
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
