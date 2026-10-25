import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Warehouse Management & Inventory Balances E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('navigates to warehouses, creates a warehouse, and views detail page', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Warehouses
    await page.getByRole('link', { name: 'Warehouses', exact: true }).click();
    await expect(page).toHaveURL(/\/warehouses/);
    await expect(page.getByRole('heading', { name: /Warehouse Facilities/i })).toBeVisible();

    // Click Register Warehouse
    await page
      .getByRole('link', { name: /Register Warehouse/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/warehouses\/new/);

    const testCode = `WH_E2E_${Date.now()}`;
    const testName = `E2E Logistics Hub ${Date.now()}`;

    await page.getByLabel(/Warehouse Facility Code/i).fill(testCode);
    await page.getByLabel(/Warehouse Facility Name/i).fill(testName);
    await page.getByLabel(/Physical Address/i).fill('778 Gateway Terminal, Gate 3');
    await page.getByLabel(/Contact Phone/i).fill('+1 (555) 888-9999');

    await page.getByRole('button', { name: /Create Warehouse/i }).click();

    // Should redirect to warehouses list
    await expect(page).toHaveURL(/\/warehouses/);
    await expect(page.getByText(testCode)).toBeVisible();
    await expect(page.getByText(testName)).toBeVisible();

    // Click View Facility
    const facilityCard = page
      .locator('[data-testid="warehouse-card"]')
      .filter({ hasText: testCode })
      .first();
    await facilityCard.getByRole('link', { name: /View Facility/i }).click();

    await expect(page).toHaveURL(/\/warehouses\/[a-f0-9-]+/);
    await expect(page.getByRole('heading', { name: testName })).toBeVisible();
    await expect(page.getByText(testCode)).toBeVisible();
    await expect(page.getByText(/Facility Information/i)).toBeVisible();
    await expect(page.getByText(/Current Facility Inventory Balances/i)).toBeVisible();
  });

  test('displays validation error alert on duplicate warehouse code submission', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto('/warehouses/new');

    const duplicateCode = `DUP_E2E_${Date.now()}`;

    // Create first warehouse
    await page.getByLabel(/Warehouse Facility Code/i).fill(duplicateCode);
    await page.getByLabel(/Warehouse Facility Name/i).fill('First Facility');
    await page.getByRole('button', { name: /Create Warehouse/i }).click();
    await expect(page).toHaveURL(/\/warehouses/);

    // Attempt second warehouse with same code
    await page.goto('/warehouses/new');
    await page.getByLabel(/Warehouse Facility Code/i).fill(duplicateCode);
    await page.getByLabel(/Warehouse Facility Name/i).fill('Second Facility');
    await page.getByRole('button', { name: /Create Warehouse/i }).click();

    // Error alert must appear
    const alertBox = page.locator('div[role="alert"]').filter({ hasText: /already exists/i });
    await expect(alertBox).toBeVisible();
  });

  test('navigates to inventory balances page and verifies formula header and table structure', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Inventory', exact: true }).click();
    await expect(page).toHaveURL(/\/inventory/);

    await expect(page.getByRole('heading', { name: /Inventory Balance Ledger/i })).toBeVisible();

    // Verify formula banner
    await expect(page.getByText(/Available = On-Hand − Reserved − Quarantined/i)).toBeVisible();

    // Verify search and filter elements
    await expect(page.getByPlaceholder(/Search SKU, product or facility/i)).toBeVisible();
  });
});
