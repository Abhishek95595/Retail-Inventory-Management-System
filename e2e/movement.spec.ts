import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Stock Operations & Movement Ledger E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('navigates to movement ledger, executes stock receipt, and verifies ledger audit row', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Navigate to Movement Ledger via header
    await page.getByRole('link', { name: /Movement Ledger/i }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await expect(page.getByRole('heading', { name: /Append-Only Stock Ledger/i })).toBeVisible();

    // Click Stock Receipt
    await page.getByRole('button', { name: /Stock Receipt/i }).click();

    // Verify modal appears
    await expect(
      page.getByRole('heading', { name: /Record Incoming Stock \(Receipt\)/i })
    ).toBeVisible();

    // Fill in quantity and reason
    const uniqueRef = `PO-E2E-${Date.now()}`;
    await page.getByLabel(/Quantity/i).fill('25');
    await page.getByLabel(/External Reference/i).fill(uniqueRef);
    await page.getByLabel(/Operational Reason/i).fill('Initial receipt from supplier consignment');

    // Handle confirm dialog
    page.once('dialog', (dialog) => dialog.accept());

    // Submit movement
    await page.getByRole('button', { name: /Commit Movement/i }).click();

    // Verify success modal feedback
    await expect(
      page.getByRole('heading', { name: /Movement Committed Successfully/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Close & View Ledger/i })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Close & View Ledger/i }).click();

    // Verify receipt appears in the ledger
    await expect(page.getByText(uniqueRef)).toBeVisible();
    await expect(
      page.getByText(/Initial receipt from supplier consignment/i).first()
    ).toBeVisible();
  });

  test('attempts stock issue with excessive quantity and displays insufficient stock error', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory/movements');

    // Click Stock Issue
    await page.getByRole('button', { name: /Stock Issue/i }).click();

    await expect(page.getByRole('heading', { name: /Issue Outgoing Stock/i })).toBeVisible();

    // Enter excessive quantity
    await page.getByLabel(/Quantity/i).fill('999999');
    await page.getByLabel(/Operational Reason/i).fill('Excessive stock issuance attempt');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Commit Movement/i }).click();

    // Error alert must appear
    const alertBox = page.locator('div[role="alert"]').filter({ hasText: /Insufficient/i });
    await expect(alertBox).toBeVisible();
  });
});
