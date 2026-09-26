/**
 * Copyright 2026 Pathways Canada. All Rights Reserved.
 * This code is the proprietary property of Pathways Canada and is subject to Invention Assignment Agreements.
 */

import { chromium } from 'playwright';

(async () => {
  console.log('Starting browser automation test...');

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

  try {
    // 1. Land on index.html
    console.log('\n--- Step 1: Navigating to index.html ---');
    await page.goto('http://localhost:3000/index.html');
    console.log('Landed on index.html successfully.');

    // Pre-populate localStorage with higher grades so Waterloo Software Engineering has a high match score (>80%) and renders in #matches-grid
    console.log('Setting high grades in localStorage to ensure Waterloo Software Engineering is rendered...');
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

    // Click Google Sign-in button
    console.log('Clicking "Sign in with Google" button...');
    const signInButton = page.locator('a:has-text("Sign in with Google")');
    await signInButton.click();

    // 2. Navigate to student-dashboard.html and attempt to click 'Waterloo Software Engineering'
    console.log('\n--- Step 2: Navigating to student-dashboard.html ---');
    await page.waitForURL('**/student-dashboard.html');
    console.log('Landed on student-dashboard.html.');

    // Wait for matches to load
    await page.waitForSelector('#matches-grid');
    
    // Log the current localStorage state to verify grades are set correctly
    const storedState = await page.evaluate(() => {
      return localStorage.getItem('pathway_canada_state');
    });
    console.log(`Current localStorage state on student-dashboard: ${storedState}`);

    // Find the Waterloo Software Engineering card via explorer search
    console.log('Searching for "University of Waterloo" Software Engineering card via explorer search...');
    const explorerSearchInput = page.locator('#explorer-search');
    await explorerSearchInput.fill('Waterloo');

    const waterlooCard = page.locator('#explorer-grid > div', { hasText: 'Waterloo' }).first();
    
    // Wait for the Waterloo card to become visible
    console.log('Waiting for Waterloo card in explorer-grid to be visible...');
    await waterlooCard.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check if Waterloo card is pro locked
    const isLocked = await waterlooCard.locator('.pro-lock-overlay').isVisible();
    console.log(`Waterloo card pro-locked state: ${isLocked}`);

    console.log('Attempting to click Waterloo card to trigger paywall...');
    await waterlooCard.click();

    // 3. Confirm the $29 Upgrade Modal appears
    console.log('\n--- Step 3: Verifying the $29 Upgrade Modal ---');
    const upgradeModal = page.locator('#upgrade-modal');
    await page.waitForTimeout(500); // Wait for modal animation
    
    const isModalVisible = await upgradeModal.isVisible();
    if (!isModalVisible) {
      throw new Error('Upgrade modal is not visible!');
    }
    console.log('Upgrade modal is visible.');

    const modalText = await upgradeModal.textContent();
    if (!modalText.includes('Upgrade to Smart Match Pro')) {
      throw new Error('Upgrade modal title does not match!');
    }
    if (!modalText.includes('$29.00')) {
      throw new Error('Upgrade modal does not show $29.00 pricing!');
    }
    console.log('Confirmed upgrade modal shows "$29.00" pricing and "Upgrade to Smart Match Pro" text.');

    // 4. Simulate the 'Purchase' click and verify state.isPro becomes true via console
    console.log('\n--- Step 4: Simulating Purchase ---');
    const upgradeNowButton = upgradeModal.locator('a:has-text("Upgrade Now")');
    
    // Click Upgrade Now (this navigates to student-dashboard.html?payment=success)
    console.log('Clicking "Upgrade Now" (simulating mock payment success)...');
    await upgradeNowButton.click();

    // Wait for the redirect and storage upgrade reload
    await page.waitForURL('**/student-dashboard.html**');
    await page.waitForTimeout(1000); // Wait for page reload to complete

    // Verify state.isPro is true in local storage state
    const isPro = await page.evaluate(() => {
      return window.getAppState().isPro;
    });
    console.log(`Verified state.isPro in browser context: ${isPro}`);
    if (isPro !== true) {
      throw new Error('state.isPro is not true after mock payment!');
    }

    // 5. Navigate to academic-records.html and confirm the Download button is now enabled
    console.log('\n--- Step 5: Navigating to academic-records.html & verifying download ---');
    await page.goto('http://localhost:3000/academic-records.html');
    await page.waitForURL('**/academic-records.html');
    console.log('Landed on academic-records.html.');

    // Confirm that the download button is enabled (clicking it should trigger a download instead of modal)
    console.log('Locating download button...');
    const downloadButton = page.locator('button:has-text("Download Certified Portfolio")');
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    console.log('Clicking "Download Certified Portfolio" button...');
    await downloadButton.click();
    
    const download = await downloadPromise;
    console.log(`Download triggered successfully!`);
    console.log(`Suggested filename: ${download.suggestedFilename()}`);
    
    if (download.suggestedFilename() !== 'pathway_canada_portfolio.txt') {
      throw new Error(`Unexpected filename: ${download.suggestedFilename()}`);
    }
    
    console.log('\n=======================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
    console.log('=======================================');
    
  } catch (error) {
    console.error('\nTest failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Browser closed. Test execution finished.');
  }
})();
