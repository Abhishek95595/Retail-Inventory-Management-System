import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Product Catalog & Category Management E2E Flows', () => {
  // Test helper to log in as administrator
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('navigates to categories, creates a category and displays it in hierarchy list', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Navigate to categories page via header navigation
    await page.getByRole('link', { name: /Categories/i }).click();
    await expect(page).toHaveURL(/\/categories/);
    await expect(page.getByRole('heading', { name: /Categories Directory/i })).toBeVisible();

    // Click Create Category
    await page
      .getByRole('link', { name: /Create Category/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/categories\/new/);

    const testCode = `E2E_CAT_${Date.now()}`;
    const testName = `Electronics Category ${Date.now()}`;

    // Fill category form
    await page.getByLabel(/Category Name/i).fill(testName);
    await page.getByLabel(/Category Code/i).fill(testCode);
    await page.getByLabel(/Description/i).fill('E2E created category description');

    await page.getByRole('button', { name: /Create Category/i }).click();

    // Verify redirected back to categories list with newly created item
    await expect(page).toHaveURL(/\/categories/);
    await expect(page.getByText(testName)).toBeVisible();
    await expect(page.getByText(testCode)).toBeVisible();
  });

  test('navigates to products, creates a product and views its details page', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to products catalog
    await page.getByRole('link', { name: /Products/i }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole('heading', { name: /Products Directory/i })).toBeVisible();

    // Click Create Product
    await page
      .getByRole('link', { name: /Create Product/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products\/new/);

    const testSku = `SKU-E2E-${Date.now()}`;
    const testTitle = `E2E Product Item ${Date.now()}`;

    // Fill product form
    await page.getByLabel(/Product SKU/i).fill(testSku);
    await page.getByLabel(/Product Title/i).fill(testTitle);

    // Select category (select first option after placeholder)
    const categorySelect = page.getByLabel(/Category \*/i);
    await categorySelect.selectOption({ index: 1 });

    await page.getByLabel(/Cost Price/i).fill('45.00');
    await page.getByLabel(/Selling Price/i).fill('89.99');
    await page.getByLabel(/Reorder Point/i).fill('10');
    await page.getByLabel(/Reorder Qty/i).fill('50');

    await page.getByRole('button', { name: /Create Product/i }).click();

    // Verify redirected to products list with new product visible
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByText(testTitle)).toBeVisible();
    await expect(page.getByText(`SKU: ${testSku}`)).toBeVisible();

    // Click View on the created product
    await page
      .getByRole('row', { name: new RegExp(testSku, 'i') })
      .getByRole('link', { name: /View/i })
      .click();

    await expect(page.getByRole('heading', { name: testTitle })).toBeVisible();
    await expect(page.getByText(`SKU: ${testSku}`)).toBeVisible();
    await expect(page.getByText('₹89.99')).toBeVisible();
  });

  test('displays validation error when attempting duplicate category code', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/categories/new');
    await page.getByLabel(/Category Name/i).fill('Duplicate Test Category');
    // Using a known reserved code that is created in the previous test or pre-seeded
    await page.getByLabel(/Category Code/i).fill('ELEC_DUP');
    await page.getByRole('button', { name: /Create Category/i }).click();

    // Attempting same code a second time
    await page.goto('/categories/new');
    await page.getByLabel(/Category Name/i).fill('Second Duplicate Attempt');
    await page.getByLabel(/Category Code/i).fill('ELEC_DUP');
    await page.getByRole('button', { name: /Create Category/i }).click();

    const alert = page.locator('div[role="alert"]').filter({ hasText: /already exists/i });
    await expect(alert).toBeVisible();
  });
});
