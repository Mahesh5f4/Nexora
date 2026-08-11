import { test, expect } from '@playwright/test';

test.describe('Analyze Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to a non-protected route first to set localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test', role: 'USER' }));
    });
    await page.goto('/workspace/analyze');
  });

  test('page renders', async ({ page }) => {
    await expect(page.locator('h1', { hasText: 'Analyze Content' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Analyze' })).toBeVisible();
  });

  test('empty input prevents request', async ({ page }) => {
    const analyzeBtn = page.locator('button', { hasText: 'Analyze' });
    await expect(analyzeBtn).toBeDisabled();
    
    // Type and delete to ensure it becomes disabled again
    await page.fill('#content', '   ');
    await expect(analyzeBtn).toBeDisabled();
  });

  test('valid input sends correct POST request and successful response renders', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/ai/analyze', async route => {
      const request = route.request();
      expect(request.method()).toBe('POST');
      
      const postData = JSON.parse(request.postData());
      expect(postData.content).toBe('Test content to analyze');
      expect(postData.instruction).toBe('Test instruction');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          analysis: 'This is a mocked analysis result.',
          provider: 'MockProvider',
          model: 'mock-model-v1'
        })
      });
    });

    await page.fill('#content', 'Test content to analyze');
    await page.fill('#instruction', 'Test instruction');
    
    const analyzeBtn = page.locator('button', { hasText: 'Analyze' });
    await expect(analyzeBtn).toBeEnabled();
    
    await analyzeBtn.click();

    // loading state appears
    await expect(page.locator('button', { hasText: 'Analyzing...' })).toBeVisible();

    // response renders
    await expect(page.locator('h2', { hasText: 'Analysis Result' })).toBeVisible();
    await expect(page.getByText('This is a mocked analysis result.')).toBeVisible();
    
    // provider/model metadata renders
    await expect(page.getByText('MockProvider')).toBeVisible();
    await expect(page.getByText('mock-model-v1')).toBeVisible();
  });

  test('backend error renders safely', async ({ page }) => {
    // Mock the API error
    await page.route('**/api/ai/analyze', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'AI service temporarily unavailable'
        })
      });
    });

    await page.fill('#content', 'Test error handling');
    await page.locator('button', { hasText: 'Analyze' }).click();

    await expect(page.getByText('AI service temporarily unavailable')).toBeVisible();
    // Verify stack trace or internals are NOT rendered
    await expect(page.getByText('traceId')).not.toBeVisible();
  });

});
