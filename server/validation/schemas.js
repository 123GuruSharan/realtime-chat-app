const Joi = require('joi');

const register = Joi.object({
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().min(8).max(128).required(),
  username: Joi.string().trim().min(1).max(40).required(),
});

const login = Joi.object({
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().required(),
});

const createRoom = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  type: Joi.string().valid('public', 'private', 'chatbot').required(),
});

const joinRoom = Joi.object({
  roomId: Joi.string().hex().length(24).required(),
  inviteCode: Joi.string().trim().max(32).allow('').optional(),
});

const validateInvite = Joi.object({
  code: Joi.string().trim().min(4).max(32).required(),
});

const messagesQuery = Joi.object({
  roomId: Joi.string().hex().length(24).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

module.exports = {
  register,
  login,
  createRoom,
  joinRoom,
  validateInvite,
  messagesQuery,
};
