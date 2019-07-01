You can't replicate to more than 6 database with PouchDB because many browsers has 6 maximum paralel connection.
PouchDB uses long poll HTTP connection to watch changes, thus hitting the maximum paralel connection.

This helper provides a custom fetch method to watch changes via WebSocket so it won't hit maximum connection limitation.
It uses standard fetch if the operation is not a long poll operation.

Just read the source code. It's short.

## Why not use [socket-pouch](https://github.com/pouchdb-community/socket-pouch)?

Because it doesn't work in my case. I can't create index and other things also doesn't work. I don't know why. Just try it by yourself. Is it working? If yes then use it. If not then maybe this helper is a good news for you.

socket-pouch is also a whole new adapter while my helper is not an adapter. It's just a fetcher so it more likely to work since I don't introduce any custom adapter.

## How to

Example code is available in folder `example`.

### Server

Yes, you need to run a server. This is the proxy to provide the WebSocket interface.

```js
const createServer = require('pouchdb-longpoll-ws-proxy/createServer');

const wsServer = createServer({
  host: '0.0.0.0',
  port: 8080,
});

wsServer.on('listening', () => console.log('listening'));

// wsServer.close();
```

You can also use HTTPS to run WSS.

```js
const https = require('https');
const createServer = require('pouchdb-longpoll-ws-proxy/createServer');

const httpsServer = https.createServer({
  key: fs.readFileSync(process.env.PATH_KEY, { encoding: 'utf8' }),
  cert: fs.readFileSync(process.env.PATH_CERT, { encoding: 'utf8' }),
});

httpsServer.listen(8080);

const wsServer = createServer({
  host: '0.0.0.0',
  server: httpsServer,
});
```

### Client

```js
import createFetchWs from 'pouchdb-longpoll-ws-proxy/createFetchWs';
const fetchWs = createFetchWs('ws://localhost:8080'); // this is all of it

// do what you usually do
const dbRemote = new PouchDB({
  name: `http://localhost:5984/nameDbRemote`,
  fetch: fetchWs,
});
const dbLocal = new PouchDB({
  name: 'nameDbLocal',
});
const replicator = dbLocal.replicate.from(dbRemote, {
  live: true,
  retry: true,
});
replicator.on('change', onChange);
```

## API

### `createServer(options)`

Create a new server instance. Read [this](https://github.com/elpheria/rpc-websockets/blob/HEAD/API.md#new-websocketserveroptions---server) and [this](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback). Returns server object.

### `createFetchWs(urlWs)`

Create a fetcher to be used by PouchDB. `urlWs` is the URL to the server.
