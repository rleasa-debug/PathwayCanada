/**
 * Copyright 2026 Pathways Canada. All Rights Reserved.
 * This code is the proprietary property of Pathways Canada and is subject to Invention Assignment Agreements.
 */

import { chromium } from 'playwright';

(async () => {
  console.log('Starting Low Digital Literacy User Persona simulation...');

  // Launch local Google Chrome executable
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to browser console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Handle alerts/dialogs
  page.on('dialog', async dialog => {
    console.log(`[BROWSER DIALOG] Alert text: "${dialog.message()}"`);
    await dialog.accept();
  });

  // Custom click simulator for Low Digital Literacy
  // 1. Adds 8000ms delay.
  // 2. Clicks 10px off-center.
  async function simulateUserClick(locator, elementName) {
    console.log(`\n[Persona Delay] Waiting 8000ms before interacting with: ${elementName}...`);
    await page.waitForTimeout(8000);

    console.log(`Locating element: ${elementName}...`);
    await locator.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll into view to ensure element is within viewport for mouse click
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`Could not find bounding box for ${elementName}`);
    }

    // Calculate off-center coordinates (+10px x and y)
    const clickX = box.x + box.width / 2 + 10;
    const clickY = box.y + box.height / 2 + 10;

    console.log(`Simulating off-center click at (${clickX.toFixed(1)}, ${clickY.toFixed(1)}) for ${elementName} (element boundary: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height})...`);
    
    // Check if the click falls within the element
    const withinX = clickX >= box.x && clickX <= (box.x + box.width);
    const withinY = clickY >= box.y && clickY <= (box.y + box.height);
    
    if (withinX && withinY) {
      console.log(`Note: Click is within the element boundaries.`);
    } else {
      console.log(`Warning: Click fell OUTSIDE the element boundaries (Miss-Click)!`);
    }

    await page.mouse.click(clickX, clickY);
  }

  try {
    // 1. Land on index.html
    console.log('\n--- Step 1: Navigating to index.html ---');
    await page.goto('http://localhost:3000/index.html');
    console.log('Landed on index.html successfully.');

    // Pre-populate localStorage with higher grades to ensure Waterloo is matched
    await page.evaluate(() => {
      const STATE_KEY = 'pathway_canada_state';
      const DEFAULT_COURSES = [
        { id: "MHF4U", name: "Advanced Functions", code: "MHF4U", grade: 99, status: "Final", type: "University Preparation", icon: "calculate", color: "blue" },
        { id: "SBI4U", name: "Biology", code: "SBI4U", grade: 99, status: "In Progress", type: "University Preparation", icon: "science", color: "green" },
        { id: "ENG3U", name: "English", code: "ENG3U", grade: 99, status: "Final", type: "University Preparation", icon: "history_edu", color: "slate", locked: true }
      ];
      const state = {
        isPro: false,
        courses: DEFAULT_COURSES,
        average: "99.0",
        matches: [],
        favorites: [],
        provinces: ['ON', 'BC', 'QC', 'AB']
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    });

    // 2. Repeat interactions with non-interactive elements (Privacy & Trust Promise)
    console.log('\n--- Step 2: Interacting with non-interactive elements ---');
    const privacyPromiseCard = page.locator('div:has-text("Privacy & Trust Promise")').last();
    
    // Click the non-interactive Privacy Promise text card 3 times
    for (let i = 1; i <= 3; i++) {
      await simulateUserClick(privacyPromiseCard, `Privacy Promise Card Click #${i}`);
    }
    console.log('Clicked non-interactive Privacy Promise card 3 times successfully.');

    // 3. Click the Google Sign-in button
    console.log('\n--- Step 3: Clicking Google Sign-in ---');
    const signInButton = page.locator('a:has-text("Sign in with Google")');
    await simulateUserClick(signInButton, 'Google Sign-in Button');

    // 4. Navigate to student-dashboard.html and attempt to click 'Waterloo Software Engineering'
    console.log('\n--- Step 4: Navigating to student-dashboard.html ---');
    await page.waitForURL('**/student-dashboard.html');
    console.log('Landed on student-dashboard.html.');

    // Wait for matches to load
    await page.waitForSelector('#matches-grid');

    // Search for Waterloo
    console.log('Searching for "Waterloo" in explorer...');
    const searchInput = page.locator('#explorer-search');
    await page.waitForTimeout(1000); // short wait before typing
    await searchInput.fill('Waterloo');

    const waterlooCard = page.locator('#explorer-grid > div', { hasText: 'Waterloo' }).first();
    await simulateUserClick(waterlooCard, 'Waterloo SE Card');

    // 5. Confirm the $29 Upgrade Modal appears
    console.log('\n--- Step 5: Verifying Upgrade Modal ---');
    const upgradeModal = page.locator('#upgrade-modal');
    await page.waitForTimeout(1000); // Wait for modal slide animation

    const isModalVisible = await upgradeModal.isVisible();
    if (!isModalVisible) {
      throw new Error('Upgrade modal is not visible! Click failed or was ignored.');
    }
    console.log('Upgrade modal is visible.');

    const modalText = await upgradeModal.textContent();
    if (!modalText.includes('Upgrade to Smart Match Pro')) {
      throw new Error('Upgrade modal title does not match!');
    }
    if (!modalText.includes('$29.00')) {
      throw new Error('Upgrade modal does not show $29.00 pricing!');
    }
    console.log('Confirmed upgrade modal shows "$29.00" pricing.');

    // 6. Click "Upgrade Now" (simulating mock payment success)
    console.log('\n--- Step 6: Simulating Purchase ---');
    const upgradeNowButton = upgradeModal.locator('a:has-text("Upgrade Now")');
    await simulateUserClick(upgradeNowButton, 'Upgrade Now Button');

    // Wait for the redirect and storage upgrade reload
    await page.waitForURL('**/student-dashboard.html**');
    await page.waitForTimeout(2000);

    // Verify state.isPro is true
    const isPro = await page.evaluate(() => {
      return window.getAppState().isPro;
    });
    console.log(`Verified state.isPro in browser context: ${isPro}`);
    if (isPro !== true) {
      throw new Error('state.isPro is not true after mock payment!');
    }

    console.log('\n=======================================');
    console.log('USER REACHED $29 PAYMENT SUCCESSFULLY!');
    console.log('=======================================');

  } catch (error) {
    console.error('\nSimulation failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Browser closed. Simulation finished.');
  }
})();
