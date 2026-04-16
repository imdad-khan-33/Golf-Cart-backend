import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'User who submitted the rating'
    },
    ratedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'User being rated'
    },
    ratingType: {
      type: String,
      enum: ['user-to-driver', 'driver-to-user'],
      required: true,
      description: 'Type of rating'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'Customer who booked'
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'Driver who completed trip'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      description: 'Rating from 1 to 5 stars'
    },
    review: {
      type: String,
      default: '',
      maxlength: 500,
      description: 'Review text'
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    behavior: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    safety: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index to ensure only one rating per booking per rating type
ratingSchema.index({ bookingId: 1, ratingType: 1 }, { unique: true });

export default mongoose.model('Rating', ratingSchema);
