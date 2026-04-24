import nodemailer from 'nodemailer';

const getTransporter = () => {
  const isGmail = process.env.EMAIL_HOST?.includes('gmail');
  
  console.log('[TRANSPORTER] Email Configuration:');
  console.log(`[TRANSPORTER] HOST: ${process.env.EMAIL_HOST}`);
  console.log(`[TRANSPORTER] PORT: ${process.env.EMAIL_PORT}`);
  console.log(`[TRANSPORTER] USER: ${process.env.EMAIL_USER}`);
  console.log(`[TRANSPORTER] PASSWORD SET: ${!!process.env.EMAIL_PASSWORD}`);
  console.log(`[TRANSPORTER] Is Gmail: ${isGmail}`);
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || (isGmail ? 465 : 587),
    secure: isGmail ? true : (process.env.EMAIL_PORT === '465'),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

export const sendOTPEmail = async (email, otp, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Golf Cart - OTP Verification (${Math.floor(1000 + Math.random() * 9000)})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Golf Cart!</h2>
        <p>Hi ${userName},</p>
        <p>Your OTP for password reset is:</p>
        <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    console.log(`[OTP EMAIL] Attempting to send OTP to: ${email}`);
    const transporter = getTransporter();
    
    // Verify SMTP connection
    const verified = await transporter.verify();
    console.log(`[OTP EMAIL] SMTP Connection Verified: ${verified}`);
    
    if (!verified) {
      console.error('[OTP EMAIL] SMTP Connection Failed - Check credentials in .env');
      throw new Error('SMTP connection verification failed');
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP EMAIL] Email sent successfully`);
    console.log(`[OTP EMAIL] Message ID: ${info.messageId}`);
    console.log(`[OTP EMAIL] Response: ${info.response}`);
    console.log(`[OTP EMAIL] Accepted: ${JSON.stringify(info.accepted)}`);
    
    return true;
  } catch (error) {
    console.error('[OTP EMAIL] ERROR:', error.message);
    console.error('[OTP EMAIL] Error Code:', error.code);
    console.error('[OTP EMAIL] Error Details:', error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

export const sendResetPasswordEmail = async (email, resetLink, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Golf Cart - Reset Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p style="color: #666;">Or copy this link: ${resetLink}</p>
        <p style="color: #666; font-size: 12px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    console.log(`[RESET EMAIL] Attempting to send reset password email to: ${email}`);
    const transporter = getTransporter();
    const verified = await transporter.verify();
    console.log(`[RESET EMAIL] SMTP Connection Verified: ${verified}`);
    
    if (!verified) {
      console.error('[RESET EMAIL] SMTP Connection Failed');
      throw new Error('SMTP connection verification failed');
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`[RESET EMAIL] Email sent successfully - Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[RESET EMAIL] ERROR:', error.message);
    throw new Error(`Failed to send reset password email: ${error.message}`);
  }
};

export const sendVerificationEmail = async (email, verificationLink, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Golf Cart - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for signing up! Click the link below to verify your email:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p style="color: #666;">Or copy this link: ${verificationLink}</p>
        <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    `
  };

  try {
    console.log(`[VERIFY EMAIL] Attempting to send verification email to: ${email}`);
    const transporter = getTransporter();
    const verified = await transporter.verify();
    console.log(`[VERIFY EMAIL] SMTP Connection Verified: ${verified}`);
    
    if (!verified) {
      console.error('[VERIFY EMAIL] SMTP Connection Failed');
      throw new Error('SMTP connection verification failed');
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`[VERIFY EMAIL] Email sent successfully - Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[VERIFY EMAIL] ERROR:', error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};
