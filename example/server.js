const createServer = require('../createServer');

const server = createServer({
  host: '0.0.0.0',
  port: 8080,
});

server.on('listening', () => {
  const { address, port } = server.wss.address();
  console.log(`[${new Date().toJSON()} listening] on ${address}:${port}`);
});

server.on('connection', () => {
  console.log(`[${new Date().toJSON()} connection]`);
});

server.on('error', (err) => {
  console.log(`[${new Date().toJSON()} error]`, err);
});

// server.close().catch(console.log);
