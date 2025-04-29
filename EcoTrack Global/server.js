const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

try {
  // Check if certificate files exist
  const certPath = path.join(__dirname, 'localhost.pem');
  const keyPath = path.join(__dirname, 'localhost-key.pem');
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    // Self-signed certificate for development
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    app.prepare().then(() => {
      createServer(httpsOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on https://localhost:3000');
        console.log('> Using HTTPS with self-signed certificate');
      });
    });
  } else {
    // Fallback to HTTP if certificates don't exist
    console.warn('Certificate files not found. Falling back to HTTP server.');
    console.warn('Note: Geolocation features may not work without HTTPS.');
    console.warn('Run "npm run cert" to generate self-signed certificates.');
    
    app.prepare().then(() => {
      createHttpServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3000');
      });
    });
  }
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
} 