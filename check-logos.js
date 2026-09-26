import { chromium } from 'playwright';

(async () => {
  console.log('Checking live logo elements and load statuses...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage();
  
  // Set up console listener to capture any image loading errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Failed')) {
      console.log(`[BROWSER CONSOLE] ${msg.text()}`);
    }
  });

  try {
    await page.goto('https://pathways-canada-portal.netlify.app/student-dashboard', { waitUntil: 'networkidle' });
    
    // Evaluate images
    const imagesInfo = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('.uni-logo-img'));
      return imgs.map(img => {
        const fallback = img.nextElementSibling;
        return {
          alt: img.alt,
          src: img.src,
          display: window.getComputedStyle(img).display,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          fallbackVisible: fallback ? window.getComputedStyle(fallback).display !== 'none' : 'no_fallback_el'
        };
      });
    });

    console.log(`\nFound ${imagesInfo.length} logo elements:`);
    imagesInfo.forEach((info, i) => {
      console.log(`\nLogo #${i + 1}: ${info.alt}`);
      console.log(`- Src: ${info.src}`);
      console.log(`- Display: ${info.display}`);
      console.log(`- Natural Dimensions: ${info.naturalWidth}x${info.naturalHeight}`);
      console.log(`- Fallback Visible: ${info.fallbackVisible}`);
      if (info.naturalWidth === 0 && info.display !== 'none') {
        console.log(`⚠️ WARNING: Image has 0 width but is NOT hidden!`);
      }
    });

  } catch (error) {
    console.error('Error running check:', error);
  } finally {
    await browser.close();
  }
})();
