const fs = require('fs');
const path = require('path');

async function indexHtmlMiddleware (req, res, next) {
  if (req.url === '/') {
    const htmlPath = path.join(__dirname, '../../index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.statusCode = 200;
    res.end(html)
  }
  next();
}

module.exports = {
  indexHtmlMiddleware
}