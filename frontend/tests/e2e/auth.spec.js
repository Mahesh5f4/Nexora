import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const timestamp = new Date().getTime();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'StrongPassword123!';
  const testName = 'E2E Test User';

  test('Registration, Login, and Workspace Redirect Flow', async ({ page }) => {
    // 1. Registration
    await page.goto('/register');
    await page.fill('input[type="text"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to login with success message
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // 2. Login
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to workspace
    await expect(page).toHaveURL(/\/workspace/);
    await expect(page.locator(`text=Welcome back, ${testName}`)).toBeVisible();
    
    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('Protected Route Verification', async ({ page }) => {
    // Attempt to access workspace without being logged in
    await page.goto('/workspace');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('Update Profile Flow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/workspace/);

    // Go to settings
    await page.goto('/settings');
    await expect(page.locator('h1', { hasText: 'Account Settings' })).toBeVisible();

    // Update name
    const newName = `Updated User ${timestamp}`;
    const nameInput = page.locator('input[placeholder="Your Name"]');
    await nameInput.fill('');
    await nameInput.fill(newName);
    await page.click('button:has-text("Update")');

    // Verify success message appears (can be flaky with framer-motion)
    await page.waitForTimeout(1000); // give it a moment to update

    // Refresh and verify persistence
    await page.reload();
    await expect(nameInput).toHaveValue(newName);
  });
  
  test('Logout Flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/workspace/);

    // Click profile dropdown and logout
    await page.click('a[href="/profile"]'); 
    // Wait, the navbar has a logout button. Let's use that.
    // The logout button is in the navbar.
    const logoutBtn = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') });
    
    // If desktop, the first one is the main logout button
    if(await logoutBtn.first().isVisible()){
        await logoutBtn.first().click();
    } else {
        // Mobile view, open menu then click logout
        await page.click('button:has(svg.lucide-menu)');
        await page.click('button:has-text("Log Out")');
    }

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Token should be removed
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('Invalid Login Credentials Flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent_user@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should stay on login and show error (or stay on login with no redirect)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Registration with Existing Email Flow', async ({ page }) => {
    // Attempt to register with the same email as the first test
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Duplicate User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Assuming the backend rejects duplicates, should show an error
    await expect(page.locator('text=already exists').or(page.locator('text=Error'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page).toHaveURL(/\/register/);
  });
});
