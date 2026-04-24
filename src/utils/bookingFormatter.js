/**
 * Format location object - standardized structure for frontend consumption
 * @param {Object} location - Location object with address, lat, lng
 * @returns {Object|null} Formatted location or null
 */
const formatLocation = (location) => {
  if (!location || (!location.address && location.lat === undefined && location.lng === undefined)) {
    return null;
  }
  
  return {
    address: location.address || null,
    lat: location.lat || null,
    lng: location.lng || null
  };
};

/**
 * Format timestamps - return null for undefined/null values
 * @param {Date} timestamp - Date timestamp
 * @returns {string|null} ISO string or null
 */
const formatTimestamp = (timestamp) => {
  return timestamp ? new Date(timestamp).toISOString() : null;
};

/**
 * Format driver object with rating - minimal user info
 * @param {Object} driverId - Driver object or ID
 * @param {Number} rating - Optional driver rating
 * @returns {Object|null} Formatted driver or null
 */
const formatDriver = (driverId, rating = null) => {
  if (!driverId) return null;
  
  const driverObj = driverId.toObject ? driverId.toObject() : driverId;
  
  return {
    _id: driverObj._id || driverId._id,
    name: driverObj.name,
    email: driverObj.email,
    ...(rating !== null && { rating })
  };
};

/**
 * Format cart object - minimal cart info
 * @param {Object} cartId - Cart object
 * @returns {Object|null} Formatted cart or null
 */
const formatCart = (cartId) => {
  if (!cartId) return null;
  
  const cartObj = cartId.toObject ? cartId.toObject() : cartId;
  
  return {
    _id: cartObj._id,
    name: cartObj.name,
    seats: cartObj.seats,
    price: cartObj.price,
    type: cartObj.type
  };
};

/**
 * Format single booking response - clean, scalable structure
 * Optimized for frontend consumption
 * @param {Object} booking - Mongoose booking document
 * @param {Number} driverRating - Optional driver average rating
 * @returns {Object} Formatted booking response
 */
export const formatBookingResponse = (booking, driverRating = null) => {
  const bookingObj = booking.toObject ? booking.toObject() : booking;

  return {
    _id: bookingObj._id,
    cart: formatCart(bookingObj.cartId),
    pickup: {
      dateTime: formatTimestamp(bookingObj.pickupDateTime),
      location: formatLocation(bookingObj.pickupLocation)
    },
    dropoff: {
      dateTime: formatTimestamp(bookingObj.dropoffDateTime),
      location: formatLocation(bookingObj.dropoffLocation)
    },
    duration: {
      minutes: bookingObj.estimatedDuration,
      hours: Math.ceil(bookingObj.estimatedDuration / 60)
    },
    pricing: {
      cartPrice: bookingObj.cartPrice,
      totalPrice: bookingObj.totalPrice
    },
    status: bookingObj.status,
    driver: formatDriver(bookingObj.driverId, driverRating),
    notes: bookingObj.notes || null,
    specialRequests: bookingObj.specialRequests || null,
    timestamps: {
      createdAt: formatTimestamp(bookingObj.createdAt),
      completedAt: formatTimestamp(bookingObj.completedAt),
      cancelledAt: formatTimestamp(bookingObj.cancelledAt),
      driverAcceptedAt: formatTimestamp(bookingObj.driverAcceptedAt),
      tripStartedAt: formatTimestamp(bookingObj.tripStartedAt)
    }
  };
};

/**
 * Format booking response with minimal details
 * For list/summary views where less detail is needed
 * @param {Object} booking - Mongoose booking document
 * @param {Number} driverRating - Optional driver average rating
 * @returns {Object} Minimal formatted booking response
 */
export const formatBookingMinimal = (booking, driverRating = null) => {
  const bookingObj = booking.toObject ? booking.toObject() : booking;

  return {
    _id: bookingObj._id,
    cart: formatCart(bookingObj.cartId),
    pickup: {
      dateTime: formatTimestamp(bookingObj.pickupDateTime),
      location: formatLocation(bookingObj.pickupLocation)
    },
    dropoff: {
      dateTime: formatTimestamp(bookingObj.dropoffDateTime),
      location: formatLocation(bookingObj.dropoffLocation)
    },
    pricing: {
      totalPrice: bookingObj.totalPrice
    },
    status: bookingObj.status,
    driver: formatDriver(bookingObj.driverId, driverRating),
    createdAt: formatTimestamp(bookingObj.createdAt)
  };
};

/**
 * Format array of bookings
 * @param {Array} bookings - Array of Mongoose booking documents
 * @param {Boolean} minimal - Use minimal format
 * @returns {Array} Formatted bookings array
 */
export const formatBookingsResponse = (bookings, minimal = false) => {
  return bookings.map(booking => 
    minimal ? formatBookingMinimal(booking) : formatBookingResponse(booking)
  );
};

/**
 * Format grouped bookings by date with metadata
 * Note: bookings should already be formatted (using formatBookingMinimal)
 * @param {Object} groupedBookings - Object with date groups (pre-formatted bookings)
 * @returns {Object} Formatted grouped bookings with count and metadata
 */
export const formatGroupedBookings = (groupedBookings) => {
  const result = {};
  
  Object.entries(groupedBookings).forEach(([groupKey, bookings]) => {
    if (bookings.length > 0) {
      result[groupKey] = {
        count: bookings.length,
        bookings: bookings  // Bookings are already formatted, don't format again!
      };
    }
  });
  
  return result;
};

