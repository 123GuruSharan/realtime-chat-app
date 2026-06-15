function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const msg = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ error: msg });
    }
    req.body = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const msg = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ error: msg });
    }
    req.query = value;
    next();
  };
}

module.exports = { validateBody, validateQuery };
