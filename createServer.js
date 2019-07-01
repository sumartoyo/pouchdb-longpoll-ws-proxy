const WebSocketServer = require('rpc-websockets').Server;
const fetch = require('node-fetch');

module.exports = function createServer(options) {
  const server = new WebSocketServer(options);

  server.register('pouchdb.longpoll', async (params) => {
    const [ url, options ] = params;

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
      return response;
    }
  });

  return server;
}
