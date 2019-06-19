const debug = process.env.NODE_ENV === 'production' ? (
  () => {}
) : (
  fn => console.log(...fn())
);

export default function createFetchWs(urlWs) {
  return (url, options) => {
    const isLongPoll = url.indexOf('feed=longpoll') !== -1;
    if (!isLongPoll) {
      return fetch(url, options);
    }

    options = {...options};
    const headers = {};
    for (let [key, value] of options.headers.entries()) {
      headers[key] = value;
    }
    options.headers = headers;

    const signal = options.signal;
    delete options.signal;

    let isWaitingResponse = false;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(urlWs);

      if (signal) {
        signal.onabort = () => {
          isWaitingResponse = false;
          ws.close();
        };
      }

      ws.onerror = err => {
        debug(() => ['DEBUG ws.onerror', err]);
        reject(err);
      };

      ws.onclose = () => {
        debug(() => ['DEBUG ws.onclose']);
        if (isWaitingResponse) {
          ws.onerror(new Error('connection died'));
        }
      };

      ws.onopen = () => {
        debug(() => ['DEBUG ws.onopen']);
        ws.send(JSON.stringify({url, options}));
        isWaitingResponse = true;
      };

      ws.onmessage = event => {
        isWaitingResponse = false;
        const data = JSON.parse(event.data);
        if (data.error) {
          ws.onerror(new Error(data.error));
        } else if (data.response) {
          const json = data.response.json;
          data.response.json = () => json;
          debug(() => ['DEBUG ws.data.response', data.response]);
          resolve(data.response);
        } else {
          ws.onerror(new Error('unknown response'));
          debug(() => ['DEBUG ws.data.response', event]);
        }
      };
    });
  };
}
