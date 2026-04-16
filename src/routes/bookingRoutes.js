import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
  getAllBookings,
  getBookingStats,
  assignDriverToBooking,
  acceptBooking,
  startTrip,
  completeTrip
} from '../controllers/bookingController.js';
import { protect, authorize, isDriverOrAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingByIdSchema
} from '../validators/validationSchemas.js';

const router = express.Router();

// All booking routes are protected (require authentication)
router.use(protect);

// Admin routes (must come BEFORE generic :id routes)
router.get('/admin/all', authorize('driver'), getAllBookings);
router.get('/admin/stats', authorize('driver'), getBookingStats);

// Driver workflow routes
router.put('/:id/assign-driver', authorize('driver'), assignDriverToBooking);
router.put('/:id/accept', authorize('driver'), acceptBooking);
router.put('/:id/start-trip', authorize('driver'), startTrip);
router.put('/:id/complete-trip', authorize('driver'), completeTrip);

// User routes
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);
router.get('/:id', validate(bookingByIdSchema), getBookingById);
router.post('/:id/cancel', validate(bookingByIdSchema), cancelBooking);

// Admin routes
router.put('/:id', authorize('driver'), validate(updateBookingStatusSchema), updateBookingStatus);

export default router;
