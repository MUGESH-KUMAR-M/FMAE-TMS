const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/responses');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));
    return ApiResponse.badRequest(res, 'Validation failed', formattedErrors);
  }
  next();
};

module.exports = handleValidationErrors;
