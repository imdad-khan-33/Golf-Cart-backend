import Booking from '../models/Booking.js';
import Cart from '../models/Cart.js';
import Rating from '../models/Rating.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res, next) => {
  try {
    const { cartId, pickupDateTime, dropoffDateTime, specialRequests, pickupLocation, dropoffLocation } = req.body;

    // Verify cart exists
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Validate dates
    const pickupDate = new Date(pickupDateTime);
    const dropoffDate = new Date(dropoffDateTime);
    const now = new Date();

    if (pickupDate < now) {
      throw new AppError('Pickup date must be in the future', 400);
    }

    if (dropoffDate <= pickupDate) {
      throw new AppError('Dropoff date must be after pickup date', 400);
    }

    // Calculate duration in hours and total price
    const durationMs = dropoffDate - pickupDate;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    const durationHours = Math.ceil(durationMinutes / 60);
    const totalPrice = cart.price * durationHours;

    // Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      cartId,
      pickupDateTime: pickupDate,
      dropoffDateTime: dropoffDate,
      estimatedDuration: durationMinutes,
      cartPrice: cart.price,
      totalPrice,
      specialRequests: specialRequests || '',
      pickupLocation: pickupLocation || null,
      dropoffLocation: dropoffLocation || null,
      status: 'Pending'
    });

    const populatedBooking = await booking.populate('cartId', 'name seats price type');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        _id: populatedBooking._id,
        cartId: populatedBooking.cartId,
        pickupDateTime: populatedBooking.pickupDateTime,
        dropoffDateTime: populatedBooking.dropoffDateTime,
        pickupLocation: populatedBooking.pickupLocation,
        dropoffLocation: populatedBooking.dropoffLocation,
        estimatedDuration: populatedBooking.estimatedDuration,
        cartPrice: populatedBooking.cartPrice,
        totalPrice: populatedBooking.totalPrice,
        status: populatedBooking.status,
        specialRequests: populatedBooking.specialRequests,
        notes: populatedBooking.notes,
        driverId: populatedBooking.driverId,
        completedAt: populatedBooking.completedAt,
        cancelledAt: populatedBooking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
