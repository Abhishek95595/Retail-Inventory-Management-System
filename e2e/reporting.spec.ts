import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Phase 10: Operational Dashboards, Reports & Audit Log Review E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('navigates through operational dashboard, reports with filters, and audit logs', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // 1. Operational Dashboard inspection
    await expect(
      page.getByRole('heading', { name: /Welcome, System Administrator/i })
    ).toBeVisible();
    await expect(page.getByText(/Operational Dashboard/i)).toBeVisible();
    await expect(page.getByText(/Total Products/i)).toBeVisible();
    await expect(page.getByText(/Inventory Valuation/i).first()).toBeVisible();
    await expect(page.getByText(/Low Stock Alerts/i)).toBeVisible();
    await expect(page.getByText(/Stockout Zero Stock/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Sales Orders Pipeline/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Purchasing Pipeline/i })).toBeVisible();

    // 2. Navigate to Reports page via header
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(
      page.getByRole('heading', { name: /Inventory Valuation & Facility Report/i })
    ).toBeVisible();
    await expect(page.getByText(/Total On Hand Units/i)).toBeVisible();
    await expect(page.getByText(/Total Available Units/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Export CSV/i })).toBeVisible();

    // 3. Test filter interaction on Reports
    await page.locator('input[name="lowStockOnly"]').check();
    await page.getByRole('button', { name: /Apply Filters/i }).click();
    await expect(page).toHaveURL(/lowStockOnly=true/);

    // 4. Navigate to Audit Log Review page via header
    await page.getByRole('link', { name: 'Audit Log', exact: true }).click();
    await expect(page).toHaveURL(/\/audit-logs/);
    await expect(
      page.getByRole('heading', { name: /System Audit Trail & Event Log/i })
    ).toBeVisible();
    await expect(page.getByText(/Sensitive Data Redaction Active/i)).toBeVisible();

    // 5. Test filter interaction on Audit Logs
    await page.locator('select[name="action"]').selectOption('LOGIN');
    await page.getByRole('button', { name: /Apply Filters/i }).click();
    await expect(page).toHaveURL(/action=LOGIN/);
  });
});
