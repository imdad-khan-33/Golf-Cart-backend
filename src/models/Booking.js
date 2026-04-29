import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for booking']
    },
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
      required: true
    },
    pickupDateTime: {
      type: Date,
      required: true
    },
    dropoffDateTime: {
      type: Date,
      required: true
    },
    estimatedDuration: {
      type: Number,
      required: true,
      description: 'Duration in minutes'
    },
    cartPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    specialRequests: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    completedAt: {
      type: Date,
      default: null,
      description: 'Timestamp when booking was marked as completed'
    },
    cancelledAt: {
      type: Date,
      default: null,
      description: 'Timestamp when booking was cancelled'
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      description: 'Driver assigned to this booking'
    },
    driverAcceptedAt: {
      type: Date,
      default: null,
      description: 'Timestamp when driver accepted the booking'
    },
    tripStartedAt: {
      type: Date,
      default: null,
      description: 'Timestamp when trip actually started'
    },
    pickupLocation: {
      type: {
        address: {
          type: String,
          required: true
        },
        latitude: {
          type: Number,
          required: true
        },
        longitude: {
          type: Number,
          required: true
        }
      },
      default: null
    },
    dropoffLocation: {
      type: {
        address: {
          type: String,
          required: true
        },
        latitude: {
          type: Number,
          required: true
        },
        longitude: {
          type: Number,
          required: true
        }
      },
      default: null
    }
  },
  { timestamps: true }
);

// Index for frequently queried fields
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
