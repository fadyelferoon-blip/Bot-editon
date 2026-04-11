const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

// All pairs with display names
const PAIRS = {
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
    // Master cache: all signals from all pairs
    this.allSignals = [];
    this.lastUpdate = null;
    this.isRefreshing = false;
    this.lastServedPair = {}; // pair -> last served timestamp (for rotation)
    this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
    this.REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // refresh every 6 hours
  }

  isCacheValid() {
    return this.lastUpdate && 
           this.allSignals.length > 0 && 
           (Date.now() - this.lastUpdate) < this.CACHE_DURATION;
  }

  // Called at startup and every 6 hours - runs in background
  async refreshAllSignals() {
    if (this.isRefreshing) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    console.log('🔄 Starting background refresh for all pairs...');
    const startTime = Date.now();
    const freshSignals = [];

    for (const [pairId, pairDisplay] of Object.entries(PAIRS)) {
      for (const orderType of ['PUT', 'CALL']) {
        try {
          const signals = await botScraper.scrapeOnePair(orderType, pairId);
          const enriched = signals.map(s => ({
            ...s,
            pairId,
            pairDisplay,
            winrate: s.winrate || 100
          }));
          freshSignals.push(...enriched);
          // Small delay between requests to avoid overloading bot server
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error(`⚠️ Skipped ${pairId} ${orderType}`);
        }
      }
      // Close browser between pairs to free memory
      await botScraper.closeBrowser();
    }

    if (freshSignals.length > 0) {
      this.allSignals = freshSignals;
      this.lastUpdate = Date.now();
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ Refresh done: ${freshSignals.length} total signals in ${elapsed}s`);
    } else {
      console.error('❌ Refresh got 0 signals, keeping old cache');
    }

    this.isRefreshing = false;
  }

  // Start background refresh loop
  startBackgroundRefresh() {
    // First refresh after 5 seconds (let server start first)
    setTimeout(() => this.refreshAllSignals(), 5000);
    // Then every 6 hours
    setInterval(() => this.refreshAllSignals(), this.REFRESH_INTERVAL);
    console.log('⏰ Background refresh scheduled');
  }

  // Get best next signal using rotation logic
  getNextSignal(userTimezone = 2) {
    if (!this.isCacheValid()) {
      return null; // Cache not ready yet
    }

    // Convert all signals to user timezone and find upcoming ones
    const converted = timezoneConverter.findNextSignal(this.allSignals, userTimezone);
    if (!converted || converted.length === 0) return null;

    // Sort by secondsUntil
    const sorted = converted.sort((a, b) => a.secondsUntil - b.secondsUntil);
    const first = sorted[0];

    // Find signals within same minute (±60 seconds)
    const sameTime = sorted.filter(s => 
      Math.abs(s.secondsUntil - first.secondsUntil) <= 60
    );

    if (sameTime.length === 1) return first;

    // Rotation: pick the pair least recently served
    let best = sameTime[0];
    let oldestTime = this.lastServedPair[best.pairId] || 0;

    for (const sig of sameTime) {
      const lastServed = this.lastServedPair[sig.pairId] || 0;
      if (lastServed < oldestTime) {
        oldestTime = lastServed;
        best = sig;
      }
    }

    return best;
  }

  recordServed(pairId) {
    this.lastServedPair[pairId] = Date.now();
  }

  getCacheStatus() {
    return {
      totalSignals: this.allSignals.length,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : null,
      isRefreshing: this.isRefreshing,
      cacheValid: this.isCacheValid(),
      pairs: Object.keys(PAIRS).map(p => ({
        pair: p,
        display: PAIRS[p],
        putCount: this.allSignals.filter(s => s.pairId === p && s.type === 'PUT').length,
        callCount: this.allSignals.filter(s => s.pairId === p && s.type === 'CALL').length,
      }))
    };
  }

  clearCache() {
    this.allSignals = [];
    this.lastUpdate = null;
    this.lastServedPair = {};
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
