import express from 'express';
import {
  submitRating,
  submitDriverRating,
  getRatingByBooking,
  getDriverAverageRating,
  getAllRatings,
  getUserRatings
} from '../controllers/ratingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  submitRatingSchema,
  ratingByBookingSchema,
  driverIdSchema
} from '../validators/validationSchemas.js';

const router = express.Router();

// Public routes
router.get('/driver/:driverId', validate(driverIdSchema), getDriverAverageRating);

// Protected routes (User & Driver)
router.post('/', protect, authorize('user'), validate(submitRatingSchema), submitRating);
router.post('/driver-rating', protect, authorize('driver'), validate(submitRatingSchema), submitDriverRating);
router.get('/my-ratings', protect, authorize('user', 'driver'), getUserRatings);
router.get('/booking/:bookingId', protect, validate(ratingByBookingSchema), getRatingByBooking);

// Driver admin routes
router.get('/admin/all', protect, authorize('driver'), getAllRatings);

export default router;
