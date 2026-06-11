import express from 'express';
import {
  register,
  verifyRegisterOTP,
  resendOTP,
  login,
  registerDriver,
  sendDriverLoginOTP,
  verifyDriverLoginOTP,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getMe,
  logout,
  uploadProfilePicture,
  getProfileStats,
  deleteAccount
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { uploadProfile } from '../middleware/uploadMiddleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resendOTPSchema,
  resetPasswordSchema,
  driverRegisterSchema,
  driverLoginRequestSchema,
  driverVerifyOTPSchema,
  uploadProfilePictureSchema,
  deleteAccountSchema
} from '../validators/validationSchemas.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/driver/register', validate(driverRegisterSchema), registerDriver);
router.post('/verify-register-otp', validate(verifyOTPSchema), verifyRegisterOTP);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/login', validate(loginSchema), login);
router.post('/driver/login', validate(driverLoginRequestSchema), sendDriverLoginOTP);
router.post('/driver/verify-otp', validate(driverVerifyOTPSchema), verifyDriverLoginOTP);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);

// Public routes
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);
router.get('/stats', protect, getProfileStats);
router.post('/profile-picture', protect, uploadProfile.single('profileImage'), uploadProfilePicture);
router.delete('/account', protect, validate(deleteAccountSchema), deleteAccount);
router.post('/logout', protect, logout);

export default router;
