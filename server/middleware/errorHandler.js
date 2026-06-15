function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const prod = process.env.NODE_ENV === 'production';
  const message =
    prod && status >= 500 ? 'Internal server error' : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
