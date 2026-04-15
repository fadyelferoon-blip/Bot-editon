const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, timezone } = req.body;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    if (!signalAnalyzer.isCacheValid()) {
      return res.json({
        success: false,
        loading: true,
        message: signalAnalyzer.isRefreshing
          ? 'Loading signals, please wait...'
          : 'No signals available yet'
      });
    }

    const signal = signalAnalyzer.getNextSignal(userTimezone);
    if (!signal) return res.json({ success: false, message: 'No upcoming signals' });

    signalAnalyzer.recordServed(signal.pairId);
    console.log(`🎯 ${signal.type} ${signal.pairDisplay} in ${signal.minutesUntil}min`);

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

  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getUpcomingSignals = async (req, res) => {
  try {
    const tz = req.query.timezone ? parseInt(req.query.timezone) : 2;
    if (!signalAnalyzer.isCacheValid())
      return res.json({ success: false, loading: true });
    const all = timezoneConverter.findNextSignal(signalAnalyzer.allSignals, tz)
      .sort((a, b) => a.secondsUntil - b.secondsUntil).slice(0, 20);
    res.json({ success: true, signals: all, userTimezone: tz });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getCacheStatus = (req, res) =>
  res.json({ success: true, ...signalAnalyzer.getCacheStatus() });

exports.clearCache = (req, res) => {
  signalAnalyzer.clearCache();
  res.json({ success: true, message: 'Cache cleared' });
};

exports.forceRefresh = (req, res) => {
  res.json({ success: true, message: 'Refresh started' });
  signalAnalyzer.refreshAllSignals();
};
