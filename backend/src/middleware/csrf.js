const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// ── Lightweight CSRF stub for JWT-based SPA ─────────────────────────────────
// Cookie-CSRF (csurf) is unnecessary when auth is done via Bearer tokens.
// We expose a /api/csrf-token endpoint that returns a random token so the
// existing frontend api.js continues to work without changes.

const csrfProtection = (req, res, next) => next(); // no-op for JWT APIs

const getCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  getCsrfToken,
  cookieParser: cookieParser(),
};
