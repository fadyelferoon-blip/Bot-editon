const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

class SignalAnalyzer {
  constructor() {
    this.cache = {
      PUT:  { signals: [], lastUpdate: null },
      CALL: { signals: [], lastUpdate: null }
    };
    this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
  }

  isCacheValid(orderType) {
    const c = this.cache[orderType];
    if (!c.lastUpdate || c.signals.length === 0) return false;
    return (Date.now() - c.lastUpdate) < this.CACHE_DURATION;
  }

  updateCache(orderType, signals) {
    this.cache[orderType] = { signals, lastUpdate: Date.now() };
    console.log(`💾 Cache updated: ${orderType} (${signals.length} signals)`);
  }

  async generateMXNSignals(orderType = 'PUT') {
    if (this.isCacheValid(orderType)) {
      console.log(`✅ Using cached ${orderType} signals`);
      return this.cache[orderType].signals;
    }

    console.log(`🔄 Generating fresh ${orderType} signals...`);
    try {
      const signals = await botScraper.scrapeSignals(orderType, 'USD_MXN_OTC_QTX');
      const enriched = signals.map(s => ({ ...s, pair: 'USD/MXN', winrate: 100 }));
      this.updateCache(orderType, enriched);
      return enriched;
    } catch (error) {
      console.error(`❌ Error ${orderType}:`, error);
      if (this.cache[orderType].signals.length > 0) {
        console.log(`⚠️ Returning expired cache`);
        return this.cache[orderType].signals;
      }
      throw error;
    }
  }

  clearCache() {
    this.cache.PUT  = { signals: [], lastUpdate: null };
    this.cache.CALL = { signals: [], lastUpdate: null };
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
