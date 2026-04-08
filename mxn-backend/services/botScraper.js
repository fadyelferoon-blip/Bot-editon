const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { execSync } = require('child_process');

const ALL_PAIRS = [
  'USD_MXN_OTC_QTX', 'USD_TRY_OTC_QTX', 'US_CRUDE_OTC_QTX',
  'UK_BRENT_OTC_QTX', 'GOLD_OTC_QTX', 'SILVER_OTC_QTX',
  'USD_INR_OTC_QTX', 'BITCOIN_OTC_QTX', 'LTC_USD_OTC_QTX', 'ETH_USD_OTC_QTX'
];

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot-server.railway.app';
    this.chromiumPath = process.env.CHROMIUM_PATH || null;
  }

  findChromium() {
    if (this.chromiumPath && fs.existsSync(this.chromiumPath)) {
      console.log(`✅ Using Chromium from CHROMIUM_PATH: ${this.chromiumPath}`);
      return this.chromiumPath;
    }

    const possiblePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`✅ Found Chromium at: ${p}`);
        return p;
      }
    }

    try {
      const path = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf8' }).trim();
      if (path) {
        console.log(`✅ Found Chromium via which: ${path}`);
        return path;
      }
    } catch (_) {}

    console.error('❌ Chromium not found. Scraping will fail.');
    return null;
  }

  async initBrowser() {
    if (this.browser) return;
    const executablePath = this.findChromium();
    if (!executablePath) throw new Error('Chromium not found');

    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      protocolTimeout: 180000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
    console.log('✅ Browser launched');
  }

  async scrapeSignals(orderType = 'PUT', pair = 'USD_MXN_OTC_QTX') {
    try {
      await this.initBrowser();
      console.log(`📡 Scraping ${orderType} for ${pair}...`);
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(this.botUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.select('#cbAtivo', pair);
      await page.select('#selPercentageMin', '100');
      await page.select('#selPercentageMax', '100');
      await page.select('#selCandleTime', 'M1');
      await page.select('#selDays', '20');
      await page.select('#selOrderType', orderType);

      console.log(`✅ Form filled: ${pair}, ${orderType}`);
      await page.evaluate(() => { getHistoric(); });

      await page.waitForFunction(
        () => typeof listBestPairTimes !== 'undefined' && listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      const signals = await page.evaluate((type, pairName) => {
        return listBestPairTimes.map(s => {
          const t = s.time.split(':');
          return {
            pair: pairName,
            hour: parseInt(t[0]),
            minute: parseInt(t[1]),
            second: parseInt(t[2] || 0),
            time: s.time,
            type,
            winrate: s.winrate || 100
          };
        });
      }, orderType, pair);

      console.log(`✅ Got ${signals.length} ${orderType} signals for ${pair}`);
      await page.close();
      return signals;

    } catch (error) {
      console.error(`❌ Error scraping ${pair} ${orderType}:`, error.message);
      return [];
    }
  }

  async scrapeAllPairs(orderType = 'PUT') {
    const all = [];
    for (const pair of ALL_PAIRS) {
      try {
        const signals = await this.scrapeSignals(orderType, pair);
        all.push(...signals);
        await this.sleep(1000);
      } catch (e) {
        console.error(`⚠️ Skipping ${pair} ${orderType}: ${e.message}`);
      }
    }
    await this.closeBrowser();
    return all;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = new BotScraper();
