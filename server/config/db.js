const mongoose = require('mongoose');
const User = require('../models/User');

async function connectDb() {
  // Production should always set MONGODB_URI, but we provide a local fallback
  // to avoid hard crashes when the env file isn't loaded.
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chat-app';
  await mongoose.connect(uri);

  // Seed system chatbot user if it doesn't exist
  const email = 'chatbot@system.local';
  const chatbot = await User.findOne({ email });
  if (!chatbot) {
    console.log('Seeding system chatbot user...');
    await User.create({
      email,
      username: 'AI Chatbot',
      password: 'system-chatbot-secret-password-12345678',
    });
  }
}

module.exports = { connectDb };
