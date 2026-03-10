# End-to-End Test Report
**Accessible Language Learning Platform – Team 11**



---

## Executive Summary

End-to-end testing was executed for the Accessible Language Learning Platform using Cypress against the running frontend and backend applications. This cycle validated complete user-facing flows across authentication, protected route access, role/condition-specific dashboard behavior, progress navigation, lesson launching, and logout behavior for Autism and ADHD learner accounts. **Overall Result: all 16 defined end-to-end test cases passed successfully.**

| Component | Status | Tests Passed | Tests Failed | Pass Rate |
|-----------|--------|--------------|--------------|-----------|
| **Frontend + Backend E2E Flow** | ✅ Passing | 16 | 0 | 100% |
| **Overall E2E Cycle** | ✅ Passing | 16 | 0 | 100% |

---

## 1. Test Objective

The objective of this end-to-end testing cycle was to validate real user journeys in the deployed local application environment, where the frontend, backend, routing, authentication, and data-backed user behavior are exercised together as one connected system.

### Main Goals
- Validate that the application loads correctly for real browser users
- Validate login/logout flows for Autism and ADHD learner accounts
- Confirm protected routes block unauthorized access
- Confirm users can reach progress and dashboard-driven navigation paths
- Confirm lesson access works through the live browser experience
- Establish a reusable Cypress-based E2E baseline for future regression cycles

---

## 2. Scope of End-to-End Testing

### 2.1 Included in This Cycle
- Login page rendering
- Register page navigation
- Login with a valid Autism learner account
- Login with a valid ADHD learner account
- Progress page access after login
- Menu/quick control visibility checks
- Logout behavior for both learner conditions
- Protected route redirect behavior when unauthenticated
- Lesson library access
- Lesson launch flow
- Back navigation to dashboard

### 2.2 Out of Scope for This Cycle
- Negative authentication scenarios such as invalid password handling
- Forgot password flow
- OTP or verification flows if enabled for all environments
- Full lesson completion and persistence verification across multiple lessons
- Mobile viewport/browser matrix validation
- Network interruption and backend failure recovery testing
- Performance and load testing

---

## 3. Test Environment and Tools

### 3.1 Environment
- Operating System Used: Windows
- Frontend URL: `http://localhost:3000`
- Backend API Base: `http://localhost:5002`
- Frontend Proxy: `http://localhost:5002`
- Backend Health Check: `http://localhost:5002/api/health`

### 3.2 Tools Used
- Cypress: 15.11.0
- Browser Used for Recorded Run: Chrome 145 (headless)
- Node.js: v20.12.2
- Frontend Runtime: React
- Backend Runtime: Express + MongoDB

### 3.3 Spec File Used
- `frontend/cypress/e2e/core-flows.cy.ts`

---

## 4. Preconditions Before Running E2E Tests

The following conditions must be true before any teammate runs the E2E suite.

### 4.1 Software Prerequisites
- Node.js installed
- npm installed
- MongoDB connection available through backend environment configuration
- Project dependencies installed in both `frontend` and `backend`

### 4.2 Application Prerequisites
- Backend server must be running successfully
- Frontend server must be running successfully
- Test user accounts used by Cypress must already exist in the connected database
- Ports must not conflict with other local services

### 4.3 Test Data Prerequisites
This E2E suite uses existing learner accounts already available in the local database.

If a teammate does not have identical seeded users in their environment, they must either:
- create equivalent Autism and ADHD learner accounts in their database, or
- update the account credentials in `frontend/cypress/e2e/core-flows.cy.ts` to match valid local users

---

## 5. Step-by-Step Setup Process for Teammates

This section is written so another teammate can reproduce the same E2E run on their own machine.

### Step 1: Open the Project Root
Open a terminal in the project folder:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\SE\SE_Team11_AccessibleLanguageLearningPlatform
```

### Step 2: Install Backend Dependencies
If backend packages are not already installed:

```powershell
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
If frontend packages are not already installed:

```powershell
cd ..\frontend
npm install
```

### Step 4: Start the Backend Server
Open a terminal in the backend folder and start the API server:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\SE\SE_Team11_AccessibleLanguageLearningPlatform\backend
npm start
```

### Step 5: Verify Backend Health
Open the following URL in a browser:

```text
http://localhost:5002/api/health
```

Expected result:
- a JSON response confirming the backend is running

### Step 6: Start the Frontend Server
Open a second terminal in the frontend folder:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\SE\SE_Team11_AccessibleLanguageLearningPlatform\frontend
npm start
```

### Step 7: Verify Frontend Availability
Open the following URL in a browser:

```text
http://localhost:3000/login
```

Expected result:
- login screen loads successfully
- email field is visible
- password field is visible
- login button is visible

### Step 8: Confirm Cypress Availability
In the frontend folder:

```powershell
npx cypress --version
```

Expected result:
- Cypress version is displayed

