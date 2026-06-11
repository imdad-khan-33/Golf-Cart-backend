import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';

const app = express();
const httpServer = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser()); // Parse cookies for HTTP-only refresh tokens

// Serve static files (like uploaded images)
app.use('/uploads', express.static('public/uploads'));

// Initialize Socket.io
const io = initSocket(httpServer);
app.locals.io = io; // Make io accessible to routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ratings', ratingRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running', 
    timestamp: new Date() 
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error Handler Middleware (Should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Golf Cart API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
