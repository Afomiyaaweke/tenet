// ── Password Validator ───────────────────────────────────────────────────
// Enforces strong password policies per security requirements.

// Top 100 most common passwords (subset of RockYou breach list)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'access', 'hello', 'charlie', 'donald', '123456789',
  'password1', 'qwerty123', 'letmein', 'welcome', 'admin', 'passw0rd',
  '1234567', '1234567890', '123123', '000000', '121212', '1234', '12345',
  'password123', 'changeme', 'default', 'guest', 'root', 'test', 'asdf',
  'zxcvbn', '1q2w3e4r', '1qaz2wsx', 'qazwsx', 'pass123', 'pass1', 'p@ssw0rd',
  'p@ssword', 'p@ss1234', 'baseball', 'starwars', 'whatever', 'freedom',
  'love', 'michael', 'jennifer', 'jessica', 'pepper', 'summer', 'winter',
  'spring', 'autumn', 'secret', 'computer', 'internet', 'service', 'mustang',
  'samsung', 'matrix', '696969', '1q2w3e', 'aaa111', '7777777', 'fuckyou',
  '123qwe', 'zxcvbnm', 'asdfghjk', 'q1w2e3r4', 'password!', 'Password1',
  'P@ssw0rd', 'P@ssword1', 'Welcome1', 'Qwerty123', 'Admin123', 'Passw0rd!',
]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
}

const MIN_LENGTH = 8;

/**
 * Validate a password against all security requirements:
 * - Minimum 8 characters
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Not a common password
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  } else {
    score += 20;
    if (password.length >= 12) score += 10;
  }

  // Uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 15;
  }

  // Lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 15;
  }

  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 15;
  }

  // Special character (optional - bonus score only, not required)
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 15;
  }

  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Choose something more unique');
    score = 0;
  }

  // Bonus for variety of character types
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars >= 8) score += 10;

  // Determine strength
  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score >= 70) strength = 'strong';
  else if (score >= 50) strength = 'good';
  else if (score >= 30) strength = 'fair';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

/**
 * Sanitize and normalize an email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: { headers: { get: (name: string) => string | null } }): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: { headers: { get: (name: string) => string | null } }): string {
  return request.headers.get('user-agent')?.substring(0, 500) || 'unknown';
}

/**
 * Mask an email for logging: "ab***@example.com"
 */
export function maskEmail(email: string): string {
  return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
}

/**
 * Validate request payload size (max 10KB for auth endpoints)
 */
export function isPayloadTooLarge(body: string, maxBytes: number = 10240): boolean {
  return Buffer.byteLength(body, 'utf8') > maxBytes;
}
