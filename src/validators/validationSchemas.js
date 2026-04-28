import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
    role: z.enum(['user', 'driver'], {
      errorMap: () => ({ message: 'Role must be either "user" or "driver"' })
    }).optional().default('user')
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

export const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits')
  })
});

export const resendOTPSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const uploadProfilePictureSchema = z.object({
  body: z.object({
    profileImage: z.string().url('Profile image must be a valid URL')
  })
});

export const deleteAccountSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

// Cart Schemas
export const createCartSchema = z.object({
  body: z.object({
    name: z.enum(['Normal', 'Economy', 'Comfort'], {
      errorMap: () => ({ message: 'Cart type must be Normal, Economy, or Comfort' })
    }),
    seats: z.number().int().positive('Seats must be a positive number'),
    estimatedDuration: z.number().int().positive('Estimated duration must be a positive number'),
    price: z.number().positive('Price must be a positive number'),
    isPopular: z.boolean().optional(),
    description: z.string().optional(),
    image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
    features: z.array(z.string()).optional(),
    quantity: z.number().int().positive('Quantity must be a positive number').optional()
  })
});

export const updateCartSchema = z.object({
  body: z.object({
    name: z.enum(['Normal', 'Economy', 'Comfort']).optional(),
    seats: z.number().int().positive('Seats must be a positive number').optional(),
    estimatedDuration: z.number().int().positive('Estimated duration must be a positive number').optional(),
    price: z.number().positive('Price must be a positive number').optional(),
    isPopular: z.boolean().optional(),
    description: z.string().optional(),
    image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
    features: z.array(z.string()).optional(),
    availability: z.boolean().optional(),
    quantity: z.number().int().positive('Quantity must be a positive number').optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
});

export const cartByTypeSchema = z.object({
  params: z.object({
    name: z.enum(['Normal', 'Economy', 'Comfort'], {
      errorMap: () => ({ message: 'Cart type must be Normal, Economy, or Comfort' })
    })
  })
});

export const cartByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Cart ID is required')
  })
});

// Booking Schemas
export const createBookingSchema = z.object({
  body: z.object({
    cartId: z.string().min(1, 'Cart ID is required'),
    pickupDateTime: z.string().datetime('Invalid pickup date/time format'),
    dropoffDateTime: z.string().datetime('Invalid dropoff date/time format'),
    specialRequests: z.string().max(500, 'Special requests cannot exceed 500 characters').optional(),
    pickupLocation: z.object({
      address: z.string().min(3, 'Pickup address must be at least 3 characters'),
      lat: z.number().min(-90).max(90, 'Invalid latitude'),
      lng: z.number().min(-180).max(180, 'Invalid longitude')
    }).optional(),
    dropoffLocation: z.object({
      address: z.string().min(3, 'Dropoff address must be at least 3 characters'),
      lat: z.number().min(-90).max(90, 'Invalid latitude'),
      lng: z.number().min(-180).max(180, 'Invalid longitude')
    }).optional()
  }).refine(data => {
    const pickup = new Date(data.pickupDateTime);
    const dropoff = new Date(data.dropoffDateTime);
    return dropoff > pickup;
  }, {
    message: 'Dropoff date must be after pickup date',
    path: ['dropoffDateTime']
  })
});

export const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking ID is required')
  }),
  body: z.object({
    status: z.enum(['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']).optional(),
    notes: z.string().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
});

export const bookingByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking ID is required')
  })
});

// Rating Schemas
export const submitRatingSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    review: z.string().max(500, 'Review cannot exceed 500 characters').optional(),
    cleanliness: z.number().int().min(1).max(5).optional(),
    behavior: z.number().int().min(1).max(5).optional(),
    safety: z.number().int().min(1).max(5).optional()
  })
});

export const ratingByBookingSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required')
  })
});

export const driverIdSchema = z.object({
  params: z.object({
    driverId: z.string().min(1, 'Driver ID is required')
  })
});
