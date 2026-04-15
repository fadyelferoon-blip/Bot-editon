require('dotenv').config();
const express = require('express');
const cors = require('cors');
const signalAnalyzer = require('./services/signalAnalyzer');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());
app.use('/api/signals', require('./routes/signals'));

app.get('/', (req, res) => res.json({
  message: 'FER3OON Signals API', version: '2.0.0',
  cache: signalAnalyzer.getCacheStatus()
}));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  cache: signalAnalyzer.getCacheStatus(),
  timestamp: new Date().toISOString()
}));

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
  console.log(`🤖 Bot: ${process.env.BOT_URL}`);
  signalAnalyzer.startBackgroundRefresh();
});
