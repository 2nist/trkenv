import { test, expect } from '@playwright/test';

test('optimistic rename shows ConflictDialog on 409', async ({ page, request }) => {
  // Create a palette via backend API
  const create = await request.post('http://127.0.0.1:8000/api/palettes', { data: { name: 'E2E Conflict' } });
  expect(create.ok()).toBeTruthy();
  const body = await create.json();
  const pid = body.id;
  expect(pid).toBeTruthy();

  // Navigate to palette page
  await page.goto(`/palettes/${pid}`);

  // Wait for the name input/button to appear (placeholder-based selector)
  const nameInput = page.getByPlaceholder('Palette name');
  await expect(nameInput).toBeVisible({ timeout: 5000 });

  // Intercept PATCH: allow first request to succeed, then force 409 on next
  let calls = 0;
  await page.route('**/api/palettes/**', async (route) => {
    const req = route.request();
    if (req.method() === 'PATCH') {
      calls += 1;
      if (calls === 1) {
        // Let the real backend handle the first PATCH
        await route.continue();
      } else {
        // Respond with 409 Conflict for the second PATCH
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'conflict: stale ETag' }) });
      }
    } else {
      await route.continue();
    }
  });

  // Perform optimistic rename: type new name and submit (component should issue PATCH)
  await nameInput.fill('E2E Renamed');
  await page.getByRole('button', { name: 'Rename' }).click();

  // Now trigger another rename which will get a 409 from our route
  await nameInput.fill('E2E Renamed Again');
  await page.getByRole('button', { name: 'Rename' }).click();

  // Expect ConflictDialog to appear (detect by heading text)
  const conflict = page.getByRole('heading', { name: 'Conflict detected' });
  await expect(conflict).toBeVisible({ timeout: 3000 });
});
