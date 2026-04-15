const { scraper, PAIRS } = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

class SignalAnalyzer {
  constructor() {
    this.allSignals = [];
    this.lastUpdate = null;
    this.isRefreshing = false;
    this.lastServedPair = {};
    this.CACHE_DURATION = 6 * 60 * 60 * 1000;
  }

  isCacheValid() {
    return this.lastUpdate &&
           this.allSignals.length > 0 &&
           (Date.now() - this.lastUpdate) < this.CACHE_DURATION;
  }

  async refreshAllSignals() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    console.log('🔄 Refreshing signals for USD/MXN + GOLD...');

    const fresh = [];
    for (const [pairId, pairDisplay] of Object.entries(PAIRS)) {
      for (const orderType of ['PUT', 'CALL']) {
        const signals = await scraper.scrapeOnePair(orderType, pairId);
        fresh.push(...signals.map(s => ({ ...s, pairDisplay })));
        await scraper.closeBrowser();
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (fresh.length > 0) {
      this.allSignals = fresh;
      this.lastUpdate = Date.now();
      console.log(`✅ Done: ${fresh.length} signals total`);
    } else {
      console.error('❌ Got 0 signals, keeping old cache');
    }
    this.isRefreshing = false;
  }

  startBackgroundRefresh() {
    setTimeout(() => this.refreshAllSignals(), 5000);
    setInterval(() => this.refreshAllSignals(), this.CACHE_DURATION);
    console.log('⏰ Background refresh scheduled (every 6h)');
  }

  getNextSignal(userTimezone = 2) {
    if (!this.isCacheValid()) return null;

    const converted = timezoneConverter.findNextSignal(this.allSignals, userTimezone);
    if (!converted || converted.length === 0) return null;

    const sorted = converted.sort((a, b) => a.secondsUntil - b.secondsUntil);
    const first = sorted[0];
    const sameTime = sorted.filter(s => Math.abs(s.secondsUntil - first.secondsUntil) <= 60);

    if (sameTime.length === 1) return first;

    // Rotation between pairs
    let best = sameTime[0];
    let oldest = this.lastServedPair[best.pairId] || 0;
    for (const sig of sameTime) {
      const t = this.lastServedPair[sig.pairId] || 0;
      if (t < oldest) { oldest = t; best = sig; }
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
      pairs: Object.entries(PAIRS).map(([pid, display]) => ({
        pairId: pid, display,
        put:  this.allSignals.filter(s => s.pairId === pid && s.type === 'PUT').length,
        call: this.allSignals.filter(s => s.pairId === pid && s.type === 'CALL').length,
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
