const http = require('http');
const app = require('./app');
const { initSocket } = require('./services/socket');

const PORT = process.env.PORT || 5001;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO tracking hub
initSocket(server);

// Start Server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  WHERE IS MY BUS Server is running on port ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});
// Trigger nodemon reload
