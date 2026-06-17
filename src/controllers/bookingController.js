import Booking from '../models/Booking.js';
import Cart from '../models/Cart.js';
import Rating from '../models/Rating.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { notificationService } from '../utils/notificationService.js';

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res, next) => {
  try {
    const { cartId, pickupDateTime, dropoffDateTime, specialRequests, pickupLocation, dropoffLocation } = req.body;

    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    const pickupDate = new Date(pickupDateTime);
    const dropoffDate = new Date(dropoffDateTime);
    const now = new Date();

    if (pickupDate < now) {
      throw new AppError('Pickup date must be in the future', 400);
    }

    if (dropoffDate <= pickupDate) {
      throw new AppError('Dropoff date must be after pickup date', 400);
    }

    const durationMs = dropoffDate - pickupDate;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    const durationHours = Math.ceil(durationMinutes / 60);
    const totalPrice = cart.price * durationHours;

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

    const populatedBooking = await booking.populate([
      { path: 'cartId', select: 'name seats price type' }
    ]);

    // Get fresh user info with profileImage and phoneNumber
    const bookingUser = await User.findById(req.user._id).select('name email phoneNumber profileImage');

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendNewBooking(io, {
        _id: populatedBooking._id,
        userId: req.user._id,
        userName: req.user.name,
        cartId: populatedBooking.cartId._id,
        cartName: populatedBooking.cartId.name,
        pickupDateTime: populatedBooking.pickupDateTime,
        pickupLocation: populatedBooking.pickupLocation,
        dropoffDateTime: populatedBooking.dropoffDateTime,
        dropoffLocation: populatedBooking.dropoffLocation,
        status: populatedBooking.status,
        totalPrice: populatedBooking.totalPrice,
        specialRequests: populatedBooking.specialRequests,
        createdAt: populatedBooking.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        _id: populatedBooking._id,
        user: {
          _id: bookingUser._id,
          name: bookingUser.name,
          email: bookingUser.email,
          phoneNumber: bookingUser.phoneNumber || null,
          profileImage: bookingUser.profileImage || null
        },
        cartId: populatedBooking.cartId,
        pickupDateTime: populatedBooking.pickupDateTime,
        dropoffDateTime: populatedBooking.dropoffDateTime,
        pickupLocation: populatedBooking.pickupLocation,
        dropoffLocation: populatedBooking.dropoffLocation,
        driverLocation: populatedBooking.driverLocation || null,
        estimatedDuration: populatedBooking.estimatedDuration,
        cartPrice: populatedBooking.cartPrice,
        totalPrice: populatedBooking.totalPrice,
        status: populatedBooking.status,
        specialRequests: populatedBooking.specialRequests,
        notes: populatedBooking.notes,
        driver: null,
        driverArrivedAt: populatedBooking.driverArrivedAt,
        completedAt: populatedBooking.completedAt,
        cancelledAt: populatedBooking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper: get driver average rating
const getDriverRating = async (driverId) => {
  try {
    const ratings = await Rating.find({ driverId });
    if (ratings.length === 0) return 0;
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return Math.round(avgRating * 10) / 10;
  } catch (error) {
    return 0;
  }
};

// Helper: group bookings by date
const groupByDate = (bookings) => {
  const grouped = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  bookings.forEach(booking => {
    const d = new Date(booking.createdAt);
    const bd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (bd.getTime() === td.getTime()) {
      grouped.Today.push(booking);
    } else if (bd.getTime() === yd.getTime()) {
      grouped.Yesterday.push(booking);
    } else if (bd > weekAgo) {
      grouped['This Week'].push(booking);
    } else {
      grouped.Older.push(booking);
    }
  });

  return grouped;
};

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('cartId', 'name seats price type')
      .populate('driverId', 'name email phoneNumber profileImage')
      .sort('-createdAt');

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
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          driverLocation: booking.driverLocation || null,
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
            phoneNumber: booking.driverId.phoneNumber || null,
            profileImage: booking.driverId.profileImage || null,
            rating: driverRating
          } : null,
          driverArrivedAt: booking.driverArrivedAt,
          completedAt: booking.completedAt,
          cancelledAt: booking.cancelledAt,
          createdAt: booking.createdAt
        };
      })
    );

    const groupedBookings = groupByDate(bookingsWithRatings);
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
      .populate('cartId', 'name seats price type')
      .populate('driverId', 'name email phoneNumber profileImage');

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

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
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        driverLocation: booking.driverLocation || null,
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
          phoneNumber: booking.driverId.phoneNumber || null,
          profileImage: booking.driverId.profileImage || null
        } : null,
        driverArrivedAt: booking.driverArrivedAt,
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
    const { reason } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to cancel this booking', 403);
    }

    // Cannot cancel if already terminal
    if (booking.status === 'Cancelled') {
      throw new AppError('Booking is already cancelled', 400);
    }
    if (booking.status === 'Completed') {
      throw new AppError('Cannot cancel a completed booking', 400);
    }

    // Driver is considered arrived if any arrival/trip indicator is set
    const driverHasArrived =
      booking.driverArrivedAt != null ||
      booking.status === 'Arrived' ||
      booking.tripStartedAt != null ||
      booking.completedAt != null;

    if (driverHasArrived) {
      throw new AppError('Cannot cancel after driver has arrived at pickup location', 400);
    }

    booking.status = 'Cancelled';
    booking.cancelledAt = new Date();
    if (reason) {
      booking.notes = reason;
    }
    booking = await booking.save();

    await booking.populate('cartId', 'name seats price type');

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendBookingCancelled(io, {
        _id: booking._id,
        driverId: booking.driverId,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        cancelledBy: 'user',
        reason: reason || null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        _id: booking._id,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        estimatedDuration: booking.estimatedDuration,
        cartPrice: booking.cartPrice,
        totalPrice: booking.totalPrice,
        status: booking.status,
        specialRequests: booking.specialRequests,
        notes: booking.notes,
        driverId: booking.driverId,
        driverArrivedAt: booking.driverArrivedAt,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (Admin/Driver)
// @route   PUT /api/bookings/:id
// @access  Private/Admin or Driver
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, notes, driverId, driverArrivedAt, tripStartedAt } = req.body;

    const validStatus = ['Pending', 'Confirmed', 'Arrived', 'Active', 'Completed', 'Cancelled'];
    if (status && !validStatus.includes(status)) {
      throw new AppError(`Status must be one of: ${validStatus.join(', ')}`, 400);
    }

    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // ── Driver arrival detection ──────────────────────────────────────────────
    // Triggered when:
    //   - notes contains "Driver arrived", OR
    //   - status === "Arrived", OR
    //   - driverArrivedAt is provided in the payload
    const notesIndicatesArrival = typeof notes === 'string' &&
      notes.toLowerCase().includes('driver arrived');

    const isArrivalUpdate =
      notesIndicatesArrival ||
      status === 'Arrived' ||
      driverArrivedAt != null;

    if (isArrivalUpdate) {
      booking.status = 'Arrived';
      booking.driverArrivedAt = driverArrivedAt ? new Date(driverArrivedAt) : new Date();
      if (driverId) booking.driverId = driverId;
      if (notes) booking.notes = notes;

      booking = await booking.save();

      await booking.populate([
        { path: 'cartId', select: 'name seats price type' },
        { path: 'driverId', select: 'name email' }
      ]);

      const io = req.app.locals.io;
      if (io) {
        notificationService.sendDriverArrived(io, {
          _id: booking._id,
          driverId: booking.driverId?._id || booking.driverId,
          driverName: booking.driverId?.name || null,
          driverLocation: booking.driverLocation,
          pickupLocation: booking.pickupLocation,
          status: booking.status,
          driverArrivedAt: booking.driverArrivedAt
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Driver arrived status updated',
        booking: _formatBooking(booking)
      });
    }

    // ── General status update ─────────────────────────────────────────────────
    if (status) {
      booking.status = status;

      if (status === 'Completed') {
        booking.completedAt = new Date();
        if (!booking.driverId) booking.driverId = req.user._id;
      } else if (status === 'Cancelled') {
        booking.cancelledAt = new Date();
      }
    }

    if (notes) booking.notes = notes;
    if (driverId) booking.driverId = driverId;
    if (driverArrivedAt) booking.driverArrivedAt = new Date(driverArrivedAt);
    if (tripStartedAt) booking.tripStartedAt = new Date(tripStartedAt);

    booking = await booking.save();
    await booking.populate('cartId', 'name seats price type');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: _formatBooking(booking)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver location via HTTP
// @route   PUT /api/bookings/:id/driver-location
// @access  Private (Driver)
export const updateDriverLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, heading = null, speed = null } = req.body;

    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Only the assigned driver may update location
    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    if (['Completed', 'Cancelled'].includes(booking.status)) {
      throw new AppError(`Cannot update location for a ${booking.status} booking`, 400);
    }

    const location = { latitude, longitude, heading, speed, updatedAt: new Date() };
    booking.driverLocation = location;
    await booking.save();

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendLocationUpdate(io, {
        bookingId: booking._id,
        driverId: req.user._id,
        latitude,
        longitude,
        heading,
        speed,
        updatedAt: location.updatedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver location updated',
      driverLocation: location
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
      .populate('userId', 'name email phoneNumber profileImage')
      .populate('cartId', 'name seats price type')
      .populate('driverId', 'name email phoneNumber profileImage')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookings.map(b => ({
        _id: b._id,
        user: b.userId ? {
          _id: b.userId._id,
          name: b.userId.name,
          email: b.userId.email,
          phoneNumber: b.userId.phoneNumber || null,
          profileImage: b.userId.profileImage || null
        } : null,
        cartId: b.cartId,
        pickupDateTime: b.pickupDateTime,
        dropoffDateTime: b.dropoffDateTime,
        pickupLocation: b.pickupLocation,
        dropoffLocation: b.dropoffLocation,
        driverLocation: b.driverLocation || null,
        estimatedDuration: b.estimatedDuration,
        cartPrice: b.cartPrice,
        totalPrice: b.totalPrice,
        status: b.status,
        specialRequests: b.specialRequests,
        notes: b.notes,
        driver: b.driverId ? {
          _id: b.driverId._id,
          name: b.driverId.name,
          email: b.driverId.email,
          phoneNumber: b.driverId.phoneNumber || null,
          profileImage: b.driverId.profileImage || null
        } : null,
        driverArrivedAt: b.driverArrivedAt,
        completedAt: b.completedAt,
        cancelledAt: b.cancelledAt
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
    const arrivedBookings = await Booking.countDocuments({ status: 'Arrived' });
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
        arrivedBookings,
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

    let booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.driverId) {
      throw new AppError('Booking is already assigned to a driver', 400);
    }

    const driver = await User.findById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    if (booking.status === 'Active' || booking.status === 'Completed') {
      throw new AppError(`Cannot assign driver to ${booking.status} booking`, 400);
    }

    booking.driverId = driverId;
    booking.status = 'Confirmed';
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email phoneNumber profileImage' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email phoneNumber profileImage' }
    ]);

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendBookingAssigned(io, {
        _id: booking._id,
        driverId: booking.driverId._id,
        driverName: booking.driverId.name,
        cartId: booking.cartId._id,
        cartName: booking.cartId.name,
        pickupLocation: booking.pickupLocation,
        pickupDateTime: booking.pickupDateTime,
        dropoffLocation: booking.dropoffLocation,
        dropoffDateTime: booking.dropoffDateTime,
        totalPrice: booking.totalPrice,
        specialRequests: booking.specialRequests,
        status: booking.status
      });
    }

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
    const driverId = req.user._id;

    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (!booking.driverId || booking.driverId.toString() !== driverId.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    if (booking.driverAcceptedAt) {
      throw new AppError('You have already accepted this booking', 400);
    }

    if (booking.status !== 'Confirmed') {
      throw new AppError(`Booking must be Confirmed to accept. Current status: ${booking.status}`, 400);
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { $set: { status: 'Active', driverAcceptedAt: new Date() } },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      throw new AppError('Failed to accept booking', 500);
    }

    booking = await updatedBooking.populate([
      { path: 'userId', select: 'name email phoneNumber profileImage' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email phoneNumber profileImage' }
    ]);

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendBookingAccepted(io, {
        _id: booking._id,
        driverId: booking.driverId._id,
        driverName: booking.driverId.name,
        status: booking.status,
        driverAcceptedAt: booking.driverAcceptedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking: {
        _id: booking._id,
        user: booking.userId ? {
          _id: booking.userId._id,
          name: booking.userId.name,
          email: booking.userId.email,
          phoneNumber: booking.userId.phoneNumber || null,
          profileImage: booking.userId.profileImage || null
        } : null,
        cartId: booking.cartId,
        pickupDateTime: booking.pickupDateTime,
        dropoffDateTime: booking.dropoffDateTime,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        driverLocation: booking.driverLocation || null,
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
          phoneNumber: booking.driverId.phoneNumber || null,
          profileImage: booking.driverId.profileImage || null
        } : null,
        driverAcceptedAt: booking.driverAcceptedAt,
        driverArrivedAt: booking.driverArrivedAt,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt
      }
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

    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    if (!booking.driverAcceptedAt) {
      throw new AppError('Must accept booking before starting trip', 400);
    }

    booking.status = 'Active';
    booking.tripStartedAt = new Date();
    // Ensure driverArrivedAt is stamped when trip starts (locks out user cancellation)
    if (!booking.driverArrivedAt) {
      booking.driverArrivedAt = new Date();
    }
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email phoneNumber profileImage' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email phoneNumber profileImage' }
    ]);

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendTripStarted(io, {
        _id: booking._id,
        driverId: booking.driverId._id,
        driverName: booking.driverId.name,
        status: booking.status,
        tripStartedAt: booking.tripStartedAt,
        pickupDateTime: booking.pickupDateTime
      });
    }

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

    let booking = await Booking.findById(id);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (!booking.driverId || booking.driverId.toString() !== req.user._id.toString()) {
      throw new AppError('Not assigned to this booking', 403);
    }

    if (booking.status !== 'Active') {
      throw new AppError(`Trip must be Active to complete. Current status: ${booking.status}`, 400);
    }

    booking.status = 'Completed';
    booking.completedAt = new Date();
    if (notes) booking.notes = notes;
    await booking.save();

    booking = await booking.populate([
      { path: 'userId', select: 'name email phoneNumber profileImage' },
      { path: 'cartId', select: 'name price' },
      { path: 'driverId', select: 'name email phoneNumber profileImage' }
    ]);

    const io = req.app.locals.io;
    if (io) {
      notificationService.sendTripCompleted(io, {
        _id: booking._id,
        driverId: booking.driverId._id,
        driverName: booking.driverId.name,
        status: booking.status,
        completedAt: booking.completedAt,
        totalPrice: booking.totalPrice,
        estimatedDuration: booking.estimatedDuration,
        notes: booking.notes
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip completed successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

// ─── Private helper ───────────────────────────────────────────────────────────
const _formatBooking = (booking) => ({
  _id: booking._id,
  cartId: booking.cartId,
  pickupDateTime: booking.pickupDateTime,
  dropoffDateTime: booking.dropoffDateTime,
  pickupLocation: booking.pickupLocation,
  dropoffLocation: booking.dropoffLocation,
  driverLocation: booking.driverLocation || null,
  estimatedDuration: booking.estimatedDuration,
  cartPrice: booking.cartPrice,
  totalPrice: booking.totalPrice,
  status: booking.status,
  specialRequests: booking.specialRequests,
  notes: booking.notes,
  driverId: booking.driverId,
  driverArrivedAt: booking.driverArrivedAt,
  completedAt: booking.completedAt,
  cancelledAt: booking.cancelledAt
});
