import { io } from 'socket.io-client';

let socket = null;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection events
    socket.on('connect', () => {
      // Silently connected - no logging in production
    });

    socket.on('disconnect', (reason) => {
      // Silently disconnected
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    // Error handling
    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error?.message);
      // Implement fallback or retry logic if needed
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    // Leaderboard updates
    socket.on('leaderboard-updated', (data) => {
      window.dispatchEvent(new CustomEvent('leaderboard-updated', { detail: data }));
    });

    // Notifications
    socket.on('notification', (notification) => {
      window.dispatchEvent(new CustomEvent('notification-received', { detail: notification }));
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const joinCompetition = (competitionId) => {
  if (socket) socket.emit('join-competition', competitionId);
};

export const joinUser = (userId) => {
  if (socket) socket.emit('join-user', userId);
};

export const onLeaderboardUpdated = (cb) => {
  if (socket) socket.on('leaderboard-updated', cb);
};

export const onNotification = (cb) => {
  if (socket) socket.on('notification', cb);
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
