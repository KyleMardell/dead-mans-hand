const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json' };
const server = http.createServer((req,res) => {
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (filename === root || filename.endsWith(path.sep)) filename = path.join(filename, 'index.html');
  fs.readFile(filename,(error,data)=> { if(error) {res.writeHead(404).end('Not found'); return;} res.writeHead(200,{'Content-Type':mime[path.extname(filename)] || (data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) ? 'image/png' : 'application/octet-stream'),'Cache-Control':'no-store'}).end(data); });
});
server.listen(4173,'127.0.0.1',()=>console.log('Dead Man’s Hand: http://127.0.0.1:4173'));
