const puppeteer = require('puppeteer');

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot-server.railway.app';
  }

  async initBrowser() {
    if (this.browser) return;

    console.log('🚀 Launching browser...');

    this.browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 180000,

      // 👇 مهم علشان Railway
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

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

      await page.goto(this.botUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

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

      await page.evaluate(() => {
        getHistoric();
      });

      await page.waitForFunction(
        () =>
          typeof listBestPairTimes !== 'undefined' &&
          listBestPairTimes.length > 0,
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

      console.log(`✅ Got ${signals.length} ${orderType} for ${pair}`);

      await page.close();
      await this.closeBrowser();

      return signals;

    } catch (error) {
      console.error(`❌ Error ${pair} ${orderType}:`, error.message);

      await this.closeBrowser();

      return [];
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = new BotScraper();
