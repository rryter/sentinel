#!/usr/bin/env node

/**
 * Simple Node.js server to open files in VS Code
 * Runs on port 3001 by default
 *
 * Usage: node tools/vscode-opener-server.js
 */

const http = require('http');
const { exec } = require('child_process');

const PORT = process.env.VSCODE_OPENER_PORT || 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only accept POST requests to /api/dev/editor
  if (req.method !== 'POST' || req.url !== '/api/dev/editor') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const { filePath, line, editor } = JSON.parse(body);

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'filePath is required' }));
        return;
      }

      const lineNumber = line || 1;
      // Support both 'vscode' and 'vscode-insiders'
      const editorCommand = editor === 'vscode-insiders' ? 'code-insiders' : 'code';
      const command = `${editorCommand} --goto "${filePath}:${lineNumber}"`;

      console.log(`[VSCode Opener] Opening in ${editorCommand}: ${filePath}:${lineNumber}`);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[VSCode Opener] Error: ${error.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message
          }));
          return;
        }

        if (stderr) {
          console.warn(`[VSCode Opener] Warning: ${stderr}`);
        }

        console.log(`[VSCode Opener] ✓ Opened successfully`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          filePath,
          line: lineNumber
        }));
      });

    } catch (error) {
      console.error(`[VSCode Opener] Parse error: ${error.message}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[VSCode Opener] Server running on http://localhost:${PORT}`);
  console.log(`[VSCode Opener] Endpoint: POST http://localhost:${PORT}/api/dev/editor`);
  console.log(`[VSCode Opener] Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[VSCode Opener] Shutting down...');
  server.close(() => {
    console.log('[VSCode Opener] Server stopped');
    process.exit(0);
  });
});
