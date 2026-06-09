import { Server } from 'socket.io';
import { verifyToken } from '../utils/tokenUtils.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { notificationService } from '../utils/notificationService.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Unauthorized'));
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.data.user = {
        id: user._id.toString(),
        role: user.role,
        name: user.name
      };

      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // ─── Booking room ─────────────────────────────────────────────────────────
    socket.on('join:booking', ({ bookingId } = {}) => {
      if (!bookingId) return;
      socket.join(`booking:${bookingId}`);
    });

    socket.on('leave:booking', ({ bookingId } = {}) => {
      if (!bookingId) return;
      socket.leave(`booking:${bookingId}`);
    });

    // ─── Driver personal room ─────────────────────────────────────────────────
    // driverId is optional – falls back to the authenticated socket user id
    socket.on('join:driver', ({ driverId } = {}) => {
      const resolvedId = driverId || socket.data.user?.id;
      if (!resolvedId) return;
      socket.join(`driver:${resolvedId}`);
    });

    socket.on('leave:driver', ({ driverId } = {}) => {
      const resolvedId = driverId || socket.data.user?.id;
      if (!resolvedId) return;
      socket.leave(`driver:${resolvedId}`);
    });

    // ─── Available drivers room (Flutter: join:drivers / leave:drivers) ────────
    socket.on('join:drivers', () => {
      if (socket.data.user?.role !== 'driver') return;
      socket.join('drivers:available');
    });

    socket.on('leave:drivers', () => {
      socket.leave('drivers:available');
    });

    // ─── Admin room ───────────────────────────────────────────────────────────
    socket.on('join:admin', () => {
      socket.join('admin:notifications');
    });

    socket.on('leave:admin', () => {
      socket.leave('admin:notifications');
    });

    // ─── Driver location via socket (legacy / real-time streaming) ────────────
    socket.on('driver:location', async (payload) => {
      try {
        if (socket.data.user?.role !== 'driver') return;

        const {
          bookingId,
          driverId,
          latitude,
          longitude,
          heading = null,
          speed = null
        } = payload || {};

        if (!bookingId || latitude === undefined || longitude === undefined) return;

        const resolvedDriverId = driverId || socket.data.user?.id;
        if (!resolvedDriverId) return;

        const location = {
          latitude,
          longitude,
          heading,
          speed,
          updatedAt: new Date()
        };

        await Booking.findByIdAndUpdate(bookingId, {
          $set: { driverLocation: location }
        });

        // Broadcast location to booking room and driver room
        notificationService.sendLocationUpdate(io, {
          bookingId,
          driverId: resolvedDriverId,
          latitude,
          longitude,
          heading,
          speed,
          updatedAt: location.updatedAt
        });
      } catch (error) {
        console.error('[SOCKET] driver:location error:', error.message);
      }
    });
  });

  return io;
};
