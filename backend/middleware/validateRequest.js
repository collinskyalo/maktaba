/**
 * Maktaba — middleware/validateRequest.js
 * Lightweight request-body validator. Pass a function that inspects
 * req.body and returns an array of human-readable error strings (empty
 * array = valid). Keeps validation logic next to each route without
 * pulling in a full schema-validation library yet.
 *
 * Example:
 *   router.post('/register', validate(validateRegisterBody), authController.register);
 */

const { fail } = require('../utils/response');

function validate(validatorFn) {
  return (req, res, next) => {
    const errors = validatorFn(req.body || {});
    if (errors && errors.length > 0) {
      return fail(res, 'Validation failed', 422, errors);
    }
    return next();
  };
}

module.exports = validate;
