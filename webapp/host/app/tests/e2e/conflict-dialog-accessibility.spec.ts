import { test, expect } from '@playwright/test';

test('conflict dialog traps focus and closes on Escape', async ({ page, request }) => {
  // Create a palette and navigate to its page
  const create = await request.post('http://127.0.0.1:8000/api/palettes', { data: { name: 'A11y Test' } });
  expect(create.ok()).toBeTruthy();
  const body = await create.json();
  const pid = body.id;
  await page.goto(`/palettes/${pid}`);

  // Ensure name input and rename button exist
  const nameInput = page.getByPlaceholder('Palette name');
  await expect(nameInput).toBeVisible();
  const renameBtn = page.getByRole('button', { name: 'Rename' });

  // Force server to return 409 on PATCH to show the ConflictDialog
  await page.route('**/api/palettes/**', async (route) => {
    const req = route.request();
    if (req.method() === 'PATCH') {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'conflict' }) });
    } else {
      await route.continue();
    }
  });

  // Trigger rename to open ConflictDialog
  await nameInput.fill('Trigger Conflict');
  await renameBtn.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Get buttons inside dialog
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  const refreshBtn = page.getByRole('button', { name: 'Refresh' });
  const overwriteBtn = page.getByRole('button', { name: 'Overwrite' });

  // Focus should start on one of the buttons; tabbing cycles inside dialog
  await cancelBtn.focus();
  await page.keyboard.press('Tab');
  await expect(refreshBtn).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(overwriteBtn).toBeFocused();
  // Shift+Tab should go back
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  await expect(refreshBtn).toBeFocused();

  // Press Escape to close
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
