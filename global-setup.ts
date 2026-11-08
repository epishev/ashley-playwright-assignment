import { mkdirSync, rmSync } from 'node:fs';

// Allure adds to allure-results on every run, so a test renamed or deleted
// since an earlier run would otherwise stay in the new report.
export default function globalSetup() {
  rmSync('allure-results', { recursive: true, force: true });
  mkdirSync('allure-results', { recursive: true });
}
