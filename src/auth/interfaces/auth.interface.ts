export interface AuthCredentials {
  type: 'email' | 'phone' | 'whatsapp' | 'external';
  identifier: string;
  credential?: string; // password, code, token
  metadata?: Record<string, any>;
}

export interface AuthResult {
  user: any;
  tokens: {
    access_token: string;
    refresh_token?: string;
  };
  session?: any;
}

export interface IAuthStrategy {
  validate(credentials: AuthCredentials): Promise<any>;
  generateTokens(
    user: any,
  ): Promise<{ access_token: string; refresh_token?: string }>;
}

export interface WhatsAppAuthSession {
  sessionId: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

export interface UserIdentifiers {
  email?: string;
  telefono?: string;
  whatsapp_id?: string;
  external_id?: string;
}

export interface LoginResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: number;
    email?: string;
    telefono?: string;
    rol: string;
    empresas?: any[];
  };
  sessionId?: string; // Para flujos de verificación en 2 pasos
  message?: string;
  requiresVerification?: boolean;
}
