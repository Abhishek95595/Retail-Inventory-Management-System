import { test, expect, Page } from '@playwright/test';

test.describe('RIMS Sales Order & Stock Reservation E2E Flows', () => {
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/Work Email Address/i).fill('admin@rims.local');
    await page.getByLabel(/Account Password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /Sign in to Portal/i }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  test('creates draft sales order, confirms with stock reservation, fulfills through dispatch and delivery', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // 1. Ensure stock availability at the target warehouse via stock receipt
    await page.getByRole('link', { name: /Movements/i, exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await page.getByRole('button', { name: /Stock Receipt/i }).click();
    await expect(
      page.getByRole('heading', { name: /Record Incoming Stock \(Receipt\)/i })
    ).toBeVisible();

    const stockRef = `SO-PREP-${Date.now()}`;
    await page.getByLabel(/Quantity/i).fill('20');
    await page.getByLabel(/External Reference/i).fill(stockRef);
    await page.getByLabel(/Operational Reason/i).fill('Fulfillment inventory preparation');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Commit Movement/i }).click();
    await expect(
      page.getByRole('heading', { name: /Movement Committed Successfully/i })
    ).toBeVisible();
    await page.getByRole('button', { name: /Close & View Ledger/i }).click();

    // 2. Navigate to Orders via header
    await page.getByRole('link', { name: 'Orders', exact: true }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(
      page.getByRole('heading', { name: /Sales Orders & Stock Reservations/i })
    ).toBeVisible();

    // 3. Click New Sales Order button
    await page.getByRole('link', { name: /New Sales Order/i }).click();
    await expect(page).toHaveURL(/\/orders\/new/);
    await expect(page.getByRole('heading', { name: /Create Sales Order/i })).toBeVisible();

    // 4. Fill in customer and line item
    const customer = `Enterprise Client ${Date.now()}`;
    await page.getByLabel(/Customer Name/i).fill(customer);
    await page.getByLabel(/Customer Email/i).fill('enterprise@client.test');

    // Enter order quantity
    await page.locator('input[type="number"]').first().fill('3');

    // Submit draft order
    await page.getByRole('button', { name: /Create Draft Order/i }).click();

    // 4. Verify redirected to Order Details page in DRAFT status
    await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+/);
    await expect(page.getByText('Draft Order')).toBeVisible();
    await expect(page.getByText(customer).first()).toBeVisible();

    // 5. Confirm Order (Atomic Stock Reservation)
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Confirm Order & Reserve Stock/i }).click();

    // Verify status transitions to Confirmed (Stock Reserved)
    await expect(page.getByText('Confirmed (Stock Reserved)', { exact: true })).toBeVisible();
    await expect(page.getByText(/Active Stock Reservations/i)).toBeVisible();

    // 6. Pick Order
    await page.getByRole('button', { name: /Start Picking/i }).click();
    await expect(page.getByText('Picking in Progress', { exact: true })).toBeVisible();

    // 7. Pack Order
    await page.getByRole('button', { name: /Complete Packing/i }).click();
    await expect(page.getByText('Packed & Ready', { exact: true })).toBeVisible();

    // 8. Dispatch Order (Deducts on-hand stock and fulfills reservations)
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Dispatch Shipment/i }).click();
    await expect(page.getByText('Dispatched', { exact: true })).toBeVisible();

    // 9. Deliver Order
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Confirm Delivery/i }).click();
    await expect(page.getByText('Delivered & Finalized', { exact: true })).toBeVisible();

    // 10. Verify audit movement ledger link
    await page.getByRole('link', { name: /Audit Movements/i }).click();
    await expect(page).toHaveURL(/\/inventory\/movements/);
    await expect(page.getByRole('heading', { name: /Append-Only Stock Ledger/i })).toBeVisible();
  });
});
