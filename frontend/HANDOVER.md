# IMY772 MicroTrack — Cypress Testing Handover Report
Last updated: 2026-06-16  
Status: **130/130 Cypress E2E tests passing (100% pass rate)**  
Coverage status: **Istanbul fully wired and working** — activate with `npm run dev:coverage` (see Section 4).

---

## 1. Project Overview
- **Repo:** `C:\Users\Louise Bruwer\Documents\GitHub\IMY772`
- **Frontend:** `frontend/` — React 19 + Vite 5 + Mantine v9 + React Router v7
- **Backend:** `backend/` — Express + Prisma + PostgreSQL
- **Test runner:** Cypress v15.14.1 (E2E, headless Electron)
- **Base URL:** `http://localhost:5173` (Vite dev server must be running)
- **Run command:** `cd frontend && npx cypress run` from the `frontend/` directory
- **Node version:** v24.5.0 (via fnm)

---

## 2. Completed Work — Cypress E2E Suite

### 2.1 All 11 spec files, 130 tests — all passing

| Spec file | Tests | What it covers |
|---|---|---|
| `captured-data.cy.js` | 12 | Data tabs, modals, isolate/phenotype/AMR/virulence data rendering, auth redirect |
| `dashboard.cy.js` | 13 | Leaflet map markers, sidebar, auth states, server error state |
| `navbar.cy.js` | 17 | Sidebar collapse, nav links, logout modal, admin vs regular user |
| `not-found.cy.js` | 7 | 404 page content and navigation |
| `profile.cy.js` | 11 | Profile view, edit, save, sidebar active state |
| `routing.cy.js` | 17 | Route guards (auth + admin), redirects for all protected routes |
| `auth/login.cy.js` | 9 | Login success/failure, validation errors, redirect if already logged in |
| `auth/signup.cy.js` | 11 | Signup success/failure, validation errors, redirect if already logged in |
| `admin/statistics.cy.js` | 7 | Metrics cards, deletions table, route guard |
| `admin/users.cy.js` | 13 | User table, search, edit modal, delete modal |
| `admin/water-data.cy.js` | 13 | Water data table, search, edit/delete modals, admin nav tabs |

### 2.2 Key patterns used in every test file

**API mocking:** All tests use `cy.intercept` — zero real backend calls. The dev server must be running for the Vite app to load, but all API responses are mocked.

**Auth pattern:** Every `beforeEach` intercepts `GET **/api/auth/me` with either 401 (guest) or 200 (logged-in user).

**API base URL (CRITICAL):** `VITE_API_URL=http://localhost:3000` is set in `.env`. All API calls go to `http://localhost:3000/...`, NOT `localhost:5173`. The intercept pattern `**/api/auth/me` matches this correctly.

**API response shapes (CRITICAL — wrong shapes caused failures):**
```js
body: { samples: [...] }         // fetchAllSamples
body: { isolates: [...] }        // fetchAllIsolates
body: { phenotypes: [...] }      // fetchAllPredictedPhenotypes
body: { amrFindings: [...] }     // fetchAllAmrFindings
body: { virulenceGenes: [...] }  // fetchAllVirulenceGenes
```

**Mantine UI quirks (headless Electron):**
- Modals have CSS opacity transitions that don't complete in headless mode. Assert on content INSIDE the dialog: `cy.get('[role="dialog"]').contains('Title').should('be.visible')` — not on the dialog container itself.
- Exception: AddDataModal and BulkUploadModal in `captured-data.cy.js` DO work with `should('be.visible')` on the dialog directly.
- Sidebar nav labels (`<span class="nav-label">`) are conditionally rendered out of the DOM when collapsed — use `should('not.exist')` not `should('not.be.visible')`.

**DataTable (mantine-datatable) quirk:**
- All table cells live inside an `overflow: hidden` scroll container.
- Use `should('exist')` not `should('be.visible')` for asserting cell content.
- Column headers and tab labels (outside the table) can use `should('be.visible')`.

**HTML5 email validation bypass:**
- Login and signup forms have `<TextInput type="email">`. The browser intercepts form submit with HTML5 native validation before Mantine's `onSubmit` fires.
- Fix: `cy.get('form').invoke('prop', 'noValidate', true)` BEFORE typing an invalid email.
- Do NOT use `invoke('removeAttr', 'type')` — React re-renders restore `type="email"` when onChange fires.

