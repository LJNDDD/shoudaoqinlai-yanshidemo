const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];

    // 路由映射
    let filePath;
    if (urlPath === '/' || urlPath === '/index.html') {
        filePath = path.join(ROOT, 'index.html');
    } else if (urlPath === '/demo' || urlPath === '/demo/') {
        filePath = path.join(ROOT, 'demo', 'index.html');
    } else {
        filePath = path.join(ROOT, urlPath);
    }

    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
            res.end(data);
        }
    });
}).listen(PORT, () => {
    console.log(`手到擒来产品中心已启动 → http://localhost:${PORT}/`);
});
