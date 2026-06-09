
export const notificationService = {
  /**
   * Send new booking notification to admin and available drivers
   */
  sendNewBooking(io, bookingData) {
    if (!io) return;

    const payload = {
      bookingId: bookingData._id,
      _id: bookingData._id,
      userId: bookingData.userId,
      userName: bookingData.userName,
      cartId: bookingData.cartId,
      cartName: bookingData.cartName,
      pickupDateTime: bookingData.pickupDateTime,
      pickupLocation: bookingData.pickupLocation,
      dropoffDateTime: bookingData.dropoffDateTime,
      dropoffLocation: bookingData.dropoffLocation,
      status: bookingData.status,
      totalPrice: bookingData.totalPrice,
      specialRequests: bookingData.specialRequests || null,
      createdAt: bookingData.createdAt,
      timestamp: new Date(),
      message: 'New booking received',
      type: 'NEW_BOOKING'
    };

    // Notify admins
    io.to('admin:notifications').emit('new:booking', payload);

    // Notify available drivers so they can accept offers
    io.to('drivers:available').emit('new:booking', payload);
  },

  /**
   * Send booking assigned notification to driver
   */
  sendBookingAssigned(io, bookingData) {
    if (!io) return;

    // Notify driver
    io.to(`driver:${bookingData.driverId}`).emit('booking:assigned', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      cartId: bookingData.cartId,
      cartName: bookingData.cartName,
      pickupLocation: bookingData.pickupLocation,
      pickupDateTime: bookingData.pickupDateTime,
      dropoffLocation: bookingData.dropoffLocation,
      dropoffDateTime: bookingData.dropoffDateTime,
      totalPrice: bookingData.totalPrice,
      specialRequests: bookingData.specialRequests,
      status: bookingData.status,
      timestamp: new Date(),
      message: 'New booking assigned to you',
      type: 'BOOKING_ASSIGNED'
    });

    // Notify admin
    io.to('admin:notifications').emit('driver:assigned', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      message: `Booking assigned to ${bookingData.driverName}`,
      timestamp: new Date(),
      type: 'DRIVER_ASSIGNED'
    });
  },

  /**
   * Send booking accepted notification
   */
  sendBookingAccepted(io, bookingData) {
    if (!io) return;

    io.to(`booking:${bookingData._id}`).emit('booking:accepted', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      status: bookingData.status,
      driverAcceptedAt: bookingData.driverAcceptedAt,
      timestamp: new Date(),
      message: 'Driver has accepted your booking',
      type: 'BOOKING_ACCEPTED'
    });
  },

  /**
   * Send trip started notification
   */
  sendTripStarted(io, bookingData) {
    if (!io) return;

    io.to(`booking:${bookingData._id}`).emit('trip:started', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      status: bookingData.status,
      tripStartedAt: bookingData.tripStartedAt,
      pickupDateTime: bookingData.pickupDateTime,
      timestamp: new Date(),
      message: 'Trip has started - Driver is on the way',
      type: 'TRIP_STARTED'
    });
  },

  /**
   * Send driver arrived notification
   */
  sendDriverArrived(io, bookingData) {
    if (!io) return;

    io.to(`booking:${bookingData._id}`).emit('driver:arrived', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      driverLocation: bookingData.driverLocation,
      pickupLocation: bookingData.pickupLocation,
      status: bookingData.status,
      driverArrivedAt: bookingData.driverArrivedAt,
      timestamp: new Date(),
      message: 'Driver has arrived at pickup location',
      type: 'DRIVER_ARRIVED'
    });
  },

  /**
   * Send real-time location update
   */
  sendLocationUpdate(io, locationData) {
    if (!io) return;

    io.to(`booking:${locationData.bookingId}`).emit('driver:location', {
      bookingId: locationData.bookingId,
      driverId: locationData.driverId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      heading: locationData.heading || null,
      speed: locationData.speed || null,
      updatedAt: locationData.updatedAt,
      timestamp: new Date(),
      type: 'LOCATION_UPDATE'
    });

    io.to(`driver:${locationData.driverId}`).emit('driver:location', {
      bookingId: locationData.bookingId,
      driverId: locationData.driverId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      heading: locationData.heading || null,
      speed: locationData.speed || null,
      updatedAt: locationData.updatedAt,
      timestamp: new Date(),
      type: 'LOCATION_UPDATE'
    });
  },

  /**
   * Send trip completed notification
   */
  sendTripCompleted(io, bookingData) {
    if (!io) return;

    io.to(`booking:${bookingData._id}`).emit('trip:completed', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      status: bookingData.status,
      completedAt: bookingData.completedAt,
      totalPrice: bookingData.totalPrice,
      estimatedDuration: bookingData.estimatedDuration,
      notes: bookingData.notes,
      timestamp: new Date(),
      message: 'Trip has been completed',
      type: 'TRIP_COMPLETED'
    });

    // Also notify admin
    io.to('admin:notifications').emit('trip:completed', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId,
      driverName: bookingData.driverName,
      totalPrice: bookingData.totalPrice,
      message: 'Trip completed',
      timestamp: new Date(),
      type: 'TRIP_COMPLETED'
    });
  },

  /**
   * Send booking cancelled notification
   * Emits to booking room and driver room with full payload
   */
  sendBookingCancelled(io, bookingData) {
    if (!io) return;

    const payload = {
      bookingId: bookingData._id,
      driverId: bookingData.driverId || null,
      status: bookingData.status,
      cancelledAt: bookingData.cancelledAt,
      cancelledBy: bookingData.cancelledBy, // 'user' or 'admin'
      reason: bookingData.reason || null,
      timestamp: new Date(),
      message: 'Booking has been cancelled',
      type: 'BOOKING_CANCELLED'
    };

    // Notify booking room (user listening to their booking)
    io.to(`booking:${bookingData._id}`).emit('booking:cancelled', payload);

    // Notify assigned driver so they can return to available/offers state
    if (bookingData.driverId) {
      io.to(`driver:${bookingData.driverId}`).emit('booking:cancelled', payload);
    }

    // Notify available drivers too, so pending/offered bookings disappear in real time
    io.to('drivers:available').emit('booking:cancelled', payload);

    // Notify admin
    io.to('admin:notifications').emit('booking:cancelled', {
      bookingId: bookingData._id,
      driverId: bookingData.driverId || null,
      cancelledBy: bookingData.cancelledBy,
      reason: bookingData.reason || null,
      message: 'Booking cancelled',
      timestamp: new Date(),
      type: 'BOOKING_CANCELLED'
    });
  }
};
