const User = require('../models/User');
const { signToken } = require('../utils/jwt');

async function register(req, res, next) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password, and username are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create({ email, password, username: username.trim() });
    
    // Auto-create a chatbot room for the user
    try {
      const chatbotUser = await User.findOne({ email: 'chatbot@system.local' });
      if (chatbotUser) {
        const Room = require('../models/Room');
        await Room.create({
          name: 'AI Chatbot',
          createdBy: user._id,
          type: 'chatbot',
          members: [
            { userId: user._id, role: 'admin' },
            { userId: chatbotUser._id, role: 'member' }
          ]
        });
      }
    } catch (roomErr) {
      console.error('Failed to auto-create chatbot room:', roomErr);
    }

    const token = signToken({ userId: user._id.toString() });
    res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email, username: user.username },
    });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ userId: user._id.toString() });
    res.json({
      token,
      user: { id: user._id.toString(), email: user.email, username: user.username },
    });
  } catch (e) {
    next(e);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
