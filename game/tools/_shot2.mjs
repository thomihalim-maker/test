// usage: node tools/shot.mjs out.png [w=1280] [h=720] [waitMs=2500] [query=""]
// Starts a static server itself, opens the game in headless Chromium (software GL), saves screenshot, prints console errors.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [out='shot.png',w=1280,h=720,wait=2500,query=''] = process.argv.slice(2);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const srv = http.createServer((q,r)=>{ let p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(p.endsWith('/'))p+='index.html';
  fs.readFile(p,(e,d)=>{ if(e){r.writeHead(404);r.end();return;} r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); r.end(d); }); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg = await b.newPage({viewport:{width:+w,height:+h}});
pg.on('console',m=>{ if(['error','warning'].includes(m.type())) console.log('['+m.type()+']',m.text()); });
pg.on('pageerror',e=>console.log('[pageerror]',e.message));
await pg.goto(`http://localhost:${port}/index.html${query}`);
await pg.waitForTimeout(+wait);
await pg.screenshot({path:out,timeout:180000});
console.log('saved',out);
await b.close(); srv.close();
