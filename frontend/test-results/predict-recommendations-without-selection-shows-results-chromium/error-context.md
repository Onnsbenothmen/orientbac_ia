# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: predict.spec.ts >> recommendations without selection shows results
- Location: tests\e2e\predict.spec.ts:28:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Recommandations")')

```

# Page snapshot

```yaml
- generic [ref=e2]: missing required error components, refreshing...
```