// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if OTP is expired
export const isOTPExpired = (expireTime) => {
  return new Date() > new Date(expireTime);
};

// Get OTP expiry time (default 5 minutes)
export const getOTPExpiryTime = () => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY) || 5;
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);
  return expiryTime;
};
