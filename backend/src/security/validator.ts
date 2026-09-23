import { Request, Response, NextFunction } from 'express';

/**
 * 🛡️ NoSQL Injection & Query Sanitizer
 * Recursively inspects data and neutralizes MongoDB operator injections ($gt, $ne, $where, etc.).
 */
export const sanitizeNoSQL = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeNoSQL);
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    // Drop keys starting with '$' or containing '.' (MongoDB query operators)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    const val = data[key];
    if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeNoSQL(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

/**
 * Express middleware to sanitize body, query, and params against NoSQL injections
 */
export const noSQLSanitizerMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) req.body = sanitizeNoSQL(req.body);
  if (req.query) req.query = sanitizeNoSQL(req.query);
  if (req.params) req.params = sanitizeNoSQL(req.params);
  next();
};

/**
 * 📝 Validation rules
 */
export const validateLoginInput = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Valid email address is required' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, message: 'Please provide a valid email format' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 4) {
    res.status(400).json({ success: false, message: 'Password must be a valid string of at least 4 characters' });
    return;
  }

  next();
};

export const validateBookingInput = (req: Request, res: Response, next: NextFunction): void => {
  const { docId, slotDate, slotTime } = req.body || {};

  if (!docId || typeof docId !== 'string') {
    res.status(400).json({ success: false, message: 'Valid doctor ID (docId) is required' });
    return;
  }

  if (!slotDate || typeof slotDate !== 'string') {
    res.status(400).json({ success: false, message: 'Valid slot date is required' });
    return;
  }

  if (!slotTime || typeof slotTime !== 'string') {
    res.status(400).json({ success: false, message: 'Valid slot time is required' });
    return;
  }

  next();
};

export default {
  sanitizeNoSQL,
  noSQLSanitizerMiddleware,
  validateLoginInput,
  validateBookingInput,
};
