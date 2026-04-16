// Format booking response
export const formatBookingResponse = (booking) => {
  const bookingObj = booking.toObject ? booking.toObject() : booking;

  return {
    _id: bookingObj._id,
    userId: bookingObj.userId,
    cartId: bookingObj.cartId,
    pickupLocationId: bookingObj.pickupLocationId,
    dropoffLocationId: bookingObj.dropoffLocationId,
    pickupDateTime: bookingObj.pickupDateTime,
    dropoffDateTime: bookingObj.dropoffDateTime,
    estimatedDuration: bookingObj.estimatedDuration,
    cartPrice: bookingObj.cartPrice,
    totalPrice: bookingObj.totalPrice,
    status: bookingObj.status,
    paymentStatus: bookingObj.paymentStatus,
    specialRequests: bookingObj.specialRequests,
    notes: bookingObj.notes,
    cancelReason: bookingObj.cancelReason,
    cancelledAt: bookingObj.cancelledAt,
    createdAt: bookingObj.createdAt
  };
};

// Format array of bookings
export const formatBookingsResponse = (bookings) => {
  return bookings.map(booking => formatBookingResponse(booking));
};
