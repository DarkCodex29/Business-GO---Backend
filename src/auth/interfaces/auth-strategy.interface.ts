import { Request } from 'express';

export interface AuthCredentials {
  type: 'email' | 'whatsapp' | 'phone' | 'external';
  identifier: string; // email, phone, whatsapp_id
  credential?: string; // password, code, token
  metadata?: Record<string, any>;
}

export interface AuthResult {
  user: any;
  tokens: {
    access_token: string;
    refresh_token?: string;
  };
  requiresVerification?: boolean;
  sessionId?: string;
}

export interface IAuthStrategy {
  readonly type: string;
  validate(credentials: AuthCredentials, req?: Request): Promise<any>;
  generateTokens(
    user: any,
    req?: Request,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
  }>;
}

export interface WhatsAppSession {
  sessionId: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  metadata?: Record<string, any>;
}
