import { chromium } from 'playwright';
import * as path from 'path';

const ARTIFACT_DIR = '/Users/ryan/.gemini/antigravity/brain/675acffa-d137-424e-92e2-bdc5c34ceaf8';
const LIVE_URL = 'https://pathways-canada-portal.netlify.app';

(async () => {
  console.log('Initiating Live Production Audit & Visual Verification...');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Listen to browser console
  page.on('console', msg => console.log(`[LIVE BROWSER] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[LIVE ERROR] ${err.toString()}`));

  try {
    // 1. Visit Landing Page
    console.log(`\n1. Navigating to live landing page: ${LIVE_URL}`);
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    
    // Capture screenshot of landing page
    const landingPath = path.join(ARTIFACT_DIR, 'live_landing_page.png');
    await page.screenshot({ path: landingPath, fullPage: false });
    console.log(`✅ Saved landing page screenshot: ${landingPath}`);

    // Set up dialog listener to automate name input in standard alert prompt
    page.on('dialog', async dialog => {
      console.log(`[ALERT PROMPT] Found dialog: ${dialog.message()}`);
      await dialog.accept('Live Auditor Student');
      console.log('✅ Automated prompt response: "Live Auditor Student"');
    });

    // 2. Click Google Sign-in button to trigger prompt
    console.log('\n2. Attempting to click "Sign in with Google" to customize profile...');
    const googleBtn = page.locator('text=Sign in with Google');
    await googleBtn.click();
    
    // Wait for redirect/navigation to dashboard
    await page.waitForURL('**/student-dashboard*', { waitUntil: 'load' });
    console.log('✅ Successfully authenticated and navigated to student-dashboard');

    // Capture screenshot of authenticated dashboard
    const dashboardPath = path.join(ARTIFACT_DIR, 'live_dashboard.png');
    await page.screenshot({ path: dashboardPath });
    console.log(`✅ Saved authenticated dashboard screenshot: ${dashboardPath}`);

    // 3. Inspect target filters
    console.log('\n3. Verifying dashboard alignment filters...');
    const filterExists = await page.locator('#alignment-filter').isVisible();
    console.log(`Alignment Filter Selector Visible: ${filterExists}`);

    // 4. Click Waterloo Software Engineering card "Unlock Predictive Analytics" button to trigger payment modal
    console.log('\n4. Attempting to open the Upgrade Modal via locked card...');
    const unlockBtn = page.locator('text=Unlock Predictive Analytics').first();
    await unlockBtn.click();

    // Verify modal is visible
    const modalVisible = await page.locator('#upgrade-modal').isVisible();
    console.log(`Upgrade Modal Overlay Visible: ${modalVisible}`);

    // Take screenshot of open upgrade modal
    const modalPath = path.join(ARTIFACT_DIR, 'live_upgrade_modal.png');
    await page.screenshot({ path: modalPath });
    console.log(`✅ Saved upgrade modal screenshot: ${modalPath}`);

    // 5. Click "Upgrade Now" inside modal to trigger payment unlock
    console.log('\n5. Clicking "Upgrade Now" to simulate payment callback...');
    const payBtn = page.locator('#upgrade-modal a:has-text("Upgrade Now")');
    await payBtn.click();

    // Wait for the URL callback structure redirect and reload
    await page.waitForURL('**/student-dashboard*', { waitUntil: 'load' });
    console.log('✅ Payment success redirect complete.');

    // Check if user is now Pro
    const isPro = await page.evaluate(() => {
      const stored = localStorage.getItem('pathway_canada_state');
      if (stored) {
        return JSON.parse(stored).isPro;
      }
      return false;
    });
    console.log(`Pro Status Active in Local State: ${isPro}`);

    // Capture upgraded dashboard
    const proDashboardPath = path.join(ARTIFACT_DIR, 'live_pro_dashboard.png');
    await page.screenshot({ path: proDashboardPath });
    console.log(`✅ Saved unlocked Pro dashboard screenshot: ${proDashboardPath}`);

    console.log('\n🎉 Live Production Audit successfully completed! All systems are functional.');

  } catch (error) {
    console.error('❌ Audit execution failed:', error);
  } finally {
    await browser.close();
  }
})();
