const fetch = require('node-fetch');
const WebSocket = require('ws');

class CustomWebSocketServer extends WebSocket.Server {
  emit(type, ...args) {
    if (type === 'connection') {
      const ws = injectWs(args[0]);
      const req = args[1];
      console.log(`[server] ${type}`);
      return super.emit(type, ws, req);
    }

    super.once(type, (...args) => {
      if (type === 'listening') {
        const { address, port } = super.address();
        console.log(`[server] ${type}`, `${address}:${port}`);
      } else if (type === 'error') {
        console.log(`[server] ${type}`, ...args);
      } else {
        console.log(`[server] ${type}`);
      }
    });
    return super.emit(type, ...args);
  }
}

function injectWs(ws) {
  ws._emit = ws.emit;

  ws.emit = (type, ...args) => {
    if (type !== 'message') {
      ws.once(type, (...args) => {
        if (type === 'error') {
          console.log(`[ws] ${type}`, ...args);
        } else {
          console.log(`[ws] ${type}`);
        }
      });
      return ws._emit(type, ...args);
    }

    const listeners = ws.listeners(type);
    if (listeners.length === 0) {
      console.log(`[ws] ${type}`);
    }
    for (let listener of listeners) {
      if (listener(...args) === false) {
        return true;
      }
    }

    handleMessage(ws, args[0]);
    return true;
  }

  ws.sendPromise = (data, options) => {
    return new Promise(resolve => {
      ws.send(data, options, resolve);
    });
  };

  return ws;
}

async function handleMessage(ws, message) {
  try {
    const {url, options} = JSON.parse(message);

    while (true) {
      const res = await fetch(url, options);
      const response = {
        ok: res.ok,
        status: res.status,
      };

      const text = await res.text();
      if (!text) {
        continue;
      }

      response.json = JSON.parse(text);
      await ws.sendPromise(JSON.stringify({response}));
      ws.close();
      break;
    }

  } catch (err) {
    console.log(`[ws] error`, err.message);
    await ws.sendPromise(JSON.stringify({
      error: err.message,
    }));
    ws.close();
  }
}

function startServer(options) {
  const server = new CustomWebSocketServer(options);
  const closeServer = server.close.bind(server);

  if (options.server) {
    server.close = () => {
      closeServer();
      options.server.close();
    };
  }

  return server;
}

module.exports = startServer;
