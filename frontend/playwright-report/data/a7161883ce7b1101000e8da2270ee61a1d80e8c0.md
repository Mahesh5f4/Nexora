# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: analyze.spec.js >> Analyze Page >> empty input prevents request
- Location: tests\e2e\analyze.spec.js:20:3

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: locator('button').filter({ hasText: 'Analyze' })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for locator('button').filter({ hasText: 'Analyze' })

```

```yaml
- main:
  - button "New Chat"
  - text: History No previous chats ThinkAction Ai
  - button "General"
  - button "Code Expert"
  - button "Researcher"
  - button "Planner"
  - button "Profile"
  - button "Logout"
  - heading "How can I help you today?" [level=2]
  - paragraph: Select a role above and start typing below.
  - textbox "Ask anything..."
  - button [disabled]
  - text: ThinkAction Ai can make mistakes. Consider verifying critical information.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Analyze Page', () => {
  4  | 
  5  |   test.beforeEach(async ({ page }) => {
  6  |     // Navigate to a non-protected route first to set localStorage
  7  |     await page.goto('/login');
  8  |     await page.evaluate(() => {
  9  |       localStorage.setItem('token', 'fake-jwt-token');
  10 |       localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test', role: 'USER' }));
  11 |     });
  12 |     await page.goto('/workspace/analyze');
  13 |   });
  14 | 
  15 |   test('page renders', async ({ page }) => {
  16 |     await expect(page.locator('h1', { hasText: 'Analyze Content' })).toBeVisible();
  17 |     await expect(page.locator('button', { hasText: 'Analyze' })).toBeVisible();
  18 |   });
  19 | 
  20 |   test('empty input prevents request', async ({ page }) => {
  21 |     const analyzeBtn = page.locator('button', { hasText: 'Analyze' });
> 22 |     await expect(analyzeBtn).toBeDisabled();
     |                              ^ Error: expect(locator).toBeDisabled() failed
  23 |     
  24 |     // Type and delete to ensure it becomes disabled again
  25 |     await page.fill('#content', '   ');
  26 |     await expect(analyzeBtn).toBeDisabled();
  27 |   });
  28 | 
  29 |   test('valid input sends correct POST request and successful response renders', async ({ page }) => {
  30 |     // Mock the API response
  31 |     await page.route('**/api/ai/analyze', async route => {
  32 |       const request = route.request();
  33 |       expect(request.method()).toBe('POST');
  34 |       
  35 |       const postData = JSON.parse(request.postData());
  36 |       expect(postData.content).toBe('Test content to analyze');
  37 |       expect(postData.instruction).toBe('Test instruction');
  38 | 
  39 |       await route.fulfill({
  40 |         status: 200,
  41 |         contentType: 'application/json',
  42 |         body: JSON.stringify({
  43 |           analysis: 'This is a mocked analysis result.',
  44 |           provider: 'MockProvider',
  45 |           model: 'mock-model-v1'
  46 |         })
  47 |       });
  48 |     });
  49 | 
  50 |     await page.fill('#content', 'Test content to analyze');
  51 |     await page.fill('#instruction', 'Test instruction');
  52 |     
  53 |     const analyzeBtn = page.locator('button', { hasText: 'Analyze' });
  54 |     await expect(analyzeBtn).toBeEnabled();
  55 |     
  56 |     await analyzeBtn.click();
  57 | 
  58 |     // loading state appears
  59 |     await expect(page.locator('button', { hasText: 'Analyzing...' })).toBeVisible();
  60 | 
  61 |     // response renders
  62 |     await expect(page.locator('h2', { hasText: 'Analysis Result' })).toBeVisible();
  63 |     await expect(page.getByText('This is a mocked analysis result.')).toBeVisible();
  64 |     
  65 |     // provider/model metadata renders
  66 |     await expect(page.getByText('MockProvider')).toBeVisible();
  67 |     await expect(page.getByText('mock-model-v1')).toBeVisible();
  68 |   });
  69 | 
  70 |   test('backend error renders safely', async ({ page }) => {
  71 |     // Mock the API error
  72 |     await page.route('**/api/ai/analyze', async route => {
  73 |       await route.fulfill({
  74 |         status: 503,
  75 |         contentType: 'application/json',
  76 |         body: JSON.stringify({
  77 |           message: 'AI service temporarily unavailable'
  78 |         })
  79 |       });
  80 |     });
  81 | 
  82 |     await page.fill('#content', 'Test error handling');
  83 |     await page.locator('button', { hasText: 'Analyze' }).click();
  84 | 
  85 |     await expect(page.getByText('AI service temporarily unavailable')).toBeVisible();
  86 |     // Verify stack trace or internals are NOT rendered
  87 |     await expect(page.getByText('traceId')).not.toBeVisible();
  88 |   });
  89 | 
  90 | });
  91 | 
```