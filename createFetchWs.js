export default function createFetchWs(urlWs) {
  const debug = process.env.NODE_ENV === 'production' ? (
    () => {}
  ) : (
    fn => console.log(...fn())
  );

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
    delete options.signal;

    let isWaitingResponse = false;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(urlWs);

      ws.onerror = err => {
        debug(() => ['DEBUG ws.onerror', err]);
        reject(err);
      };

      ws.onclose = () => {
        if (isWaitingResponse) {
          ws.onerror(new Error('connection died'));
        } else {
          debug(() => ['DEBUG ws.onclose']);
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
