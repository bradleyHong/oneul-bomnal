import http from 'node:http';
const got = [];
http.createServer(async (req, res) => {
  if (req.url === '/__dump') { res.end(JSON.stringify(got, null, 1)); return; }
  const chunks = []; for await (const c of req) chunks.push(c);
  got.push({ url: req.url, body: Buffer.concat(chunks).toString() });
  if (req.url === '/fail') { res.writeHead(500).end('nope'); return; }
  res.writeHead(200, {'content-type':'application/json'}); res.end('{"success":"true"}');
}).listen(9911, () => console.log('sink 9911'));