**Leaflet markers:**
- Dashboard renders markers using `L.divIcon` which creates `.leaflet-marker-icon` elements.
- Assert: `cy.get('.leaflet-marker-icon', { timeout: 10000 }).should('have.length.at.least', 1)`

### 2.3 `captured-data.cy.js` sync point (CRITICAL)

The `captured-data.cy.js` `beforeEach` uses a two-stage loading wait:

```js
cy.visit('/capture-data', { timeout: 120000 });
cy.contains('Samples', { timeout: 90000 }).should('be.visible');
```

**Why this is complex:** The `Samples` tab label is hidden behind a `{loading ? <Loader> : <Tabs>}` conditional in `captured-data.jsx`. The `loading` state is `true` until ALL of the following resolve:
1. Auth check (`GET /api/auth/me`) — resolved via intercept
2. All 5 data API calls in a single `Promise.all` — each resolved via intercept
3. `setLoading(false)` fires inside the `finally` block

Only after ALL of this does `Samples` appear in the DOM. The 90-second timeout covers Vite cold-start compilation of the large import graph (xlsx/SheetJS + 15+ modal components) on the first run of the suite.

**Do NOT** use `cy.wait('@meRequest')` etc. as the sync point — these time out because the `load` event fires before React has mounted and made the requests.

### 2.4 Cypress config quirks

**`cypress.config.js`:**
```js
pageLoadTimeout: 120000  // Increased from 60000
```
Reason: `captured-data.cy.js` runs first alphabetically. Vite cold-compiles 15+ modal components + xlsx/SheetJS on first load, which can exceed 60 seconds.

---

## 3. Istanbul Coverage Infrastructure

### 3.1 All packages installed and in `package.json` devDependencies

| Package | Version | Purpose |
|---|---|---|
| `vite-plugin-istanbul` | `^5.0.0` | Vite plugin that instruments source code with Istanbul at dev-server transform time |
| `@cypress/code-coverage` | `^4.0.3` | Cypress plugin that reads `window.__coverage__` after each test and writes `.nyc_output/` |
| `nyc` | transitive dep of above | Istanbul CLI — generates the final HTML/LCOV report from `.nyc_output/` |

### 3.2 All three wiring steps are complete

**`frontend/vite.config.js`** — Istanbul plugin added:
```js
import istanbul from 'vite-plugin-istanbul'
// ...
plugins: [
    react(),
    istanbul({
      include: 'src/**',
      exclude: ['node_modules', 'cypress/'],
      extension: ['.js', '.jsx'],
      requireEnv: true,          // only instrument when CYPRESS_COVERAGE=true
      forceBuildInstrument: false,
    }),
    VitePWA(...),
]
```

**`frontend/cypress/support/e2e.js`** — coverage support added as first import:
```js
import '@cypress/code-coverage/support'
import './commands'
```

**`frontend/cypress.config.js`** — coverage task registered:
```js
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config)
      return config   // MUST return config — task mutates it
    },
  },
});
```

### 3.3 Why `requireEnv: true` is essential

Setting `requireEnv: false` forces Istanbul to instrument ALL ~30+ source files on every Vite cold start. This adds ~49 seconds to the first page load, which causes Vite's HMR to fire a reload signal mid-test, clearing the pending auth state before Cypress can intercept it. The result is `captured-data.cy.js` failing with auth stuck in `loading=true`.

With `requireEnv: true`, Istanbul is a no-op when `CYPRESS_COVERAGE` env var is not set, so normal test runs are unaffected.

### 3.4 How to run with coverage

Two separate Vite scripts exist:

```json
"dev": "vite",               // normal development — no instrumentation
"dev:coverage": "CYPRESS_COVERAGE=true vite",  // instrumentation enabled
```

**Normal testing workflow** (day-to-day):
```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd frontend && npx cypress run
```

**Coverage collection workflow** (when you need the report):
```bash
# Terminal 1 — stop npm run dev first, then:
cd frontend && npm run dev:coverage

# Terminal 2 — wait for dev server to start, then:
cd frontend && npx cypress run

# After ALL 130 tests finish, open in browser:
# frontend/coverage/lcov-report/index.html
```

You CANNOT run `npm run dev` and `npm run dev:coverage` simultaneously — both bind to port 5173.

The coverage HTML report is only generated after all tests complete (the `after` hook in `@cypress/code-coverage` runs `nyc` at the very end).

### 3.5 ESM/CJS interop in cypress.config.js

`cypress.config.js` uses ESM (`"type": "module"` in `package.json`). `@cypress/code-coverage/task` exports a CommonJS function. Use `createRequire` — plain `import` will fail:

