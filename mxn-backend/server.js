require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');

const signalsRoutes = require('./routes/signals');

const app = express();
const PORT = process.env.PORT || 5001;

function findChromiumPath() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/run/current-system/sw/bin/chromium',
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  const cmds = ['which chromium', 'which chromium-browser', 'which google-chrome'];
  for (const cmd of cmds) {
    try {
      const r = execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim();
      if (r) return r;
    } catch (_) {}
  }

  // Deep search in nix store - find the actual binary
  try {
    const r = execSync(
      'find /nix/store -name "chromium" -type f 2>/dev/null | grep "bin/chromium$" | head -1',
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    if (r) return r;
  } catch (_) {}

  try {
    const r = execSync(
      'find /nix/store -name "chromium-browser" -type f 2>/dev/null | head -1',
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    if (r) return r;
  } catch (_) {}

  // List everything in nix store with chrom to debug
  try {
    const ls = execSync(
      'find /nix/store -maxdepth 2 -name "*chrom*" 2>/dev/null | head -10',
      { encoding: 'utf8', timeout: 8000 }
    ).trim();
    console.log('🔍 Nix chrom entries:', ls);
  } catch (_) {}

  return null;
}

const chromiumPath = findChromiumPath();
if (chromiumPath) {
  process.env.CHROMIUM_PATH = chromiumPath;
  console.log(`✅ Chromium found: ${chromiumPath}`);
} else {
  console.error('❌ Chromium NOT found! Set CHROMIUM_PATH env variable.');
}

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'MXN Signals Backend',
    version: '1.0.0',
    chromium: chromiumPath || 'NOT FOUND',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'FER3OON MXN Signals API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      signals: '/api/signals/mxn',
      upcoming: '/api/signals/upcoming',
      clearCache: '/api/signals/clear-cache'
    }
  });
});

app.use('/api/signals', signalsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 MXN Signals Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 Bot URL: ${process.env.BOT_URL}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});
