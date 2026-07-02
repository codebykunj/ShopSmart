import { test, expect } from '@playwright/test';

test.describe('End-to-End Smoke Test', () => {
  test('Complete login and billing flow', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'rajesh@shopsmart.demo');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify successful login
    await expect(page.locator('h1')).toContainText('Good', { timeout: 10000 });

    // 2. Add product (Inventory)
    await page.click('text=Inventory');
    await page.click('button:has-text("Add Product")');
    await page.fill('input[placeholder="e.g. Tata Salt (1kg)"]', 'Test E2E Product');
    await page.fill('input[placeholder="0.00"]', '99.99');
    await page.fill('input[placeholder="0"]', '10');
    await page.click('button[type="submit"]:has-text("Add Product")');

    // 3. Billing Flow
    await page.click('text=Billing');
    // Search for product
    await page.fill('input[placeholder="Search products to add…"]', 'Test E2E Product');
    // Click on search result
    await page.click('button:has-text("Test E2E Product")');
    // Verify item added to cart
    await expect(page.locator('text=Test E2E Product').first()).toBeVisible();

    // 4. Finalize
    await page.click('button:has-text("Finalize Sale")');
    
    // Verify Stamp
    await expect(page.locator('text=Paid').first()).toBeVisible();

    // 5. Verify PDF download option exists
    await expect(page.locator('button:has-text("Download Invoice")')).toBeVisible();
  });
});

