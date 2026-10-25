import { test, expect } from '@playwright/test';

test.describe('RIMS Foundation Home Page Smoke Test', () => {
  test('renders application title and Phase 1 milestone indicator', async ({ page }) => {
    await page.goto('/');

    // Check title element
    await expect(page).toHaveTitle(/Retail Inventory Management System/i);

    // Verify main heading
    const heading = page.getByRole('heading', {
      name: /Retail Inventory Management System/i,
      level: 1,
    });
    await expect(heading).toBeVisible();

    // Verify Phase 1 badge and readiness notice
    const phaseBadge = page.getByText(/Phase 1 Foundation/i);
    await expect(phaseBadge).toBeVisible();

    // Verify roadmap cards exist and explain deferred phases
    await expect(page.getByText(/Phase 2: Database Schema & Core Entities/i)).toBeVisible();
  });

  test('health check API endpoint returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.system).toContain('Retail Inventory Management System');
  });
});