### Step 9: Run Cypress in Interactive Mode
Use this when debugging visually:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\SE\SE_Team11_AccessibleLanguageLearningPlatform\frontend
npx cypress open
```

Then:
- choose E2E testing
- choose Chrome
- open `core-flows.cy.ts`
- watch the suite run in the Cypress browser

### Step 10: Run Cypress in Headless Mode
Use this for final recorded execution:

```powershell
cd C:\Users\bhara\OneDrive\Desktop\SE\SE_Team11_AccessibleLanguageLearningPlatform\frontend
npx cypress run --spec cypress/e2e/core-flows.cy.ts --browser chrome
```

Expected result:
- all 16 tests pass
- 0 failures are reported at the end of the run

---

## 6. Commands Used in the Verified E2E Cycle

### 6.1 Backend Startup Command
```powershell
cd backend
npm start
```

### 6.2 Frontend Startup Command
```powershell
cd frontend
npm start
```

### 6.3 Cypress Interactive Command
```powershell
cd frontend
npx cypress open
```

### 6.4 Cypress Headless Command
```powershell
cd frontend
npx cypress run --spec cypress/e2e/core-flows.cy.ts --browser chrome
```

---

## 7. End-to-End Execution Summary

| Metric | Value |
|--------|-------|
| **Spec File** | `core-flows.cy.ts` |
| **Total Tests** | 16 |
| **Passed** | 16 |
| **Failed** | 0 |
| **Browser** | Chrome (headless) |
| **Framework** | Cypress |
| **Result** | PASS |

### Recorded Outcome
- The login page and public entry flow worked correctly
- Both Autism and ADHD learner accounts authenticated successfully
- Protected routes redirected unauthenticated users correctly
- Progress navigation worked for both tested learner conditions
- Autism and ADHD condition-specific UI behavior was reachable and testable
- Lesson library and lesson launch flow worked successfully
- Logout behavior worked successfully for both tested learner conditions

---

## 8. Detailed Test Case Results

### E2E-TC-001: Login page loads correctly
**Purpose:** Confirm the public login page renders the expected base controls.

**Steps:**
1. Open `http://localhost:3000/login`
2. Confirm the login title is visible
3. Confirm email input is visible
4. Confirm password input is visible
5. Confirm submit button is visible

**Expected Result:** Login page renders successfully.

**Actual Result:** Pass.

### E2E-TC-002: Navigate to Register page
**Purpose:** Confirm a user can navigate from login to register.

**Steps:**
1. Open the login page
2. Click the sign-up/register link
3. Confirm the URL changes to `/register`
4. Confirm registration form fields are visible

**Expected Result:** Register page opens successfully.

**Actual Result:** Pass.

### E2E-TC-003: Register navigation link works
**Purpose:** Confirm the register page renders correctly.

**Steps:**
1. Open `http://localhost:3000/register`
2. Confirm name input exists
3. Confirm email input exists
4. Confirm password input exists

**Expected Result:** Register page loads with required fields.

**Actual Result:** Pass.

### E2E-TC-004: Login with Autism account
**Purpose:** Confirm a valid Autism learner account can log in.

**Steps:**
1. Open the login page
2. Enter valid Autism learner credentials
3. Click login
4. Confirm redirect to `/dashboard`
5. Confirm dashboard container is visible

**Expected Result:** Autism learner reaches dashboard successfully.

**Actual Result:** Pass.

### E2E-TC-005: Access Progress page from menu (Autism)
**Purpose:** Confirm Autism learner can reach progress page from dashboard controls.

**Steps:**
1. Log in using Autism account
2. Wait for dashboard to load
3. Open the menu/quick controls
4. Click the progress option
5. Confirm URL changes to `/progress`

**Expected Result:** Progress page opens successfully.

**Actual Result:** Pass.

### E2E-TC-006: Open menu and verify quick controls (Autism)
**Purpose:** Confirm Autism dashboard menu opens and exposes expected controls.

**Steps:**
1. Log in using Autism account
2. Wait for dashboard to load
3. Open the menu
4. Confirm progress control is visible
5. Confirm settings/profile/preferences-style control is visible

**Expected Result:** Quick controls are visible.

**Actual Result:** Pass.

### E2E-TC-007: Logout from Autism account
**Purpose:** Confirm Autism learner can log out successfully.

**Steps:**
1. Log in using Autism account
2. Wait for dashboard to load
3. Click logout/exit control
4. Confirm the app leaves dashboard state
5. Confirm login form is visible again

**Expected Result:** User is logged out and returned to public entry/login state.

**Actual Result:** Pass.

### E2E-TC-008: Login with ADHD account
**Purpose:** Confirm a valid ADHD learner account can log in.

**Steps:**
1. Open the login page
2. Enter valid ADHD learner credentials
3. Click login
4. Confirm redirect to `/dashboard`
5. Confirm dashboard container is visible

**Expected Result:** ADHD learner reaches dashboard successfully.

**Actual Result:** Pass.

### E2E-TC-009: Access Progress page from menu (ADHD)
**Purpose:** Confirm ADHD learner can reach progress page after login.

**Steps:**
1. Log in using ADHD account
2. Wait for dashboard to load
3. Open the menu
4. Click progress
5. Confirm URL changes to `/progress`

**Expected Result:** Progress page opens successfully.

**Actual Result:** Pass.

