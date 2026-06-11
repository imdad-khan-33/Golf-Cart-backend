// Format user response - returns only essential fields
export const formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profileImage: user.profileImage || null,
    isVerified: user.isVerified,
    isActive: user.isActive,
    lastLogin: user.lastLogin || null
  };
};
