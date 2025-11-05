#!/usr/bin/env node

/**
 * Editor opener server using launch-editor
 * Automatically detects and opens files in any code editor (VS Code, Vim, IntelliJ, etc.)
 * Runs on port 3001 by default
 *
 * Usage: node tools/vscode-opener-server.js
 */

const http = require('http');
const launch = require('launch-editor');

const PORT = process.env.VSCODE_OPENER_PORT || 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle POST requests to /api/dev/editor (our custom endpoint)
  if (req.method === 'POST' && req.url === '/api/dev/editor') {
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

        // Construct the file path in the format launch-editor expects
        const fileToOpen = `${filePath}:${lineNumber}:1`;

        // Set editor preference if specified
        const editorCommand = editor === 'vscode-insiders' ? 'code-insiders' : editor;

        console.log(`[Editor Opener] Opening: ${fileToOpen}`);

        // Launch editor with callback
        launch(fileToOpen, editorCommand, (_fileName, errorMsg) => {
          if (errorMsg) {
            console.error(`[Editor Opener] Error: ${errorMsg}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: errorMsg
            }));
          } else {
            console.log(`[Editor Opener] ✓ Opened successfully`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              filePath,
              line: lineNumber
            }));
          }
        });

      } catch (error) {
        console.error(`[Editor Opener] Parse error: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[Editor Opener] Server running on http://localhost:${PORT}`);
  console.log(`[Editor Opener] Endpoint: POST http://localhost:${PORT}/api/dev/editor`);
  console.log(`[Editor Opener] Auto-detecting editor from running processes...`);
  console.log(`[Editor Opener] Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Editor Opener] Shutting down...');
  server.close(() => {
    console.log('[Editor Opener] Server stopped');
    process.exit(0);
  });
});
