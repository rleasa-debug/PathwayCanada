import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('--- JS ERROR ---');
    console.log(err.message || err);
    console.log(err.stack || '');
  });

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  page.on('requestfailed', request => {
    console.log(`[REQ FAILED] ${request.url()}: ${request.failure()?.errorText || 'Unknown failure'}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ERROR] ${response.status()} on ${response.url()}`);
    }
  });

  try {
    console.log('Navigating...');
    await page.goto('https://pathways-canada-portal.netlify.app', { waitUntil: 'networkidle' });
    console.log('Done.');
  } catch (e) {
    console.error('Error during goto:', e);
  } finally {
    await browser.close();
  }
})();