```js
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// then: require('@cypress/code-coverage/task')(on, config)
```

In `cypress/support/e2e.js`, Cypress's own webpack bundler handles CJS transparently, so `import '@cypress/code-coverage/support'` works fine without any special treatment.

---

## 4. Confirmed Compatibility (verified June 2026)

- `@cypress/code-coverage` v4.0.3 peer dep: `cypress >= 15.10.0` → project uses 15.14.1 ✓
- `@cypress/code-coverage` v4.0.3 peer dep: `node >= 20` → project uses Node 24.5.0 ✓
- `vite-plugin-istanbul` v5.0.0 peer dep: `vite >= 2.9.1 <= 5` → project uses Vite 5.4.21 ✓ (may emit a peer dep warning in npm, will not fail at runtime)
- `vite-plugin-istanbul` must stay at v5 while Vite is at v5. To use v7, Vite must first be upgraded to v6.
- `dayjs` (required by `@cypress/code-coverage` support file) is already in `frontend/dependencies` ✓
- `@vitejs/plugin-react` uses `enforce: "pre"` for its transforms; `vite-plugin-istanbul` uses `enforce: "post"` — JSX is always transformed before Istanbul instruments ✓

---

## 5. File Structure Reference

```
frontend/
├── cypress/
│   ├── e2e/
│   │   ├── admin/
│   │   │   ├── statistics.cy.js
│   │   │   ├── users.cy.js
│   │   │   └── water-data.cy.js
│   │   ├── auth/
│   │   │   ├── login.cy.js
│   │   │   └── signup.cy.js
│   │   ├── captured-data.cy.js
│   │   ├── dashboard.cy.js
│   │   ├── navbar.cy.js
│   │   ├── not-found.cy.js
│   │   ├── profile.cy.js
│   │   └── routing.cy.js
│   └── support/
│       ├── commands.js   ← custom commands: cy.loginAs(), cy.loginAsAdmin()
│       └── e2e.js        ← @cypress/code-coverage/support first, then ./commands
├── src/
│   ├── api/
│   │   ├── api-client.js          ← buildApiUrl(); base URL from VITE_API_URL env var
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── sample-data-management.js  ← all fetch fns unwrap specific response keys
│   ├── components/
│   │   ├── captured-data-components/  ← 15+ modal/table components
│   │   └── dashboard/
│   │       └── dashboard-navbar.jsx   ← shared sidebar
│   ├── context/
│   │   └── auth-context.jsx           ← user starts as null, loading starts true
│   ├── pages/
│   │   ├── admin/
│   │   ├── captured-data/
│   │   │   └── captured-data.jsx      ← has its OWN loading state for data APIs
│   │   ├── dashboard.jsx
│   │   ├── login.jsx
│   │   ├── not-found.jsx
│   │   ├── profile.jsx
│   │   └── sign-up.jsx
│   └── app-router.jsx                 ← route guards; returns null when auth loading=true
├── .env                               ← VITE_API_URL=http://localhost:3000
├── cypress.config.js                  ← pageLoadTimeout:120000; setupNodeEvents with coverage task
├── package.json                       ← includes dev:coverage script and coverage devDependencies
└── vite.config.js                     ← istanbul plugin with requireEnv:true
```

---

## 6. Constraints

- **Never run `git commit` or `git push`** — leave all changes unstaged for the user to review.
- Do not modify backend files.
- The user works in a team of 5 — keep all dependencies as up-to-date as possible within compatibility constraints.
- `vite-plugin-istanbul` must stay at v5 while Vite is at v5.

---

## 7. Useful Commands

```bash
# Start Vite dev server (normal — no coverage instrumentation)
cd frontend && npm run dev

# Start Vite dev server (with Istanbul instrumentation for coverage)
cd frontend && npm run dev:coverage

# Run all Cypress tests
cd frontend && npx cypress run

# Run a single spec
cd frontend && npx cypress run --spec cypress/e2e/captured-data.cy.js

# Open Cypress interactive mode
cd frontend && npx cypress open

# Wipe stale coverage data and re-run clean
rm -rf frontend/.nyc_output frontend/coverage && cd frontend && npx cypress run

# Check coverage packages
ls frontend/node_modules | grep -E "istanbul|code-coverage|nyc"

# Verify vite-plugin-istanbul version
cat frontend/node_modules/vite-plugin-istanbul/package.json | grep '"version"'
```
