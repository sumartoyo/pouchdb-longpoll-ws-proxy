const fetch = require('node-fetch');
const WebSocket = require('ws');

function start(options) {
  const server = new WebSocket.Server(options);

  server.on('listening', () => {
    console.log(`listening on ${options.port}`);
  });

  server.on('error', error => {
    console.log(`[server] error`, error);
  });

  server.on('close', () => {
    console.log(`[server] closed`);
  });

  server.on('connection', ws => {
    console.log(`[ws] connection`);

    ws.on('error', error => {
      console.log(`[ws] error`, error);
    });

    ws.on('close', () => {
      console.log(`[ws] closed`);
    });

    ws.on('message', async (message) => {
      try {
        const {url, options} = JSON.parse(message);
        console.log(`[ws] message`, {url, options});

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
          await send(ws, JSON.stringify({response}));
          ws.close();
          break;
        }

      } catch (error) {
        console.log(`[ws] error`, error);
        await send(ws, JSON.stringify({
          error: error.message,
        }));
        ws.close();
      }
    });
  });
}

function send(ws, data) {
  return new Promise(resolve => {
    ws.send(data, resolve);
  });
}

module.exports = start;
