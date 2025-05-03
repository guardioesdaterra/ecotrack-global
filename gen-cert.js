const fs = require('fs');
const { execSync } = require('child_process');

console.log('Generating self-signed certificate for local development...');

try {
  // Check if mkcert is installed
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    console.log('mkcert is already installed');
  } catch (e) {
    console.log('mkcert is not installed. Please install mkcert:');
    console.log('- Windows (with chocolatey): choco install mkcert');
    console.log('- macOS: brew install mkcert');
    console.log('- Linux: use your package manager or see https://github.com/FiloSottile/mkcert');
    process.exit(1);
  }

  // Generate certificate
  execSync('mkcert -install', { stdio: 'inherit' });
  execSync('mkcert localhost 127.0.0.1 ::1', { stdio: 'inherit' });
  
  // Rename files to match what the server.js expects
  if (fs.existsSync('localhost+2.pem')) {
    fs.renameSync('localhost+2.pem', 'localhost.pem');
  }
  if (fs.existsSync('localhost+2-key.pem')) {
    fs.renameSync('localhost+2-key.pem', 'localhost-key.pem');
  }
  
  console.log('Certificate generated successfully!');
  console.log('You can now run "npm run dev:https" to start the server with HTTPS.');
} catch (error) {
  console.error('Error generating certificate:', error.message);
  process.exit(1);
} 