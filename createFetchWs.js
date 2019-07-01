import { Client } from 'rpc-websockets';
const WebSocket = window.WebSocket;

export default function createFetchWs(param) {
  let fetchWs = param instanceof RpcWs ? param : new RpcWs(param);

  return (url, options) => {
    const isLongPoll = url.indexOf('feed=longpoll') !== -1;
    if (!isLongPoll) {
      return fetch(url, options);
    }

    options = Object.assign({}, options);

    const headers = {};
    for (let [ key, value ] of options.headers.entries()) {
      headers[key] = value;
    }
    options.headers = headers;

    const signal = options.signal;
    delete options.signal;

    return new Promise(async (resolve, reject) => {
      signal.onabort = () => {
        const err = new Error('AbortError');
        err.name = err.message;
        reject(err);
      };

      try {
        const result = await fetchWs.call('pouchdb.longpoll', [ url, options ]);
        const json = result.json;
        result.json = () => json;
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  };
}

export class RpcWs {
  constructor(urlWs) {
    this.urlWs = urlWs;
    this.status = WebSocket.CLOSED;
    this.queue = new Set([]);
  }

  call(...args) {
    return new Promise((resolve, reject) => {
      this.queue.add({ args, resolve, reject });
      if (this.status === WebSocket.CLOSED) {
        this.connect();
      } else if (this.status === WebSocket.CONNECTING) {
        // do nothing
      } else if (this.status === WebSocket.OPEN) {
        this.runQueue();
      }
    });
  }

  connect() {
    this.status = WebSocket.CONNECTING;
    this.client = new Client(this.urlWs, {
      reconnect: false,
    });
    this.client.on('open', () => this.onOpen());
    this.client.on('close', () => this.onClose());
    this.client.on('error', (err) => this.onError(err));
  }

  onOpen() {
    this.status = WebSocket.OPEN;
    this.runQueue();
  }

  onClose() {
    this.status = WebSocket.CLOSED;
    this.onError(new Error('connection died'));
  }

  onError(err) {
    if (err.target && 'readyState' in err.target) {
      this.status = err.target.readyState;
    }
    while (this.queue.size > 0) {
      let request;
      for (request of this.queue) {
        request.reject(err);
        break;
      }
      this.queue.delete(request);
    }
  }

  runQueue() {
    for (let request of this.queue) {
      this.runRequest(request);
    }
  }

  async runRequest(request) {
    const { args, resolve, reject } = request;
    try {
      if (!request.isRunning) {
        request.isRunning = true;
        const result = await this.client.call(...args);
        this.queue.delete(request);
        resolve(result);
      }
    } catch (err) {
      this.queue.delete(request);
      reject(err);
    }
  }
}
