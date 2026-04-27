import express from 'express';
import {
  register,
  verifyRegisterOTP,
  login,
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
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  uploadProfilePictureSchema,
  deleteAccountSchema
} from '../validators/validationSchemas.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/verify-register-otp', validate(verifyOTPSchema), verifyRegisterOTP);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);

// Public routes
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);
router.get('/stats', protect, getProfileStats);
router.put('/profile-picture', protect, validate(uploadProfilePictureSchema), uploadProfilePicture);
router.delete('/account', protect, validate(deleteAccountSchema), deleteAccount);
router.post('/logout', protect, logout);

export default router;
