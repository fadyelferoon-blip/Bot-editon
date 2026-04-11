const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, deviceId, timezone } = req.body;
    const userTimezone = timezone ? parseInt(timezone) : 2;

    console.log(`🔥 Fetching MXN signals for ${uid} (UTC+${userTimezone})`);

    const putSignals  = await signalAnalyzer.generateMXNSignals('PUT');
    const callSignals = await signalAnalyzer.generateMXNSignals('CALL');

    const convertedPut  = timezoneConverter.findNextSignal(putSignals,  userTimezone);
    const convertedCall = timezoneConverter.findNextSignal(callSignals, userTimezone);

    const nextPut  = convertedPut[0];
    const nextCall = convertedCall[0];

    let nextSignal = null;
    if (nextPut && nextCall) {
      nextSignal = nextPut.secondsUntil < nextCall.secondsUntil ? nextPut : nextCall;
    } else {
      nextSignal = nextPut || nextCall;
    }

    if (!nextSignal) {
      return res.json({ success: false, message: 'No signals available' });
    }

    console.log(`🎯 NEXT: ${nextSignal.type} USD/MXN @ ${nextSignal.localTime} (${nextSignal.minutesUntil}min)`);

    res.json({
      success: true,
      nextSignal: {
        pair: 'USD/MXN',
        pairId: 'USD_MXN_OTC_QTX',
        type: nextSignal.type,
        time: nextSignal.localTime,
        originalTime: nextSignal.time,
        winrate: nextSignal.winrate,
        secondsUntil: nextSignal.secondsUntil,
        minutesUntil: nextSignal.minutesUntil,
        countdown: timezoneConverter.formatCountdown(nextSignal.secondsUntil)
      },
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate signals', error: error.message });
  }
};

exports.getUpcomingSignals = async (req, res) => {
  try {
    const userTimezone = req.query.timezone ? parseInt(req.query.timezone) : 2;
    const put  = await signalAnalyzer.generateMXNSignals('PUT');
    const call = await signalAnalyzer.generateMXNSignals('CALL');
    const all  = [...timezoneConverter.findNextSignal(put, userTimezone),
                  ...timezoneConverter.findNextSignal(call, userTimezone)]
                 .sort((a, b) => a.secondsUntil - b.secondsUntil);
    res.json({ success: true, signals: all.slice(0, 20), userTimezone, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed', error: error.message });
  }
};

exports.clearCache = async (req, res) => {
  try {
    signalAnalyzer.clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
