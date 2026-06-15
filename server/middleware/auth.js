const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('_id email username');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = { id: user._id.toString(), email: user.email, username: user.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
