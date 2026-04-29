import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { query } from "../config/database";
import { redis } from "../config/redis";
import { env } from "../config/environment";
import { encrypt, decrypt } from "../utils/encryption";
import { AuthError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

//REGISTER

export async function register(
  email: string,
  password: string,
  consent: boolean,
) {
  const existing = await query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) {
    throw new ValidationError("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users 
     (email, password_hash, 
      consent_given_at, consent_version)
     VALUES ($1, $2, NOW(), '1.0')
     RETURNING id, email, role, kyc_status`,
    [email, passwordHash],
  );

  logger.info("User registered", { userId: result.rows[0].id });
  return result.rows[0];
}

//LOGIN

export async function login(email: string, password: string) {
  const result = await query(
    "SELECT id, email, password_hash, role, kyc_status, totp_enabled FROM users WHERE email = $1",
    [email],
  );
  if (result.rows.length === 0) {
    throw new AuthError("Invalid email or password");
  }
  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AuthError("Invalid email or password");
  }

  if (user.totp_enabled) {
    const challengeToken = crypto.randomBytes(32).toString("hex");
    await redis.setex(`2fa:${challengeToken}`, 300, user.id.toString());

    return {
      requires2FA: true,
      challengeToken,
    };
  }

  const tokens = await generateTokens(user);

  return {
    requires2FA: false,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      kyc_status: user.kyc_status,
    },
    ...tokens,
  };
}

export function generateAccessTokens(user: {
  id: number;
  email: string;
  role: string;
}) {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
    },
    env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

export async function generateRefreshToken(userId: number) {
  const token = crypto.randomBytes(40).toString("hex");
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000, //7 days
  );

  await query(
    `INSERT INTO refresh_tokens 
   (user_id, token_hash, expires_at)
   VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
  return token;
}

export async function generateTokens(user: {
  id: number;
  email: string;
  role: string;
}) {
  const accessToken = generateAccessTokens(user);
  const refreshToken = await generateRefreshToken(user.id);
  return { accessToken, refreshToken };
}

export async function refreshTokens(oldRefreshToken: string) {
  const result = await query(
    `SELECT id, user_id, token_hash
        FROM refresh_tokens
        WHERE revoked_at IS NULL
        AND expires_at > NOW()`,
  );
  let matchedToken = null;
  for (const row of result.rows) {
    const isMatch = await bcrypt.compare(oldRefreshToken, row.token_hash);
    if (isMatch) {
      matchedToken = row;
      break;
    }
  }
  if (!matchedToken) {
    throw new AuthError("Invalid refresh token");
  }
  await query(
    `UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE id = $1`,
    [matchedToken.id],
  );

  const userResult = await query(
    `SELECT id, email, role, kyc_status
    FROM users WHERE id= $1`,
    [matchedToken.user_id],
  );

  const user = userResult.rows[0];
  const tokens = await generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      kyc_status: user.kyc_status,
    },
    ...tokens,
  };
}

export async function logout(refreshToken: string, accessTokenJti: string) {
  const result = await query(
    `SELECT id, token_hash
        FROM refresh_tokens
        WHERE revoked_at IS NULL
        AND expires_at > NOW()`,
  );

  for (const row of result.rows) {
    const isMatch = await bcrypt.compare(refreshToken, row.token_hash);
    if (isMatch) {
      await query(
        `UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE id = $1`,
        [row.id],
      );
      break;
    }
  }
  await redis.setex(`blocked: ${accessTokenJti}`, 900, "true");
  logger.info("User logged out");
}

export async function setup2FA(userid: number) {
  const secret = speakeasy.generateSecret({
    name: `PayBridge: ${userid}`,
    issuer: "PayBridge",
  });

  const encryptedSecret = encrypt(secret.base32);

  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase(),
  );
  const encryptedBackupCodes = backupCodes.map((code) => encrypt(code));

  await query(
    `UPDATE users
        SET totp_secret= $1, backup_codes = $2
        WHERE id = $3`,
    [encryptedSecret, encryptedBackupCodes, userid],
  );

  const qrCodeUrl = await QRCode.toDataURL((secret as any).otpauth_url || "");

  return {
    qrCode: qrCodeUrl,
    backupCodes,
  };
}

export async function verify2FASetup(userId: number, token: string) {
  const result = await query("SELECT totp_secret FROM users WHERE id=$1", [
    userId,
  ]);

  if (!result.rows[0].totp_secret) {
    throw new ValidationError("2FA not set up yet");
  }

  const secret = decrypt(result.rows[0].totp_secret);
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isValid) {
    throw new AuthError("Invalid 2FA code");
  }

  await query(
    `UPDATE users SET totp_enabled = true 
     WHERE id = $1`,
    [userId],
  );

  logger.info("2FA enabled", { userId });

  return { message: "2FA enabled successfully" };
}

export async function verify2FALogin(challengeToken: string, totpCode: string) {
  const userId = await redis.get(`2fa:${challengeToken}`);

  if (!userId) {
    throw new AuthError("2FA challenge expired or invalid");
  }

  await redis.del(`2fa:${challengeToken}`);

  const result = await query(
    `SELECT id, email, role, kyc_status, 
     totp_secret FROM users WHERE id = $1`,
    [parseInt(userId)],
  );

  const user = result.rows[0];

  const secret = decrypt(user.totp_secret);
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });

  if (!isValid) {
    throw new AuthError("Invalid 2FA code");
  }

  const tokens = await generateTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      kyc_status: user.kyc_status,
    },
    ...tokens,
  };
}
