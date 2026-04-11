require('dotenv').config();
const express = require('express');
const cors = require('cors');
const signalAnalyzer = require('./services/signalAnalyzer');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Routes
const signalsRoutes = require('./routes/signals');
app.use('/api/signals', signalsRoutes);

app.get('/', (req, res) => res.json({
  message: 'FER3OON Signals API',
  version: '2.0.0',
  status: 'running',
  cache: signalAnalyzer.getCacheStatus()
}));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  cache: signalAnalyzer.getCacheStatus(),
  timestamp: new Date().toISOString()
}));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Bot URL: ${process.env.BOT_URL}`);
  
  // Start background signal refresh
  signalAnalyzer.startBackgroundRefresh();
});
