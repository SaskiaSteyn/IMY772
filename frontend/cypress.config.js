import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: 'http://localhost:5173',
    // Increased from default 60000ms: captured-data.cy.js runs first and Vite
    // needs time to cold-compile the full import graph (including xlsx/SheetJS).
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config)
      return config
    },
  },
});
