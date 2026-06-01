import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      lowercase: true,
      sparse: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    phoneNumber: {
      type: String,
      sparse: true,
      unique: true,
      match: [
        /^\+[1-9]\d{1,14}$/,
        'Please provide a valid phone number with country code (e.g., +1234567890)'
      ]
    },
    password: {
      type: String,
      required: function() {
        return this.role !== 'driver';
      },
      minlength: 6,
      select: false // Don't return password in queries by default
    },
    profileImage: {
      type: String,
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String,
      default: null,
      select: false
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    isActive: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'driver'],
      default: 'user',
      description: 'User role - user (customer) or driver (golf cart driver with admin privileges)'
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
