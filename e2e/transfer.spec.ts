import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Inter-Warehouse Stock Transfer E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('navigates to transfers, creates draft transfer, dispatches and receives it', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // 1. Ensure stock availability at the origin warehouse via stock receipt
    await page.getByRole('link', { name: /Movements/i, exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await page.getByRole('button', { name: /Stock Receipt/i }).click();
    await expect(
      page.getByRole('heading', { name: /Record Incoming Stock \(Receipt\)/i })
    ).toBeVisible();

    const stockRef = `TRF-PREP-${Date.now()}`;
    await page.getByLabel(/Quantity/i).fill('20');
    await page.getByLabel(/External Reference/i).fill(stockRef);
    await page.getByLabel(/Operational Reason/i).fill('Transfer origin stock preparation');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Commit Movement/i }).click();
    await expect(
      page.getByRole('heading', { name: /Movement Committed Successfully/i })
    ).toBeVisible();
    await page.getByRole('button', { name: /Close & View Ledger/i }).click();

    // 2. Navigate to Transfers via Header
    await page.getByRole('link', { name: 'Transfers', exact: true }).click();
    await expect(page).toHaveURL(/\/transfers/);
    await expect(page.getByRole('heading', { name: /Stock Transfers/i })).toBeVisible();

    // 3. Click Create Transfer button
    await page.getByRole('link', { name: /Create Transfer/i }).click();
    await expect(page).toHaveURL(/\/transfers\/new/);
    await expect(page.getByRole('heading', { name: /Create Stock Transfer/i })).toBeVisible();

    // 4. Fill in transfer details
    const uniqueNotes = `E2E Transfer Rebalance ${Date.now()}`;
    await page.getByLabel(/Logistics Notes/i).fill(uniqueNotes);

    // Fill line item quantity
    await page.locator('input[type="number"]').first().fill('5');

    // Submit form to create draft transfer
    await page.getByRole('button', { name: /Save Draft Transfer/i }).click();

    // 4. Verify redirected to Transfer Details page
    await expect(page).toHaveURL(/\/transfers\/[a-f0-9-]+/);
    await expect(page.getByText('Draft Transfer')).toBeVisible();
    await expect(page.getByText(uniqueNotes)).toBeVisible();

    // 5. Dispatch transfer
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Dispatch Transfer/i }).click();

    // Verify in-transit status
    await expect(page.getByText(/In Transit \(Dispatched\)/i)).toBeVisible();

    // 6. Confirm Receipt
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Confirm Receipt/i }).click();

    // Verify received status
    await expect(page.getByText(/Received & Completed/i)).toBeVisible();
    await expect(page.getByText(/Transfer Fully Completed & Audited/i)).toBeVisible();

    // 7. Verify stock movement reference link
    await page.getByRole('link', { name: /View Movements/i }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await expect(page.getByRole('heading', { name: /Append-Only Stock Ledger/i })).toBeVisible();
  });
});
