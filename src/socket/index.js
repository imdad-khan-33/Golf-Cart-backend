import { Server } from 'socket.io';
import { verifyToken } from '../utils/tokenUtils.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';

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
    socket.on('join:booking', ({ bookingId }) => {
      if (!bookingId) return;
      socket.join(`booking:${bookingId}`);
    });

    socket.on('leave:booking', ({ bookingId }) => {
      if (!bookingId) return;
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('join:driver', ({ driverId }) => {
      if (!driverId) return;
      socket.join(`driver:${driverId}`);
    });

    socket.on('leave:driver', ({ driverId }) => {
      if (!driverId) return;
      socket.leave(`driver:${driverId}`);
    });

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

        const eventPayload = {
          bookingId,
          driverId: resolvedDriverId,
          ...location
        };

        io.to(`booking:${bookingId}`).emit('driver:location', eventPayload);
        io.to(`driver:${resolvedDriverId}`).emit('driver:location', eventPayload);
      } catch (error) {
        console.error('[SOCKET] driver:location error:', error.message);
      }
    });
  });

  return io;
};
