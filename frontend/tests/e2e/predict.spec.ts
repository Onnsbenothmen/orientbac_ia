import { test, expect } from '@playwright/test';

// Note: Requires Playwright to be installed and frontend dev server running on http://localhost:3000

test('predict flow: select filiere, analyze and view recommendations', async ({ page }) => {
  await page.goto('http://localhost:3000/predict');
  await expect(page.locator('text=Prédiction d\'admission')).toBeVisible();

  // Focus search and type
  await page.fill('input[placeholder^="Ex: Médecine"]', 'Informatique');
  await page.waitForTimeout(600);
  // choose first result
  const first = page.locator('[role="option"]').first();
  await first.click();

  // adjust score
  await page.fill('input[type="number"][aria-label="Score numérique"]', '150');

  // Analyze
  await page.click('button:has-text("Analyser mon profil")');
  await page.waitForSelector('text=Probabilité d\'admission', { timeout: 5000 });

  // Click recommendations
  await page.click('button:has-text("Voir recommandations similaires")');
  await expect(page.locator('text=Filières recommandées')).toBeVisible();
});

test('recommendations without selection shows results', async ({ page }) => {
  await page.goto('http://localhost:3000/predict');
  // open Recommendations tab
  await page.click('button:has-text("Recommandations")');
  // set a score
  await page.fill('input[type="number"][aria-label="Score numérique"]', '150');
  // analyze
  await page.click('button:has-text("Analyser mon profil")');
  await page.waitForSelector('text=Filières recommandées', { timeout: 10000 });
  await expect(page.locator('text=Filières recommandées')).toBeVisible();
  // ensure list has items
  await expect(page.locator('div:has-text("Plage historique")').first()).toBeVisible();
});

test('multi-filiere comparison (select 2 then compare)', async ({ page }) => {
  await page.goto('http://localhost:3000/predict');
  // focus search and type
  await page.fill('input[placeholder^="Ex: Médecine"]', 'Informatique');
  // wait for options
  const opts = page.locator('[role="option"]');
  await opts.first().waitFor({ timeout: 5000 });
  // select first two with Control modifier (multi-select)
  await opts.nth(0).click({ modifiers: ['Control'] });
  await opts.nth(1).click({ modifiers: ['Control'] });
  // ensure chips appear
  await expect(page.locator('div:has-text("Comparaison")').first()).toBeHidden({ timeout: 100 });
  // analyze
  await page.click('button:has-text("Analyser mon profil")');
  // expect comparison section
  await page.waitForSelector('text=Comparaison', { timeout: 10000 });
  await expect(page.locator('text=Comparaison')).toBeVisible();
});
