/**
 * HN AOV Web Radar Relay Server
 * Replicates the protocol of https://antih4x.solstice.wtf/hn-aov/webmap
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Rooms storage
// code -> { code, publishToken, publisherSocket, spectators: Set(), lastFrame: Buffer, createdAt }
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Ensure hero portrait directory exists
const HEROES_DIR = path.join(PUBLIC_DIR, 'assets', 'heroes');
if (!fs.existsSync(HEROES_DIR)) {
  fs.mkdirSync(HEROES_DIR, { recursive: true });
}

// Download missing hero portrait on demand
function fetchHeroPortrait(heroId, destPath, callback) {
  const remoteUrl = `https://antih4x.solstice.wtf/hn-aov/webmap/assets/heroes/${heroId}.png`;
  https.get(remoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => callback(null, destPath));
      });
    } else {
      callback(new Error(`Status ${res.statusCode}`));
    }
  }).on('error', err => callback(err));
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API 1: Challenge
  if (pathname === '/hn-aov/webmap/api/challenge') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ nonce: 'bypass_ok', detail: '' }));
  }

  // API 2: Publish (create room)
  if (pathname === '/hn-aov/webmap/api/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let code = generateCode();
      while (rooms.has(code)) {
        code = generateCode();
      }
      const publishToken = 'token_' + Math.random().toString(36).substring(2);
      rooms.set(code, {
        code,
        publishToken,
        publisherSocket: null,
        spectators: new Set(),
        lastFrame: null,
        createdAt: Date.now()
      });

      console.log(`[ROOM CREATED] Code: ${code} | Active rooms: ${rooms.size}`);

      const host = req.headers['host'] || `localhost:${PORT}`;
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const watchUrl = `${proto}://${host}/hn-aov/webmap/?room=${code}`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        protocol: 2,
        code: code,
        watch_url: watchUrl,
        publish_token: publishToken
      }));
    });
    return;
  }

  // Static files & viewer web page
  let filePath = '';
  if (pathname === '/' || pathname === '/hn-aov/webmap' || pathname === '/hn-aov/webmap/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else {
    let relPath = pathname.replace(/^\/hn-aov\/webmap\//, '/');
    filePath = path.join(PUBLIC_DIR, relPath);
  }

  // Check if file is a hero portrait that needs fetching
  const heroMatch = pathname.match(/\/heroes\/(\d+)\.png$/);
  if (heroMatch && !fs.existsSync(filePath)) {
    const heroId = heroMatch[1];
    return fetchHeroPortrait(heroId, filePath, (err, savedPath) => {
      if (!err && fs.existsSync(savedPath)) {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        return fs.createReadStream(savedPath).pipe(res);
      }
      // Fallback
      const fallback = path.join(PUBLIC_DIR, 'assets', 'icons', 'portrait-unknown.svg');
      if (fs.existsSync(fallback)) {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        return fs.createReadStream(fallback).pipe(res);
      }
      res.writeHead(404);
      res.end('Not Found');
    });
  }

  // Normal static file serving
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If asking for html or unknown subpath, fallback to index.html
      const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(fallbackIndex)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(fallbackIndex).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Setup WebSocket Servers
const wssPublisher = new WebSocketServer({ noServer: true });
const wssSpectator = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // 1. Publisher stream from iPhone: /hn-aov/webmap/publish/<room_code>
  const pubMatch = pathname.match(/\/hn-aov\/webmap\/publish\/([A-Za-z0-9]+)/);
  if (pubMatch) {
    const roomCode = pubMatch[1].toUpperCase();
    wssPublisher.handleUpgrade(req, socket, head, ws => {
      wssPublisher.emit('connection', ws, req, roomCode);
    });
    return;
  }

  // 2. Spectator viewer stream for friends: /hn-aov/webmap/ws/<room_code>
  const specMatch = pathname.match(/\/hn-aov\/webmap\/ws\/([A-Za-z0-9]+)/);
  if (specMatch) {
    const roomCode = specMatch[1].toUpperCase();
    wssSpectator.handleUpgrade(req, socket, head, ws => {
      wssSpectator.emit('connection', ws, req, roomCode);
    });
    return;
  }

  socket.destroy();
});

// Publisher Connection (iPhone)
wssPublisher.on('connection', (ws, req, roomCode) => {
  let room = rooms.get(roomCode);
  if (!room) {
    // If room didn't exist or expired, auto-create it
    room = {
      code: roomCode,
      publishToken: 'auto',
      publisherSocket: ws,
      spectators: new Set(),
      lastFrame: null,
      createdAt: Date.now()
    };
    rooms.set(roomCode, room);
  } else {
    room.publisherSocket = ws;
  }

  console.log(`[PUBLISHER CONNECTED] iPhone connected to room: ${roomCode}`);

  ws.on('message', (message, isBinary) => {
    // Binary packet: radar coordinates
    if (isBinary) {
      room.lastFrame = message;
      // Broadcast immediately to all spectators
      for (const spectator of room.spectators) {
        if (spectator.readyState === WebSocket.OPEN) {
          spectator.send(message, { binary: true });
        }
      }
      return;
    }

    // Text message: control packets (init, ping, auth)
    try {
      const text = message.toString();
      const p = JSON.parse(text);

      // Initial handshake
      if (p.token || p.ack) {
        ws.send(JSON.stringify({
          type: 'ready',
          protocol: 2,
          frame_ack: true
        }));
        return;
      }

      // Ping / pong
      if (p.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          at: p.at
        }));
        return;
      }

      // Auth refresh loop
      if (p.type === 'auth') {
        ws.send(JSON.stringify({
          type: 'authorized'
        }));
        return;
      }
    } catch (e) {
      console.error('[PUBLISHER MSG ERROR]', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`[PUBLISHER DISCONNECTED] iPhone left room: ${roomCode}`);
    if (room.publisherSocket === ws) {
      room.publisherSocket = null;
    }
  });

  ws.on('error', err => {
    console.error(`[PUBLISHER SOCKET ERROR] ${roomCode}:`, err.message);
  });
});

// Spectator Connection (Friend browser)
wssSpectator.on('connection', (ws, req, roomCode) => {
  let room = rooms.get(roomCode);
  if (!room) {
    room = {
      code: roomCode,
      publishToken: 'auto',
      publisherSocket: null,
      spectators: new Set(),
      lastFrame: null,
      createdAt: Date.now()
    };
    rooms.set(roomCode, room);
  }

  room.spectators.add(ws);
  console.log(`[SPECTATOR JOINED] Room: ${roomCode} | Viewers: ${room.spectators.size}`);

  // Send latest frame immediately if available so viewer doesn't wait for next tick
  if (room.lastFrame && ws.readyState === WebSocket.OPEN) {
    ws.send(room.lastFrame, { binary: true });
  }

  ws.on('message', message => {
    try {
      const p = JSON.parse(message.toString());
      if (p.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', at: p.at }));
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    room.spectators.delete(ws);
    console.log(`[SPECTATOR LEFT] Room: ${roomCode} | Viewers remaining: ${room.spectators.size}`);
  });

  ws.on('error', err => {
    console.error(`[SPECTATOR SOCKET ERROR] ${roomCode}:`, err.message);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log(`🚀 HN AOV Web Radar Relay Server running on port ${PORT}`);
  console.log(`👉 Local URL: http://localhost:${PORT}/hn-aov/webmap/`);
  console.log('==================================================');
});
