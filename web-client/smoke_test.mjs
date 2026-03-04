import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'http://localhost:5173';
const SCREENSHOT_DIR = '/tmp/screenshots';

async function sendMessage(page, text) {
  const input = await page.$('input, textarea');
  await input.fill(text);
  await page.click('button[type="submit"], .send-button, button:last-of-type');
  console.log(`  Sent: "${text}"`);
}

async function waitForResponse(page) {
  // Wait for typing indicator to appear and disappear, or timeout
  await page.waitForTimeout(8000);
}

async function smokeTest() {
  console.log('=== Client Smoke Test ===');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForSelector('input, textarea', { timeout: 5000 });
    console.log('1. Page loaded');

    // Step 1: Send 12345 to trigger debug picker
    await sendMessage(page, '12345');
    await waitForResponse(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/smoke_1_debug.png`, fullPage: true });
    console.log('2. Debug picker screenshot saved');

    // Step 2: Click the first picker option
    const pickerOption = await page.$('.picker-option');
    if (pickerOption) {
      const label = await pickerOption.textContent();
      await pickerOption.click();
      console.log(`3. Clicked picker option: "${label.trim()}"`);
      await waitForResponse(page);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/smoke_2_after_pick.png`, fullPage: true });
      console.log('4. After-pick screenshot saved');

      // Step 3: If there's another picker, click it too
      const secondPicker = await page.$('.picker-option');
      if (secondPicker) {
        const label2 = await secondPicker.textContent();
        await secondPicker.click();
        console.log(`5. Clicked second picker: "${label2.trim()}"`);
        await waitForResponse(page);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/smoke_3_second_pick.png`, fullPage: true });
        console.log('6. Second pick screenshot saved');
      } else {
        console.log('5. No second picker');
      }
    } else {
      console.log('3. No picker found!');
    }

    console.log('=== Done ===');
  } catch (err) {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/smoke_error.png` });
    console.error(`Error: ${err.message}`);
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
}

smokeTest();
