import { test as baseTest, expect } from '@playwright/test';

const test = baseTest.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = [];
    const pageErrors: any[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`SETUP Browser Console Error: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', exception => {
      console.error(`SETUP Page Error (Uncaught Exception): ${exception}`);
      pageErrors.push(exception.message);
    });

    // Use the modified page in the test
    await use(page);

    // After each test, check if any errors were collected
    expect(consoleErrors, `Test failed due to console errors: \n${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Test failed due to page errors (uncaught exceptions): \n${pageErrors.join('\n')}`).toHaveLength(0);
  }
});

export { test };