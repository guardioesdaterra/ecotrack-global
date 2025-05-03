const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Verificar se a flag --no-trace está presente nos argumentos
const noTrace = process.argv.includes('--no-trace');

const dev = process.env.NODE_ENV !== 'production';

// Tente resolver o problema de permissão do arquivo trace
try {
  const traceDir = path.join(__dirname, '.next');
  const tracePath = path.join(traceDir, 'trace');
  
  // Verificar se o diretório .next existe e criar se necessário
  if (!fs.existsSync(traceDir)) {
    fs.mkdirSync(traceDir, { recursive: true });
  }
  
  // Verificar se já existe um arquivo trace que pode estar bloqueado
  if (fs.existsSync(tracePath)) {
    try {
      // Tente remover o arquivo existente
      fs.unlinkSync(tracePath);
      console.log('Successfully deleted existing trace file');
    } catch (err) {
      console.warn('Warning: Could not delete existing trace file:', err.message);
      // Ignorar erro e continuar
    }
  }
} catch (err) {
  console.warn('Warning during trace file cleanup:', err.message);
  // Continuar mesmo se houver erro
}

// Configurar Next.js com opções adicionais para desabilitar o trace se solicitado
const nextConfig = { 
  dev,
  conf: noTrace ? { trace: false } : {}
};

console.log(noTrace ? '> Running with --no-trace flag (tracing disabled)' : '> Tracing enabled');

const app = next(nextConfig);
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