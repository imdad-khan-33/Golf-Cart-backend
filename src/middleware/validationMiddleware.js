import { AppError } from '../middleware/errorHandler.js';

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Parse request data (body, params, query)
      const dataToValidate = {
        body: req.body,
        params: req.params,
        query: req.query
      };

      // Validate against schema
      const validationResult = schema.safeParse(dataToValidate);

      if (!validationResult.success) {
        // Format Zod errors into readable message
        const errors = (validationResult.error?.errors || [])
          .map(err => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
          });

        const errorMsg = errors.length > 0 
          ? errors.join(' | ')
          : 'Validation Error: Invalid input data';

        throw new AppError(errorMsg, 400);
      }

      // Validation successful, continue
      next();
    } catch (error) {
      next(error);
    }
  };
};
