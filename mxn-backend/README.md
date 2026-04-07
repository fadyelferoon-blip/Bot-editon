# 🎯 Standalone MXN Signals Backend

## 📁 Project Structure

```
mxn-signals-backend/
├── package.json
├── .env
├── nixpacks.toml
├── server.js
│
├── services/
│   ├── botScraper.js
│   ├── timezoneConverter.js
│   └── signalAnalyzer.js
│
├── controllers/
│   └── signalsController.js
│
└── routes/
    └── signals.js
```

---

## 📦 Files to Create

### **1. package.json**

```json
{
  "name": "mxn-signals-backend",
  "version": "1.0.0",
  "description": "MXN Trading Signals Service",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "puppeteer": "^21.0.0",
    "puppeteer-core": "^21.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

### **2. .env**

```bash
PORT=5001
BOT_URL=https://fer3oon-bot.railway.app
CORS_ORIGIN=*
NODE_ENV=production
```

---

### **3. nixpacks.toml**

```toml
[phases.setup]
aptPkgs = ["chromium", "chromium-sandbox"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

---

### **4. server.js**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const signalsRoutes = require('./routes/signals');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'MXN Signals Backend',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/signals', signalsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 MXN Signals Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 Bot URL: ${process.env.BOT_URL}`);
});
```

---

### **5. routes/signals.js**

```javascript
const express = require('express');
const router = express.Router();
const signalsController = require('../controllers/signalsController');

// Get MXN signal with timezone support
router.post('/mxn', signalsController.generateMXNSignals);

// Get upcoming signals
router.get('/upcoming', signalsController.getUpcomingSignals);

// Clear cache
router.post('/clear-cache', signalsController.clearCache);

module.exports = router;
```

---

## 🚀 Deployment

### **Railway Deployment:**

1. Create new Railway project: "MXN-Signals-Backend"
2. Deploy from GitHub or upload files
3. Railway will auto-detect Node.js
4. Environment variables will be read from .env

### **URL:**
```
https://mxn-signals-backend.railway.app
```

---

## 📱 Flutter Integration

### **In Flutter app, add new constant:**

```dart
// lib/core/constants.dart

class AppConstants {
  // Old backend (existing)
  static const String baseUrl = 'https://fnamg11-production.up.railway.app';
  
  // New MXN signals backend
  static const String mxnSignalsUrl = 'https://mxn-signals-backend.railway.app';
}
```

### **In signals_service.dart:**

```dart
class SignalsService {
  // Use NEW backend for MXN signals
  final String _baseUrl = AppConstants.mxnSignalsUrl;
  
  Future<Map<String, dynamic>> getMXNSignal(String uid, String deviceId) async {
    final url = Uri.parse('$_baseUrl/api/signals/mxn');
    // ... rest of code
  }
}
```

---

## ✅ Benefits

✅ **No impact on old backend** - Old system continues working
✅ **Independent deployment** - Update signals without touching main app
✅ **Separate scaling** - MXN backend can scale independently
✅ **Easy rollback** - If issues, just point back to old backend
✅ **Clean separation** - Signals logic isolated from user management

---

## 🔗 Communication Flow

```
Flutter App
    ↓
    ├─→ Old Backend (users, auth, stats, random signals)
    │   https://fnamg11-production.up.railway.app
    │
    └─→ New Backend (MXN real signals only)
        https://mxn-signals-backend.railway.app
```

---

## 🧪 Testing

```bash
# Test new backend
curl https://mxn-signals-backend.railway.app/health

# Test MXN signals
curl -X POST https://mxn-signals-backend.railway.app/api/signals/mxn \
  -H "Content-Type: application/json" \
  -d '{"uid":"123","deviceId":"abc","timezone":"2"}'
```

---

## 📊 Summary

| Component | Old Backend | New Backend |
|-----------|-------------|-------------|
| Users | ✅ | ❌ |
| Auth | ✅ | ❌ |
| Stats | ✅ | ❌ |
| Random Signals | ✅ | ❌ |
| MXN Signals | ❌ | ✅ |
| Bot Scraper | ❌ | ✅ |
| Timezone | ❌ | ✅ |

**Perfect separation! 🎯**
