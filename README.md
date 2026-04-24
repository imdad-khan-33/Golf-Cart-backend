# Golf Cart Backend API

A professional Express.js + MongoDB backend for the Golf Cart mobile application built with Flutter.

## Features

- User Authentication (Register, Login)
- Password Reset with OTP Verification
- JWT Token-based Authorization
- Email Notifications
- Secure Password Hashing with Bcrypt
- Input Validation
- Error Handling
- CORS Support

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Email:** Nodemailer
- **Password Hashing:** Bcryptjs
- **Environment:** Dotenv

## 📁 Project Structure

```
Golf-Card-backend/
├── src/
│   ├── config/
│   │   └── database.js           # MongoDB configuration
│   ├── controllers/
│   │   └── authController.js     # Auth logic
│   ├── models/
│   │   └── User.js               # User schema
│   ├── routes/
│   │   └── authRoutes.js         # Auth endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── errorHandler.js       # Error handling
│   ├── utils/
│   │   ├── tokenUtils.js         # JWT utilities
│   │   ├── otpUtils.js           # OTP generation
│   │   └── emailService.js       # Email functions
│   └── server.js                 # Main server file
├── logs/                         # Application logs
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd Golf-Card-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` file and add your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/golf-cart
JWT_SECRET=your_jwt_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
CLIENT_URL=http://localhost:3000
```

4. **Start the server**

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📚 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Routes

#### 1. Register User
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Access:** Public
- **Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

#### 2. Login User
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Access:** Public
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
- **Response:** Same as register

#### 3. Forgot Password
- **Method:** `POST`
- **Endpoint:** `/auth/forgot-password`
- **Access:** Public
- **Body:**
```json
{
  "email": "john@example.com"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "email": "john@example.com"
}
```

#### 4. Verify OTP
- **Method:** `POST`
- **Endpoint:** `/auth/verify-otp`
- **Access:** Public
- **Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 5. Reset Password
- **Method:** `POST`
- **Endpoint:** `/auth/reset-password`
- **Access:** Private (requires token in header)
- **Headers:**
```
Authorization: Bearer <token>
```
- **Body:**
```json
{
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 6. Get Current User
- **Method:** `GET`
- **Endpoint:** `/auth/me`
- **Access:** Private
- **Headers:**
```
Authorization: Bearer <token>
```
- **Response:**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": null,
    "role": "user",
    "isVerified": false,
    "isActive": true,
    "lastLogin": "2026-04-06T10:00:00.000Z",
    "createdAt": "2026-04-06T10:00:00.000Z",
    "updatedAt": "2026-04-06T10:00:00.000Z"
  }
}
```

#### 7. Logout
- **Method:** `POST`
- **Endpoint:** `/auth/logout`
- **Access:** Private
- **Headers:**
```
Authorization: Bearer <token>
```
- **Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token is valid for 7 days by default (configurable in `.env`).

## Request/Response Format

### Headers
```
Content-Type: application/json
```

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

## Email Setup (Gmail)

1. Enable 2-Step Verification on your Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password in `.env`:
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

## Testing

You can test the API using:

- **Postman** - Import the collection
- **Thunder Client** - VS Code extension
- **cURL** - Command line tool

Example cURL request:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

## Next Steps

The following features will be added next:
- [ ] User Profile Management
- [ ] Golf Cart Listings
- [ ] Booking System
- [ ] Payment Integration
- [ ] Reviews & Ratings
- [ ] Notifications
- [ ] Admin Dashboard

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Senior MERN Stack Developer

---

**Happy Coding!**
"# Golf-Cart-backend" 
