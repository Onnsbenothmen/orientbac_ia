# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: predict.spec.ts >> predict flow: select filiere, analyze and view recommendations
- Location: tests\e2e\predict.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Prédiction d\'admission')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Prédiction d\'admission')

```

# Page snapshot

```yaml
- generic [ref=e2]: missing required error components, refreshing...
```