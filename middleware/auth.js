const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登入或憑證遺失' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, name, email }
    next();
  } catch (e) {
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '沒有權限執行此操作' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET, ah };

// Wraps an async Express handler so rejected promises are forwarded to next(err)
// instead of crashing the process (Express 4 doesn't catch async errors natively).
function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
