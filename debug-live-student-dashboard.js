import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('--- LIVE JS ERROR ---');
    console.log(err.message || err);
    console.log(err.stack || '');
  });

  page.on('console', msg => {
    console.log(`[LIVE CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log('Navigating to live student dashboard directly...');
    await page.goto('https://pathways-canada-portal.netlify.app/student-dashboard.html', { waitUntil: 'load' });
    console.log('Navigation complete. Waiting 2 seconds...');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('Navigation failed:', e);
  } finally {
    await browser.close();
  }
})();
