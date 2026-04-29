import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { generateToken, generateRefreshToken, generateResetToken } from '../utils/tokenUtils.js';
import { generateOTP, getOTPExpiryTime, isOTPExpired } from '../utils/otpUtils.js';
import { sendOTPEmail, sendResetPasswordEmail } from '../utils/emailService.js';
import { formatUserResponse } from '../utils/userFormatter.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Register user - Send OTP
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      throw new AppError('Please provide all required fields', 400);
    }

    if (password !== confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      throw new AppError('Email already registered', 400);
    }

    // Delete unverified user if exists (for retry)
    if (user && !user.isVerified) {
      await User.deleteOne({ _id: user._id });
    }

    // Create unverified user
    user = new User({
      name,
      email,
      password,
      role,
      isVerified: false,
      isActive: false
    });

    await user.save();

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = getOTPExpiryTime();
    user.otpAttempts = 0;
    await user.save();

    // Send OTP to email
    try {
      await sendOTPEmail(user.email, otp, user.name);
      console.log(`[REGISTER] OTP sent to ${email}`);
    } catch (emailError) {
      console.error('[REGISTER] Email send failed:', emailError.message);
      await User.deleteOne({ _id: user._id });
      throw new AppError('Failed to send OTP email. Please try again.', 500);
    }

    const response = {
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: email
    };

    // Include OTP in response for development/testing
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp;
      response.testingNote = 'OTP is shown for testing purposes only. In production, this will not be visible.';
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify registration OTP
// @route   POST /api/auth/verify-register-otp
// @access  Public
export const verifyRegisterOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError('Please provide email and OTP', 400);
    }

    const user = await User.findOne({ email }).select('+otp +otpExpires +otpAttempts');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isVerified) {
      throw new AppError('User already verified', 400);
    }

    if (!user.otp) {
      throw new AppError('OTP not found. Request a new one', 400);
    }

    // Check if OTP expired
    if (isOTPExpired(user.otpExpires)) {
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('OTP has expired. Request a new one', 400);
    }

    // Check max attempts
    if (user.otpAttempts >= parseInt(process.env.MAX_OTP_ATTEMPTS || 5)) {
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('Too many OTP attempts. Request a new one', 400);
    }

    // Verify OTP
    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      throw new AppError('Invalid OTP', 400);
    }

    // OTP verified - mark user as verified and activate
    user.isVerified = true;
    user.isActive = true;
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Email verified successfully. Registration complete!',
      token,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP for unverified users
// @route   POST /api/auth/resend-otp

