import mongoose from 'mongoose';
import Rating from '../models/Rating.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Submit rating and review
// @route   POST /api/ratings
// @access  Private
export const submitRating = async (req, res, next) => {
  try {
    const { bookingId, rating, review, cleanliness, behavior, safety } = req.body;

    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if user owns this booking
    if (!booking.userId || booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to rate this booking', 403);
    }

    // Check if booking is completed
    if (booking.completedAt === null) {
      throw new AppError('Cannot rate incomplete booking', 400);
    }

    // Check if already rated by user
    const existingRating = await Rating.findOne({ bookingId, ratingType: 'user-to-driver' });
    if (existingRating) {
      throw new AppError('You have already rated this booking', 400);
    }

    // Create rating
    const newRating = await Rating.create({
      bookingId,
      ratedBy: req.user._id,
      ratedTo: booking.driverId,
      ratingType: 'user-to-driver',
      userId: booking.userId,
      driverId: booking.driverId,
      rating,
      review: review || '',
      cleanliness: cleanliness || null,
      behavior: behavior || null,
      safety: safety || null
    });

    await newRating.populate([
      { path: 'bookingId', select: 'cartId totalPrice' },
      { path: 'ratedBy', select: 'name email' },
      { path: 'ratedTo', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: {
        _id: newRating._id,
        bookingId: newRating.bookingId,
        ratingType: 'user-to-driver',
        ratedBy: newRating.ratedBy,
        ratedTo: newRating.ratedTo,
        rating: newRating.rating,
        review: newRating.review,
        cleanliness: newRating.cleanliness,
        behavior: newRating.behavior,
        safety: newRating.safety,
        createdAt: newRating.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit driver rating for user
// @route   POST /api/ratings/driver-rating
// @access  Private (Driver)
export const submitDriverRating = async (req, res, next) => {
  try {
    const { bookingId, rating, review, cleanliness, behavior, safety } = req.body;

    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if driver owns this booking
    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    // Check if booking is completed
    if (booking.completedAt === null) {
      throw new AppError('Cannot rate incomplete booking', 400);
    }

    // Check if driver already rated
    const existingRating = await Rating.findOne({ bookingId, ratingType: 'driver-to-user' });
    if (existingRating) {
      throw new AppError('You have already rated this booking', 400);
    }

    // Create rating
    const newRating = await Rating.create({
      bookingId,
      ratedBy: req.user._id,
      ratedTo: booking.userId,
      ratingType: 'driver-to-user',
      userId: booking.userId,
      driverId: booking.driverId,
      rating,
      review: review || '',
      cleanliness: cleanliness || null,
      behavior: behavior || null,
      safety: safety || null
    });

    await newRating.populate([
      { path: 'bookingId', select: 'cartId totalPrice' },
      { path: 'ratedBy', select: 'name email' },
      { path: 'ratedTo', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Driver rating submitted successfully',
      rating: {
        _id: newRating._id,
        bookingId: newRating.bookingId,
        ratingType: 'driver-to-user',
        ratedBy: newRating.ratedBy,
        ratedTo: newRating.ratedTo,
        rating: newRating.rating,
        review: newRating.review,
        cleanliness: newRating.cleanliness,
        behavior: newRating.behavior,
        safety: newRating.safety,
        createdAt: newRating.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all ratings for a booking (both user-to-driver and driver-to-user)
// @route   GET /api/ratings/booking/:bookingId
// @access  Private
export const getRatingByBooking = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ bookingId: req.params.bookingId })
      .populate('userId', 'name email')
      .populate('driverId', 'name email')
      .populate('bookingId')
      .sort('ratingType');

    if (ratings.length === 0) {
      throw new AppError('No ratings found for this booking', 404);
    }

    res.status(200).json({
      success: true,
      count: ratings.length,
      ratings: ratings.map(rating => ({
        _id: rating._id,
        bookingId: rating.bookingId,
        ratingType: rating.ratingType,
        ratedBy: rating.ratedBy,
        ratedTo: rating.ratedTo,
        userId: rating.userId,
        driverId: rating.driverId,
        rating: rating.rating,
        review: rating.review,
        cleanliness: rating.cleanliness,
        behavior: rating.behavior,
        safety: rating.safety,
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get average rating for driver
// @route   GET /api/ratings/driver/:driverId
// @access  Public
export const getDriverAverageRating = async (req, res, next) => {
  try {
    const ratingData = await Rating.aggregate([
      { $match: { 
          driverId: new mongoose.Types.ObjectId(req.params.driverId),
          ratingType: 'user-to-driver'
        } 
      },
      {
        $group: {
          _id: '$driverId',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          averageCleanliness: { $avg: '$cleanliness' },
          averageBehavior: { $avg: '$behavior' },
          averageSafety: { $avg: '$safety' }
        }
      }
    ]);

    if (ratingData.length === 0) {
      return res.status(200).json({
        success: true,
        rating: {
          averageRating: 0,
          totalRatings: 0,
          averageCleanliness: 0,
          averageBehavior: 0,
          averageSafety: 0
        }
      });
    }

    const stats = ratingData[0];
    res.status(200).json({
      success: true,
      rating: {
        averageRating: stats.averageRating.toFixed(2),
        totalRatings: stats.totalRatings,
        averageCleanliness: stats.averageCleanliness?.toFixed(2) || 0,
        averageBehavior: stats.averageBehavior?.toFixed(2) || 0,
        averageSafety: stats.averageSafety?.toFixed(2) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all ratings (Admin)
// @route   GET /api/ratings/admin/all
// @access  Private/Admin
export const getAllRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find()
      .populate('userId', 'name email')
      .populate('driverId', 'name email')
      .populate('bookingId')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: ratings.length,
      ratings: ratings.map(rating => ({
        _id: rating._id,
        bookingId: rating.bookingId,
        userId: rating.userId,
        driverId: rating.driverId,
        rating: rating.rating,
        review: rating.review,
        cleanliness: rating.cleanliness,
        behavior: rating.behavior,
        safety: rating.safety,
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's ratings (User's own reviews)
// @route   GET /api/ratings/my-ratings
// @access  Private
export const getUserRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ userId: req.user._id })
      .populate('bookingId')
      .populate('driverId', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: ratings.length,
      ratings: ratings.map(rating => ({
        _id: rating._id,
        bookingId: rating.bookingId,
        driverId: rating.driverId,
        rating: rating.rating,
        review: rating.review,
        cleanliness: rating.cleanliness,
        behavior: rating.behavior,
        safety: rating.safety,
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};
