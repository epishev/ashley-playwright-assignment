import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Ashley Playwright tests',
  output: './allure-report',
  plugins: {
    // singleFile: the report is one index.html that opens with a double-click, without a server.
    awesome: { options: { singleFile: true, reportLanguage: 'en' } },
  },
});