export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Please provide an email', 400);
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError('No user found with this email', 404);
    }

    // Check if user is already verified
    if (user.isVerified) {
      throw new AppError('User is already verified', 400);
    }

    // Generate new OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = getOTPExpiryTime();
    user.otpAttempts = 0;

    await user.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, user.name);
      console.log(`[RESEND-OTP] OTP sent to ${email}`);
    } catch (emailError) {
      console.error('[RESEND-OTP] Email send failed:', emailError.message);
      // Reset OTP fields since email failed
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('Failed to send OTP email. Please try again.', 500);
    }

    const response = {
      success: true,
      message: 'OTP resent to your email. Please verify to complete registration.',
      email: email
    };

    // Include OTP in response for development/testing
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp;
      response.testingNote = 'OTP is shown for testing purposes only. In production, this will not be visible.';
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, loginType } = req.body;

    // Validation
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }
   
  

    // Check for user, and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

       if (!user.isActive) {
      throw new AppError('Account is not active', 401);
    }

    // Check if loginType matches user role
    if (loginType !== user.role) {
      throw new AppError(
        `This is a ${user.role} account. Please use the ${user.role} login tab.`,
        403
      );
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset (Forgot Password)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Please provide an email', 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError('No user found with this email', 404);
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = getOTPExpiryTime();
    user.otpAttempts = 0;

    await user.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, user.name);
      console.log(` OTP email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error(' Email sending failed:', emailError.message);
      // Reset OTP fields since email failed
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('Failed to send OTP email. Please check your email configuration.', 500);
    }

    // Response with OTP for development/testing
    const response = {
      success: true,
      message: 'OTP sent to your email',
      email: email
    };

    // Include OTP in response for development/testing
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp;  //  Show OTP for testing in Postman
      response.testingNote = 'OTP is shown for testing purposes only';
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError('Please provide email and OTP', 400);
    }

    const user = await User.findOne({ email }).select('+otp +otpExpires +otpAttempts');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.otp) {
      throw new AppError('OTP not found. Request a new one', 400);
    }

    // Check if OTP expired
    if (isOTPExpired(user.otpExpires)) {
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('OTP has expired. Request a new one', 400);
    }

    // Check max attempts
    if (user.otpAttempts >= parseInt(process.env.MAX_OTP_ATTEMPTS || 5)) {
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('Too many OTP attempts. Request a new one', 400);
    }

    // Verify OTP
    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      throw new AppError('Invalid OTP', 400);
    }

    // OTP verified successfully - don't clear it yet, will be cleared after password reset
    const resetToken = generateResetToken(user._id);
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken // Return token for password reset step
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Private (requires resetToken or auth token)
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError('Email, OTP, and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+otp +otpExpires +otpAttempts');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.otp) {
      throw new AppError('OTP not found. Request a new one', 400);
    }

    // Check if OTP expired
    if (isOTPExpired(user.otpExpires)) {
      user.otp = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('OTP has expired. Request a new one', 400);
    }

    // Verify OTP matches
    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      throw new AppError('Invalid OTP', 400);
    }

    // OTP verified - update password
    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload/Update profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
export const uploadProfilePicture = async (req, res, next) => {
  try {
    const { profileImage } = req.body;

    if (!profileImage) {
      throw new AppError('Please provide a profile image URL', 400);
    }

    // Validate URL format
    try {
      new URL(profileImage);
    } catch (error) {
      throw new AppError('Invalid image URL format', 400);
    }

    const user = await User.findById(req.user._id);

    // Update profile image
    user.profileImage = profileImage;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile statistics (trip counts)
// @route   GET /api/auth/stats
// @access  Private (User sees own, Driver sees all or specific user)
export const getProfileStats = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const isDriver = req.user.role === 'driver';

    // User cannot access other user's stats
    if (!isDriver && userId) {
      throw new AppError('You are not authorized to view other user stats', 403);
    }

    let filter = {};

    // User can only see their own stats
    // Driver can see all stats or specific user's stats
    if (isDriver && userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    } else if (!isDriver) {
      filter.userId = req.user._id;
    }
    // If driver and no userId provided, gets all stats (no filter)

    const totalTrips = await Booking.countDocuments(filter);
    
    // Count completed trips by completedAt timestamp (historical)
    const completedTrips = await Booking.countDocuments({ 
      ...filter, 
      completedAt: { $ne: null } 
    });
    
    // Count currently cancelled trips
    const cancelledTrips = await Booking.countDocuments({ 
      ...filter, 
      status: 'Cancelled' 
    });
    
    // Count pending trips
    const pendingTrips = await Booking.countDocuments({ 
      ...filter, 
      status: 'Pending' 
    });
    
    // Count active trips
    const activeTrips = await Booking.countDocuments({ 
      ...filter, 
      status: 'Active' 
    });

    // Calculate total spent from completed trips
    const spendingData = await Booking.aggregate([
      { $match: { ...filter, completedAt: { $ne: null } } },
      { $group: { _id: null, totalSpent: { $sum: '$totalPrice' } } }
    ]);

    const totalSpent = spendingData[0]?.totalSpent || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalTrips,
        completedTrips,
        cancelledTrips,
        pendingTrips,
        activeTrips,
        totalSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      throw new AppError('Please provide both email and password to delete account', 400);
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify email matches
    if (user.email !== email) {
      throw new AppError('Email does not match your account', 401);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Incorrect password', 401);
    }

    // Delete all user's bookings
    await Booking.deleteMany({ userId: user._id });

    // Delete user account
    await User.findByIdAndDelete(user._id);

    // Clear cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully along with all bookings'
    });
  } catch (error) {
    next(error);
  }
};


