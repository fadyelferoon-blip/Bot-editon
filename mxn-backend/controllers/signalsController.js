const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

/**
 * Get best signal from all pairs
 * @route POST /api/signals/mxn
 */
exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, deviceId, timezone } = req.body;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    console.log(`🔥 Fetching signals for ${uid} (UTC+${userTimezone})`);

    // Get all signals from all pairs
    const allSignals = await signalAnalyzer.getAllPairsSignals(userTimezone);

    if (!allSignals || allSignals.length === 0) {
      return res.json({ success: false, message: 'No signals available' });
    }

    // Pick best signal using rotation logic
    const nextSignal = signalAnalyzer.getBestSignal(allSignals);

    if (!nextSignal) {
      return res.json({ success: false, message: 'No signals available for today' });
    }

    // Record this pair as recently used
    signalAnalyzer.recordSignalServed(nextSignal.pair);

    console.log(`🎯 NEXT SIGNAL: ${nextSignal.type} on ${nextSignal.pairDisplay} @ ${nextSignal.localTime} (${nextSignal.minutesUntil}min)`);

    res.json({
      success: true,
      nextSignal: {
        pair: nextSignal.pairDisplay,
        pairId: nextSignal.pair,
        type: nextSignal.type,
        time: nextSignal.localTime,
        originalTime: nextSignal.time,
        winrate: nextSignal.winrate,
        secondsUntil: nextSignal.secondsUntil,
        minutesUntil: nextSignal.minutesUntil,
        countdown: timezoneConverter.formatCountdown(nextSignal.secondsUntil)
      },
      userTimezone,
      currentTime: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating signals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signals',
      error: error.message
    });
  }
};

/**
 * Get upcoming signals
 * @route GET /api/signals/upcoming
 */
exports.getUpcomingSignals = async (req, res) => {
  try {
    const { timezone } = req.query;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    const allSignals = await signalAnalyzer.getAllPairsSignals(userTimezone);
    const sorted = allSignals.sort((a, b) => a.secondsUntil - b.secondsUntil);

    res.json({
      success: true,
      signals: sorted.slice(0, 20),
      userTimezone,
      count: sorted.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get signals', error: error.message });
  }
};

/**
 * Clear cache
 * @route POST /api/signals/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    signalAnalyzer.clearCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear cache', error: error.message });
  }
};
