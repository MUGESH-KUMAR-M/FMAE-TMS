const xss = require('xss');
const logger = require('./logger');

/**
 * Sanitize input to prevent XSS attacks
 * Removes all HTML tags and scripts
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // XSS sanitization - allow NO HTML
  const sanitized = xss(str, {
    whiteList: {}, // No HTML allowed
    stripIgnoredTag: true,
    stripComments: true,
    onTagAttr: () => ''
  });
  
  return sanitized;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Middleware to sanitize all user inputs
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (err) {
    logger.error('Input sanitization error:', err);
    res.status(500).json({ success: false, message: 'Input sanitization failed' });
  }
};

module.exports = { sanitizeInput, sanitizeString, sanitizeObject };