// Helper function to get driver average rating
const getDriverRating = async (driverId) => {
  try {
    const ratings = await Rating.find({ driverId });
    if (ratings.length === 0) return 0;
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return Math.round(avgRating * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    return 0;
  }
};

// Helper function to group bookings by date
const groupByDate = (bookings) => {
  const grouped = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: []
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  bookings.forEach(booking => {
    const bookingDate = new Date(booking.createdAt);
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDateOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (bookingDateOnly.getTime() === todayDateOnly.getTime()) {
      grouped.Today.push(booking);
    } else if (bookingDateOnly.getTime() === yesterdayDateOnly.getTime()) {
      grouped.Yesterday.push(booking);
    } else if (bookingDateOnly > weekAgo) {
      grouped['This Week'].push(booking);
    } else {
      grouped.Older.push(booking);
    }
  });

  return grouped;
};

export const getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('cartId', 'name seats price type')
      .populate('driverId', 'name email')
      .sort('-createdAt');

    // Get ratings for each driver
    const bookingsWithRatings = await Promise.all(
      bookings.map(async (booking) => {
        let driverRating = 0;
        if (booking.driverId) {
          driverRating = await getDriverRating(booking.driverId._id);
        }

        return {
          _id: booking._id,
          cartId: booking.cartId,
          pickupDateTime: booking.pickupDateTime,
          dropoffDateTime: booking.dropoffDateTime,
          estimatedDuration: booking.estimatedDuration,
          cartPrice: booking.cartPrice,
          totalPrice: booking.totalPrice,
          status: booking.status,
          specialRequests: booking.specialRequests,
          notes: booking.notes,
          driver: booking.driverId ? {
            _id: booking.driverId._id,
            name: booking.driverId.name,
            email: booking.driverId.email,
            rating: driverRating
          } : null,
          completedAt: booking.completedAt,
          cancelledAt: booking.cancelledAt,
          createdAt: booking.createdAt
        };
      })
    );

    // Group bookings by date
    const groupedBookings = groupByDate(bookingsWithRatings);

    // Filter out empty groups and maintain order
    const groupedResult = {};
    ['Today', 'Yesterday', 'This Week', 'Older'].forEach(key => {
      if (groupedBookings[key].length > 0) {
        groupedResult[key] = groupedBookings[key];
      }
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      grouped: groupedResult,
      bookings: bookingsWithRatings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('cartId', 'name seats price type');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to view this booking', 403);
    }

    res.status(200).json({
      success: true,
      booking: {
        _id: booking._id,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        estimatedDuration: booking.estimatedDuration,
        cartPrice: booking.cartPrice,
        totalPrice: booking.totalPrice,
        status: booking.status,
        specialRequests: booking.specialRequests,
        notes: booking.notes,
        driverId: booking.driverId,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   POST /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to cancel this booking', 403);
    }

    // Can only cancel Pending or Confirmed bookings
    if (!['Pending', 'Confirmed'].includes(booking.status)) {
      throw new AppError(`Cannot cancel a ${booking.status} booking`, 400);
    }

    booking.status = 'Cancelled';
    booking.cancelledAt = new Date();
    booking = await booking.save();

    await booking.populate('cartId', 'name seats price type');

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        _id: booking._id,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        estimatedDuration: booking.estimatedDuration,
        cartPrice: booking.cartPrice,
        totalPrice: booking.totalPrice,
        status: booking.status,
        specialRequests: booking.specialRequests,
        notes: booking.notes,
        driverId: booking.driverId,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (Admin)
// @route   PUT /api/bookings/:id
// @access  Private/Admin
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const validStatus = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
    if (status && !validStatus.includes(status)) {
      throw new AppError(`Status must be one of: ${validStatus.join(', ')}`, 400);
    }

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (status) {
      booking.status = status;
      
      // Set timestamps for status changes
      if (status === 'Completed') {
        booking.completedAt = new Date();
        // Only update driverId if not already set (preserve original driver assignment)
        if (!booking.driverId) {
          booking.driverId = req.user._id;
        }
      } else if (status === 'Cancelled') {
        booking.cancelledAt = new Date();
      }
    }
    
    if (notes) booking.notes = notes;

    booking = await booking.save();
    await booking.populate('cartId', 'name seats price type');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        _id: booking._id,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        estimatedDuration: booking.estimatedDuration,
        cartPrice: booking.cartPrice,
        totalPrice: booking.totalPrice,
        status: booking.status,
        specialRequests: booking.specialRequests,
        notes: booking.notes,
        driverId: booking.driverId,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings/admin/all
// @access  Private/Admin
export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('cartId', 'name seats price type')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookings.map(booking => ({
        _id: booking._id,
        userId: booking.userId,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        estimatedDuration: booking.estimatedDuration,
        cartPrice: booking.cartPrice,
        totalPrice: booking.totalPrice,
        status: booking.status,
        specialRequests: booking.specialRequests,
        notes: booking.notes,
        driverId: booking.driverId,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking statistics (Admin)
// @route   GET /api/bookings/admin/stats
// @access  Private/Admin
export const getBookingStats = async (req, res, next) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'Pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'Confirmed' });
    const activeBookings = await Booking.countDocuments({ status: 'Active' });
    const completedBookings = await Booking.countDocuments({ completedAt: { $ne: null } });
    const cancelledBookings = await Booking.countDocuments({ status: 'Cancelled' });

    const totalRevenue = await Booking.aggregate([
      { $match: { completedAt: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign driver to booking (Admin only)
// @route   PUT /api/bookings/:id/assign-driver
// @access  Private/Admin
export const assignDriverToBooking = async (req, res, next) => {
  try {
    const { id: bookingId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      throw new AppError('Please provide driver ID', 400);
    }

    // Verify booking exists
    let booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Verify driver exists
    const driver = await User.findById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Check if booking is already accepted or completed
    if (booking.status === 'Active' || booking.status === 'Completed') {
      throw new AppError(`Cannot assign driver to ${booking.status} booking`, 400);
    }

    // Assign driver and update status to Confirmed
    booking.driverId = driverId;
    booking.status = 'Confirmed';
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Driver assigned to booking successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver accepts booking
// @route   PUT /api/bookings/:id/accept
// @access  Private (Driver)
export const acceptBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify booking exists
    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if driver is assigned to this booking
    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    // Check booking status
    if (booking.status !== 'Confirmed') {
      throw new AppError(`Booking must be Confirmed to accept. Current status: ${booking.status}`, 400);
    }

    // Accept booking and mark as Active
    booking.status = 'Active';
    booking.driverAcceptedAt = new Date();
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver starts trip
// @route   PUT /api/bookings/:id/start-trip
// @access  Private (Driver)
export const startTrip = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify booking exists
    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if driver is assigned to this booking
    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    // Check if driver accepted booking
    if (!booking.driverAcceptedAt) {
      throw new AppError('Must accept booking before starting trip', 400);
    }

    // Start trip
    booking.status = 'Active';
    booking.tripStartedAt = new Date();
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Trip started successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver completes trip
// @route   PUT /api/bookings/:id/complete-trip
// @access  Private (Driver)
export const completeTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Verify booking exists
    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if driver is assigned to this booking
    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    // Check if trip is active
    if (booking.status !== 'Active') {
      throw new AppError(`Trip must be Active to complete. Current status: ${booking.status}`, 400);
    }

    // Complete trip
    booking.status = 'Completed';
    booking.completedAt = new Date();
    if (notes) {
      booking.notes = notes;
    }
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Trip completed successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};
