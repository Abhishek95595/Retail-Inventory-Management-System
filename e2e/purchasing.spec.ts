import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Purchasing & Goods Receipts E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('creates draft purchase order, submits, approves, and receives goods into warehouse', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // 1. Navigate to Purchasing via header
    await page.getByRole('link', { name: 'Purchasing', exact: true }).click();
    await expect(page).toHaveURL(/\/purchasing/);
    await expect(page.getByRole('heading', { name: /Purchase Orders & Receiving/i })).toBeVisible();

    // 2. Click Create Purchase Order button
    await page.getByRole('link', { name: /Create Purchase Order/i }).click();
    await expect(page).toHaveURL(/\/purchasing\/new/);
    await expect(page.getByRole('heading', { name: /Create Purchase Order/i })).toBeVisible();

    // 3. Set line item quantity
    await page.locator('input[type="number"]').first().fill('15');

    // Submit draft PO
    await page.getByRole('button', { name: /Create Purchase Order Draft/i }).click();

    // 4. Verify redirected to PO Details page in DRAFT status
    await expect(page).toHaveURL(/\/purchasing\/[a-f0-9-]+/);
    await expect(page.getByText('Draft', { exact: true })).toBeVisible();

    // 5. Submit PO for approval
    await page.getByRole('button', { name: /Submit for Approval/i }).click();
    await expect(page.getByText('Submitted for Approval', { exact: true })).toBeVisible();

    // 6. Approve PO
    await page.getByRole('button', { name: /Approve Purchase Order/i }).click();
    await expect(page.getByText('Approved & Open for Receiving', { exact: true })).toBeVisible();

    // 7. Click Receive Goods button to open modal
    await page.getByRole('button', { name: /Receive Goods/i }).click();
    await expect(
      page.getByRole('heading', { name: /Receive Goods into Warehouse/i })
    ).toBeVisible();

    // Commit goods receipt
    await page.getByRole('button', { name: /Commit Goods Receipt/i }).click();

    // Verify order is now Fully Received
    await expect(page.getByText('Fully Received', { exact: true })).toBeVisible();

    // 8. View Receipt Details
    await page
      .getByRole('link', { name: /Receipt Details/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/purchasing\/receipts\/[a-f0-9-]+/);
    await expect(page.getByText('Committed to Inventory')).toBeVisible();

    // 9. Verify movement ledger
    await page.getByRole('link', { name: /Verify Movement Ledger Entries/i }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await expect(page.getByRole('heading', { name: /Append-Only Stock Ledger/i })).toBeVisible();
  });
});
