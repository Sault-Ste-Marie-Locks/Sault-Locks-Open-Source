const http = require('http');
const os = require('os');

const PHONE_PORT = Number(process.env.PHONE_PORT || 6116);
const DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT || 6117);

function firstLanIPv4(){
  const nets = os.networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const ni of nets[name] || []){
      if(ni && ni.family === 'IPv4' && !ni.internal && ni.address) return ni.address;
    }
  }
  return 'localhost';
}

const MAIN_URL = (process.env.PUBLIC_BASE_URL || `http://${firstLanIPv4()}:${DASHBOARD_PORT}`).replace(/\/$/, '');

http.createServer((req, res) => {
  if(req.url === '/health'){
    res.writeHead(200, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
    return res.end(JSON.stringify({ok:true, mainUrl:MAIN_URL}));
  }

  const path = (req.url || '/').replace(/^\/?/, '/');
  const target = MAIN_URL + (path === '/' ? '/mobile/index.html' : path);
  res.writeHead(302, {Location:target, 'Cache-Control':'no-store'});
  res.end('Redirecting to ' + target);
}).listen(PHONE_PORT, '0.0.0.0', () => {
  console.log(`Phone redirect helper running: http://0.0.0.0:${PHONE_PORT} -> ${MAIN_URL}/mobile/index.html`);
});
