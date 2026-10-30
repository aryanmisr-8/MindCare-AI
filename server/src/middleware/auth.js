const { verifyToken } = require('../utils/security');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

// Optional auth: attaches req.userId if a valid token is present, but never blocks the request.
// Used for public routes (research library, doctor directory) that can still be personalised.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.userId = payload.sub;
      req.role = payload.role;
    } catch (_) { /* ignore invalid token on optional routes */ }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
