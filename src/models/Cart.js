import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['Normal', 'Economy', 'Comfort'],
      description: 'Type of golf cart'
    },
    seats: {
      type: Number,
      required: true,
      default: 4
    },
    estimatedDuration: {
      type: Number, // in minutes
      required: true,
      default: 2
    },
    price: {
      type: Number,
      required: true
    },
    isPopular: {
      type: Boolean,
      default: false,
      description: 'Show Popular badge'
    },
    description: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    features: {
      type: [String],
      default: []
    },
    availability: {
      type: Boolean,
      default: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      description: 'Number of carts available'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
