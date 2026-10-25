import { test, expect } from '@playwright/test';

test.describe('RIMS Authentication and Protected Route Flows', () => {
  test('redirects unauthenticated users attempting to access /app to /login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fapp/);

    // Verify login card elements
    await expect(page.getByRole('heading', { name: /Sign in to RIMS/i })).toBeVisible();
    await expect(page.getByLabel(/Work Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Account Password/i)).toBeVisible();
  });

  test('displays generic error feedback on invalid login submission', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/Work Email Address/i).fill('invalid_user@example.com');
    await page.getByLabel(/Account Password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();

    // Verify generic error alert appears without revealing account existence
    const alert = page
      .locator('div[role="alert"]')
      .filter({ hasText: /Invalid email address or password/i });
    await expect(alert).toBeVisible();
  });

  test('allows seeded administrator to log in and view authenticated dashboard', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();

    // Successfully redirects to /app
    await expect(page).toHaveURL(/\/app/);

    // Verify session identity details rendered server-side
    await expect(
      page.getByRole('heading', { name: /Welcome, System Administrator/i })
    ).toBeVisible();
    await expect(page.getByText(/Role: ADMIN/i)).toBeVisible();
    await expect(page.getByText(/Active Role Permissions/i)).toBeVisible();
  });

  test('rejects unauthenticated request to protected API with 401 Unauthorized', async ({
    request,
  }) => {
    const response = await request.get('/api/protected/catalog');
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Unauthorized');
  });
});
