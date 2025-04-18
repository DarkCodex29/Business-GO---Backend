if (!process.env.JWT_ACCESS_TOKEN_SECRET) {
  throw new Error('JWT_ACCESS_TOKEN_SECRET no está definido');
}
if (!process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME) {
  throw new Error('JWT_ACCESS_TOKEN_EXPIRATION_TIME no está definido');
}
if (!process.env.JWT_REFRESH_TOKEN_SECRET) {
  throw new Error('JWT_REFRESH_TOKEN_SECRET no está definido');
}
if (!process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME) {
  throw new Error('JWT_REFRESH_TOKEN_EXPIRATION_TIME no está definido');
}
if (!process.env.TWO_FACTOR_AUTH_SECRET) {
  throw new Error('TWO_FACTOR_AUTH_SECRET no está definido');
}
if (!process.env.TWO_FACTOR_AUTH_APP_NAME) {
  throw new Error('TWO_FACTOR_AUTH_APP_NAME no está definido');
}
if (!process.env.TWO_FACTOR_AUTH_EXPIRATION) {
  throw new Error('TWO_FACTOR_AUTH_EXPIRATION no está definido');
}
if (!process.env.BCRYPT_SALT_ROUNDS) {
  throw new Error('BCRYPT_SALT_ROUNDS no está definido');
}
if (!process.env.RATE_LIMIT_TTL) {
  throw new Error('RATE_LIMIT_TTL no está definido');
}
if (!process.env.RATE_LIMIT_MAX) {
  throw new Error('RATE_LIMIT_MAX no está definido');
}

export const jwtConstants = {
  accessToken: {
    secret: process.env.JWT_ACCESS_TOKEN_SECRET,
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_TOKEN_SECRET,
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
  },
};

export const twoFactorAuthConstants = {
  secret: process.env.TWO_FACTOR_AUTH_SECRET,
  appName: process.env.TWO_FACTOR_AUTH_APP_NAME,
  expiration: parseInt(process.env.TWO_FACTOR_AUTH_EXPIRATION, 10),
};

export const securityConstants = {
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10),
};
