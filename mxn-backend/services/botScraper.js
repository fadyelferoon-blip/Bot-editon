const puppeteer = require('puppeteer-core');

const ALL_PAIRS = [
  'USD_MXN_OTC_QTX','USD_TRY_OTC_QTX','US_CRUDE_OTC_QTX',
  'UK_BRENT_OTC_QTX','GOLD_OTC_QTX','SILVER_OTC_QTX',
  'USD_INR_OTC_QTX','BITCOIN_OTC_QTX','LTC_USD_OTC_QTX','ETH_USD_OTC_QTX'
];

const CHROMIUM_PATHS = [
  '/run/current-system/sw/bin/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  process.env.CHROMIUM_PATH
].filter(Boolean);

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot.railway.app';
    this.maxRetries = 2;
  }

  async findChromium() {
    const fs = require('fs');
    for (const p of CHROMIUM_PATHS) {
      if (fs.existsSync(p)) {
        console.log(`✅ Found Chromium at: ${p}`);
        return p;
      }
    }
    try {
      const { execSync } = require('child_process');
      const path = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf8' }).trim();
      if (path) { console.log(`✅ Found Chromium via which: ${path}`); return path; }
    } catch (_) {}
    console.warn('⚠️ Chromium not found. Falling back to puppeteer bundled Chromium.');
    return null;
  }

  async initBrowser() {
    if (this.browser) return;
    console.log('🚀 Launching browser...');
    const executablePath = await this.findChromium();
    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
        '--disable-gpu','--no-first-run','--no-zygote','--single-process','--disable-extensions'
      ],
      protocolTimeout: 180000
    });
    console.log('✅ Browser launched');
  }

  async scrapeSignals(orderType = 'PUT', pair = 'USD_MXN_OTC_QTX') {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.initBrowser();
        console.log(`📡 Scraping ${orderType} for ${pair}, attempt ${attempt+1}...`);
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(this.botUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Dynamic wait & selection
        await page.waitForSelector('#cbAtivo');
        await page.select('#cbAtivo', pair);
        await page.select('#selPercentageMin','100');
        await page.select('#selPercentageMax','100');
        await page.select('#selCandleTime','M1');
        await page.select('#selDays','20');
        await page.select('#selOrderType', orderType);

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

        await page.close();
        console.log(`✅ Got ${signals.length} ${orderType} signals for ${pair}`);
        return signals;

      } catch (error) {
        console.error(`❌ Attempt ${attempt+1} failed for ${pair} ${orderType}: ${error.message}`);
        if (attempt === this.maxRetries) throw error;
        await this.sleep(2000);
      }
    }
  }

  async scrapeAllPairs(orderType = 'PUT') {
    await this.initBrowser();
    const allSignals = [];
    for (const pair of ALL_PAIRS) {
      try {
        const signals = await this.scrapeSignals(orderType, pair);
        allSignals.push(...signals);
        await this.sleep(1000);
      } catch (e) {
        console.error(`⚠️ Skipping ${pair} ${orderType}: ${e.message}`);
      }
    }
    await this.closeBrowser();
    return allSignals;
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