### E2E-TC-010: Toggle Settings from side menu (ADHD)
**Purpose:** Confirm ADHD menu opens and exposes configuration controls.

**Steps:**
1. Log in using ADHD account
2. Wait for dashboard to load
3. Open the menu
4. Confirm settings/preferences/distraction-related control is visible

**Expected Result:** ADHD menu controls are visible.

**Actual Result:** Pass.

### E2E-TC-011: Logout from ADHD account
**Purpose:** Confirm ADHD learner can log out successfully.

**Steps:**
1. Log in using ADHD account
2. Wait for dashboard to load
3. Click logout button
4. Confirm application returns to public login state

**Expected Result:** User is logged out successfully.

**Actual Result:** Pass.

### E2E-TC-012: Dashboard redirect without authentication
**Purpose:** Confirm dashboard cannot be accessed without login.

**Steps:**
1. Clear local storage/session state
2. Open `/dashboard`
3. Observe redirect behavior

**Expected Result:** App redirects to login page.

**Actual Result:** Pass.

### E2E-TC-013: Progress page redirect without authentication
**Purpose:** Confirm progress page is protected.

**Steps:**
1. Clear local storage/session state
2. Open `/progress`
3. Observe redirect behavior

**Expected Result:** App redirects to login page.

**Actual Result:** Pass.

### E2E-TC-014: Lesson Library redirect without authentication
**Purpose:** Confirm lesson library is protected.

**Steps:**
1. Clear local storage/session state
2. Open `/lesson-library`
3. Observe redirect behavior

**Expected Result:** App redirects to login page.

**Actual Result:** Pass.

### E2E-TC-015: Launch first available lesson from lesson library
**Purpose:** Confirm a logged-in ADHD learner can open the lesson library and start a lesson.

**Steps:**
1. Log in using ADHD account
2. Open `/lesson-library`
3. Select the first available lesson card
4. Click the lesson card start button
5. Confirm redirect back to `/dashboard`
6. Confirm lesson intro view or lesson player is visible

**Expected Result:** A lesson launches successfully.

**Actual Result:** Pass.

### E2E-TC-016: Navigate back from lesson library to dashboard
**Purpose:** Confirm user can return from lesson library to dashboard.

**Steps:**
1. Log in using ADHD account
2. Open `/lesson-library`
3. Click the library back-to-dashboard button
4. Confirm redirect to `/dashboard`
5. Confirm dashboard container is visible

**Expected Result:** User returns to dashboard successfully.

**Actual Result:** Pass.

---

## 9. Important Implementation Notes Learned During Execution

The final passing E2E suite was achieved after aligning the Cypress selectors and expectations with the actual UI implementation.

### Verified UI/Flow Notes
- Autism logout uses a different button class than ADHD logout
- ADHD recommendation cards are not guaranteed to appear for every account state
- Lesson launching for ADHD can happen through dashboard deep-linking instead of direct URL navigation
- Some UI elements are more reliable when validated by stable route behavior rather than broad text matching

### Practical Lesson for Future Test Authors
When writing Cypress tests for this project, prefer:
- stable visible controls
- protected route access checks
- real route transitions
- fallback-safe selectors

Avoid depending on:
- optional recommendation cards
- overly broad text-only selectors
- assumptions that every lesson flow changes the URL in the same way

---

## 10. Troubleshooting Guide for Teammates

If the E2E suite fails on another machine, use this checklist.

### Problem: Frontend does not open
Check:
- `npm start` is running in `frontend`
- port 3000 is free
- browser can open `http://localhost:3000/login`

### Problem: Backend does not respond
Check:
- `npm start` is running in `backend`
- MongoDB connection is valid
- `http://localhost:5002/api/health` returns success

### Problem: Login tests fail
Check:
- test accounts exist in local database
- credentials inside `frontend/cypress/e2e/core-flows.cy.ts` are valid for that environment
- backend authentication endpoints are running correctly

### Problem: Protected route tests fail unexpectedly
Check:
- old browser session data is cleared
- local storage is not preserving stale authentication state

### Problem: Lesson tests fail
Check:
- lesson library route opens correctly after login
- first lesson card renders on the current environment
- dashboard deep-linking is not blocked by stale data or modified translations

---

## 11. Coverage Assessment

These 16 tests are sufficient as a **baseline end-to-end suite** because they prove that:
- the application can start correctly
- real users can log in
- protected routes work
- Autism and ADHD user flows are both functional
- progress navigation works
- lesson access works
- logout works

However, this is not full E2E coverage of the entire platform.

### Areas for Future E2E Expansion
- invalid login scenarios
- registration submission flow
- forgot password flow
- OTP verification flow if required in target environment
- lesson completion persistence checks
- progress update after lesson completion
- accessibility preference save/reload verification
- mobile viewport testing
- cross-browser execution

---

## 12. Conclusion

The end-to-end testing cycle completed successfully with all 16 defined Cypress test cases passing. The current build is stable for the tested critical user journeys, and the suite now provides a reusable browser-based validation process for the team.

This report can be used as:
- evidence of E2E testing implementation
- a teammate execution guide
- a baseline for future regression and expanded E2E coverage
