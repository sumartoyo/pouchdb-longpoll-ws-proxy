import createFetchWs from '../createFetchWs';
const PouchDB = window.PouchDB;

const fetchWs = window.fetchWs = createFetchWs('ws://localhost:8080');
const dbRemote = window.dbRemote = new PouchDB('http://localhost:5984/example', { fetch: fetchWs });
const dbLocal = new PouchDB('example');

window.replicate = () => {
  window.replicator = dbLocal.replicate.from(dbRemote, {
    live: true,
    retry: true,
  }).on('error', err => {
    console.error(err);
  }).on('change', info => {
    console.log('change', info);
  });
};

window.cancelReplication = () => {
  if (window.replicator) {
    window.replicator.cancel();
    delete window.replicator;
  }
};

window.addItem = async () => {
  try {
    await dbRemote.post({ content: `${Math.random()}` });
    console.log('added');
  } catch (err) {
    console.error(err);
  }
};

window.replicate();
console.log('ready');
