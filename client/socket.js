// client/socket.js
const socket = io();

// Test connection
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
});

// Example: receive player movement from other players
socket.on('playerMoved', (data) => {
  console.log('Other player moved:', data);
});

// Export if needed
export default socket;
