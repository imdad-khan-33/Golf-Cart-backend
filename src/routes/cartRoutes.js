import express from 'express';
import {
  getAllCarts,
  getCartById,
  getCartsByType,
  createCart,
  updateCart,
  deleteCart
} from '../controllers/cartController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createCartSchema,
  updateCartSchema,
  cartByTypeSchema,
  cartByIdSchema
} from '../validators/validationSchemas.js';

const router = express.Router();

// Public routes
router.get('/', getAllCarts);
router.get('/:id', validate(cartByIdSchema), getCartById);
router.get('/type/:name', validate(cartByTypeSchema), getCartsByType);

// Protected/Admin routes (only admins can create, update, delete)
router.post('/', protect, authorize('driver'), validate(createCartSchema), createCart);
router.put('/:id', protect, authorize('driver'), validate(updateCartSchema), updateCart);
router.delete('/:id', protect, authorize('driver'), validate(cartByIdSchema), deleteCart);

export default router;
