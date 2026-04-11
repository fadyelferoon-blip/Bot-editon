const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

// POST /api/signals/mxn
exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, timezone } = req.body;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    console.log(`📡 Signal request: uid=${uid} tz=UTC+${userTimezone}`);

    // If cache not ready yet, return loading status
    if (!signalAnalyzer.isCacheValid()) {
      return res.json({
        success: false,
        loading: true,
        message: signalAnalyzer.isRefreshing 
          ? 'Signals are being loaded, please wait...'
          : 'No signals available yet'
      });
    }

    const signal = signalAnalyzer.getNextSignal(userTimezone);

    if (!signal) {
      return res.json({ success: false, message: 'No upcoming signals found' });
    }

    // Record this pair as served (for rotation)
    signalAnalyzer.recordServed(signal.pairId);

    console.log(`🎯 Serving: ${signal.type} ${signal.pairDisplay} in ${signal.minutesUntil}min`);

    res.json({
      success: true,
      nextSignal: {
        pair:         signal.pairDisplay,
        pairId:       signal.pairId,
        type:         signal.type,
        time:         signal.localTime,
        originalTime: signal.time,
        winrate:      signal.winrate,
        secondsUntil: signal.secondsUntil,
        minutesUntil: signal.minutesUntil,
        countdown:    timezoneConverter.formatCountdown(signal.secondsUntil)
      },
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Signal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/signals/upcoming
exports.getUpcomingSignals = async (req, res) => {
  try {
    const userTimezone = req.query.timezone ? parseInt(req.query.timezone) : 2;

    if (!signalAnalyzer.isCacheValid()) {
      return res.json({ success: false, loading: true, message: 'Loading...' });
    }

    const converted = require('../services/timezoneConverter')
      .findNextSignal(signalAnalyzer.allSignals, userTimezone)
      .sort((a, b) => a.secondsUntil - b.secondsUntil)
      .slice(0, 20);

    res.json({ success: true, signals: converted, userTimezone });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/signals/status
exports.getCacheStatus = async (req, res) => {
  res.json({ success: true, ...signalAnalyzer.getCacheStatus() });
};

// POST /api/signals/clear-cache
exports.clearCache = async (req, res) => {
  signalAnalyzer.clearCache();
  res.json({ success: true, message: 'Cache cleared. Refresh will happen in background.' });
};

// POST /api/signals/refresh
exports.forceRefresh = async (req, res) => {
  res.json({ success: true, message: 'Refresh started in background' });
  signalAnalyzer.refreshAllSignals(); // don't await - runs in background
};
