const puppeteer = require('puppeteer');

const PAIRS = {
  'USD_MXN_OTC_QTX': 'USD/MXN',
  'GOLD_OTC_QTX':    'GOLD'
};

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://fer3oon-bot-server.railway.app';
  }

  async initBrowser() {
    if (this.browser) return;
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 180000,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--no-first-run', '--no-zygote',
        '--single-process', '--disable-extensions'
      ]
    });
    console.log('✅ Browser launched');
  }

  async scrapeOnePair(orderType, pairId) {
    let page = null;
    try {
      await this.initBrowser();
      page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(this.botUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.select('#cbAtivo', pairId);          await page.waitForTimeout(400);
      await page.select('#selPercentageMin', '100');   await page.waitForTimeout(400);
      await page.select('#selPercentageMax', '100');   await page.waitForTimeout(400);
      await page.select('#selCandleTime', 'M1');       await page.waitForTimeout(400);
      await page.select('#selDays', '20');              await page.waitForTimeout(400);
      await page.select('#selOrderType', orderType);   await page.waitForTimeout(400);

      await page.evaluate(() => { getHistoric(); });

      await page.waitForFunction(
        () => typeof listBestPairTimes !== 'undefined' && listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      const signals = await page.evaluate((type, pid) => {
        return listBestPairTimes.map(s => {
          const t = s.time.split(':');
          return {
            pairId: pid,
            hour: parseInt(t[0]),
            minute: parseInt(t[1]),
            second: parseInt(t[2] || 0),
            time: s.time,
            type,
            winrate: s.winrate || 100
          };
        });
      }, orderType, pairId);

      console.log(`  ✅ ${pairId} ${orderType}: ${signals.length} signals`);
      await page.close();
      return signals;

    } catch (e) {
      console.error(`  ❌ ${pairId} ${orderType}: ${e.message}`);
      if (page) await page.close().catch(() => {});
      return [];
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }
}

module.exports = { scraper: new BotScraper(), PAIRS };
