/**
 * 🧹 Logger Service
 * Centralized, production-optimized logger that prevents console clutter.
 * Automatically sanitizes sensitive keys (password, token, secret).
 */

const SENSITIVE_KEYS = ['password', 'token', 'refreshToken', 'secret', 'jwt_secret'];

const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const clean: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clean[key] = '***REDACTED***';
    } else if (typeof data[key] === 'object') {
      clean[key] = sanitizeData(data[key]);
    } else {
      clean[key] = data[key];
    }
  }
  return clean;
};

export class LoggerService {
  private static isProduction = process.env.NODE_ENV === 'production';

  static info(message: string, context?: any): void {
    if (this.isProduction) return; // Suppress verbose info in production
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context ? sanitizeData(context) : '');
  }

  static warn(message: string, context?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context ? sanitizeData(context) : '');
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error?.message || error || '');
  }

  static debug(message: string, context?: any): void {
    if (this.isProduction) return;
    // console.debug(`[DEBUG] ${message}`, context ? sanitizeData(context) : '');
  }
}

export default LoggerService;
