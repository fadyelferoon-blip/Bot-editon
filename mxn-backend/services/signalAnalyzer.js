const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

// Display names for pairs
const PAIR_DISPLAY = {
  'USD_MXN_OTC_QTX': 'USD/MXN',
  'USD_TRY_OTC_QTX': 'USD/TRY',
  'US_CRUDE_OTC_QTX': 'US CRUDE',
  'UK_BRENT_OTC_QTX': 'UK BRENT',
  'GOLD_OTC_QTX':     'GOLD',
  'SILVER_OTC_QTX':   'SILVER',
  'USD_INR_OTC_QTX':  'USD/INR',
  'BITCOIN_OTC_QTX':  'BITCOIN',
  'LTC_USD_OTC_QTX':  'LTC/USD',
  'ETH_USD_OTC_QTX':  'ETH/USD'
};

class SignalAnalyzer {
  constructor() {
    // Cache per pair per orderType
    this.cache = {};
    // Track last signal time per pair to implement rotation
    this.lastSignalTime = {}; // pair -> timestamp of last served signal
    this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
  }

  getCacheKey(pair, orderType) {
    return `${pair}_${orderType}`;
  }

  isCacheValid(pair, orderType) {
    const key = this.getCacheKey(pair, orderType);
    const cache = this.cache[key];
    if (!cache || !cache.lastUpdate || cache.signals.length === 0) return false;
    return (Date.now() - cache.lastUpdate) < this.CACHE_DURATION;
  }

  updateCache(pair, orderType, signals) {
    const key = this.getCacheKey(pair, orderType);
    this.cache[key] = { signals, lastUpdate: Date.now() };
    console.log(`💾 Cache updated: ${pair} ${orderType} (${signals.length} signals)`);
  }

  getFromCache(pair, orderType) {
    const key = this.getCacheKey(pair, orderType);
    return this.cache[key]?.signals || [];
  }

  async generateSignals(pair, orderType) {
    if (this.isCacheValid(pair, orderType)) {
      console.log(`✅ Using cached ${pair} ${orderType}`);
      return this.getFromCache(pair, orderType);
    }

    console.log(`🔄 Generating fresh ${pair} ${orderType} signals...`);
    try {
      const signals = await botScraper.scrapeSignals(orderType, pair);
      const enriched = signals.map(s => ({
        ...s,
        pair: pair,
        pairDisplay: PAIR_DISPLAY[pair] || pair,
        winrate: 100
      }));
      this.updateCache(pair, orderType, enriched);
      return enriched;
    } catch (error) {
      console.error(`❌ Error ${pair} ${orderType}:`, error);
      const cached = this.getFromCache(pair, orderType);
      if (cached.length > 0) {
        console.log(`⚠️ Returning expired cache for ${pair} ${orderType}`);
        return cached;
      }
      return [];
    }
  }

  // Get all signals for all pairs, both PUT and CALL
  async getAllPairsSignals(userTimezone = 2) {
    const ALL_PAIRS = Object.keys(PAIR_DISPLAY);
    const allConverted = [];

    for (const pair of ALL_PAIRS) {
      for (const orderType of ['PUT', 'CALL']) {
        try {
          const signals = await this.generateSignals(pair, orderType);
          if (signals.length > 0) {
            const converted = timezoneConverter.findNextSignal(signals, userTimezone);
            allConverted.push(...converted);
          }
        } catch (e) {
          console.error(`⚠️ Skipping ${pair} ${orderType}`);
        }
      }
    }

    return allConverted;
  }

  // Pick best signal using rotation logic:
  // If two signals are at same minute, prefer the pair that wasn't recently used
  getBestSignal(allSignals) {
    if (allSignals.length === 0) return null;

    // Sort by secondsUntil
    const sorted = allSignals.sort((a, b) => a.secondsUntil - b.secondsUntil);

    // Group signals that are within the same minute (±60 seconds of the first)
    const first = sorted[0];
    const sameTime = sorted.filter(s => Math.abs(s.secondsUntil - first.secondsUntil) <= 60);

    if (sameTime.length === 1) return first;

    // Multiple signals at same time — pick the pair that was least recently used
    const now = Date.now();
    let best = sameTime[0];
    let oldestLastUsed = this.lastSignalTime[best.pair] || 0;

    for (const signal of sameTime) {
      const lastUsed = this.lastSignalTime[signal.pair] || 0;
      if (lastUsed < oldestLastUsed) {
        oldestLastUsed = lastUsed;
        best = signal;
      }
    }

    return best;
  }

  // Record that a signal was served for a pair
  recordSignalServed(pair) {
    this.lastSignalTime[pair] = Date.now();
  }

  clearCache() {
    this.cache = {};
    this.lastSignalTime = {};
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
