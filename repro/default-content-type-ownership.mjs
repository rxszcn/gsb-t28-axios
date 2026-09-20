// P2: post/put/patch blanket urlencoded content-type default vs body kinds (t28 candidate)
import http from 'node:http';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import axios from '../index.js';

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ct: req.headers['content-type'] ?? null, cl: req.headers['content-length'] ?? null }));
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const blob = new Blob(['hello'], { type: 'text/csv' });
const tmp = '/tmp/p2file.txt';
fs.writeFileSync(tmp, 'stream-body');
const streamFactory = () => fs.createReadStream(tmp);

for (const adapter of ['http', 'fetch']) {
  // a) Blob with its own type
  let r = await axios.post(base + '/b', blob, { adapter });
  console.log(adapter, 'blob(text/csv)  -> server saw:', JSON.stringify(r.data.ct));
  // b) Readable stream, no content-type set by user
  r = await axios.post(base + '/s', streamFactory(), { adapter });
  console.log(adapter, 'stream          -> server saw:', JSON.stringify(r.data.ct));
  // c) ArrayBuffer
  r = await axios.post(base + '/a', new Uint8Array([1, 2, 3]).buffer, { adapter });
  console.log(adapter, 'arraybuffer     -> server saw:', JSON.stringify(r.data.ct));
  // d) control: plain object (should legitimately be json)
  r = await axios.post(base + '/j', { x: 1 }, { adapter });
  console.log(adapter, 'object          -> server saw:', JSON.stringify(r.data.ct));
  // e) user explicitly cleared content-type: header removed -> what happens
  r = await axios.post(base + '/c', streamFactory(), { adapter, headers: { 'Content-Type': undefined } });
  console.log(adapter, 'stream(ct=undef)-> server saw:', JSON.stringify(r.data.ct));
}

// what does dispatchRequest hand to the adapter (single point, no server)?
const cap = async (config) => ({ status: 200, data: String(config.headers.get('content-type')), headers: {}, config });
for (const [name, data] of [['blob', blob], ['stream', streamFactory()], ['arraybuffer', new Uint8Array([1]).buffer], ['null', null]]) {
  const r = await axios.post('/z', data, { adapter: cap });
  console.log('stub-view', name.padEnd(12), '-> config.headers content-type at adapter entry:', r.data);
}
server.close();
