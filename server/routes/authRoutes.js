const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validation/schemas');

const router = express.Router();

router.post('/register', authLimiter, validateBody(schemas.register), register);
router.post('/login', authLimiter, validateBody(schemas.login), login);
router.get('/me', authMiddleware, me);

module.exports = router;
