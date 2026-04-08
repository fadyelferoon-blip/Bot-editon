const puppeteer = require('puppeteer');

// All supported pairs
const ALL_PAIRS = [
  'USD_MXN_OTC_QTX',
  'USD_TRY_OTC_QTX',
  'US_CRUDE_OTC_QTX',
  'UK_BRENT_OTC_QTX',
  'GOLD_OTC_QTX',
  'SILVER_OTC_QTX',
  'USD_INR_OTC_QTX',
  'BITCOIN_OTC_QTX',
  'LTC_USD_OTC_QTX',
  'ETH_USD_OTC_QTX'
];

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot.railway.app';
  }

  async initBrowser() {
    if (this.browser) return;
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
    console.log('✅ Browser launched successfully');
  }

  async scrapeSignals(orderType = 'PUT', pair = 'USD_MXN_OTC_QTX') {
    try {
      await this.initBrowser();
      console.log(`📡 Scraping ${orderType} signals for ${pair}...`);

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      console.log(`🌐 Navigating to ${this.botUrl}...`);
      await page.goto(this.botUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.select('#cbAtivo', pair);
      await page.waitForTimeout(500);
      await page.select('#selPercentageMin', '100');
      await page.waitForTimeout(500);
      await page.select('#selPercentageMax', '100');
      await page.waitForTimeout(500);
      await page.select('#selCandleTime', 'M1');
      await page.waitForTimeout(500);
      await page.select('#selDays', '20');
      await page.waitForTimeout(500);
      await page.select('#selOrderType', orderType);
      await page.waitForTimeout(500);

      console.log(`✅ Form filled: ${pair}, 100%, M1, 20 days, ${orderType}`);

      await page.evaluate(() => { getHistoric(); });

      console.log('⏳ Waiting for analysis...');
      await page.waitForFunction(
        () => typeof listBestPairTimes !== 'undefined' && listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      const signals = await page.evaluate((type, pairName) => {
        return listBestPairTimes.map(signal => {
          const timeParts = signal.time.split(':');
          return {
            pair: pairName,
            hour: parseInt(timeParts[0]),
            minute: parseInt(timeParts[1]),
            second: parseInt(timeParts[2] || 0),
            time: signal.time,
            type: type,
            winrate: signal.winrate || 100
          };
        });
      }, orderType, pair);

      console.log(`✅ Extracted ${signals.length} ${orderType} signals for ${pair}`);
      await page.close();
      await this.closeBrowser();
      return signals;

    } catch (error) {
      console.error(`❌ Error scraping ${pair} ${orderType}:`, error);
      await this.closeBrowser();
      throw error;
    }
  }

  // Scrape all pairs for one order type
  async scrapeAllPairs(orderType = 'PUT') {
    const allSignals = [];
    for (const pair of ALL_PAIRS) {
      try {
        console.log(`🔄 Scraping ${pair} ${orderType}...`);
        const signals = await this.scrapeSignals(orderType, pair);
        allSignals.push(...signals);
        await this.sleep(1000);
      } catch (e) {
        console.error(`⚠️ Failed ${pair} ${orderType}, skipping...`);
      }
    }
    return allSignals;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BotScraper();
