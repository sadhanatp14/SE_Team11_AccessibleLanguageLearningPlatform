# Regression Test Report
**Project:** Accessible Language Learning Platform  

**Status:** Ready for execution

---

## 1. Purpose

This document is for regression testing after new changes are pulled or merged. The goal is to check that the existing core features still work and that recent updates did not break old functionality.

This is different from integration testing and end-to-end testing:
- Integration testing checks whether connected modules work together.
- End-to-end testing checks full user journeys in a live flow.
- Regression testing checks whether previously working features still behave correctly after changes.

---

## 2. Scope

The regression cycle will cover the main areas that are used often or are likely to be affected by shared changes.

### Backend
- Authentication routes
- Preferences routes
- Admin routes
- Lesson and localization routes
- TTS route

### Frontend
- Login
- Registration
- Progress page
- Accessibility preferences
- ADHD learning view
- Autism learning view
- Dyslexia-related learning flow where applicable

---

## 3. Tools Used

- Jest
- React Testing Library
- Supertest
- MongoMemoryServer
- Manual browser testing

---

## 4. Preconditions

Before starting regression testing:

1. Pull the latest code from the correct branch.
2. Install dependencies if package files changed.
3. Make sure environment variables are available.
4. Make sure backend and frontend can start normally.
5. Use the latest stable test results as the reference point.

---

## 5. Commands to Run

### Backend automated regression
```powershell
cd backend
npm test
```

### Frontend automated regression
```powershell
cd frontend
npm test -- --watchAll=false
```

### Start backend manually
```powershell
cd backend
npm start
```

### Start frontend manually
```powershell
cd frontend
npm start
```

---

## 6. Regression Test Checklist

### 6.1 Automated Regression Checks

| Test ID | Area | Check | Expected Result | Status | Notes |
|--------|------|-------|-----------------|--------|-------|
| REG-TC-001 | Backend | Run full backend test suite | All backend suites should pass | Pending | |
| REG-TC-002 | Frontend | Run full frontend test suite | Existing stable suites should pass; known ADHD audio issue should be tracked separately if still present | Pending | |
| REG-TC-003 | Backend Auth | Verify auth route tests | Auth tests should pass | Pending | |
| REG-TC-004 | Backend Preferences | Verify preferences route tests | Preferences tests should pass | Pending | |
| REG-TC-005 | Backend Lessons | Verify lessons/i18n tests | Localization tests should pass | Pending | |
| REG-TC-006 | Backend Admin | Verify admin route tests | Admin route tests should pass | Pending | |
| REG-TC-007 | Backend TTS | Verify TTS tests | TTS route tests should pass | Pending | |
| REG-TC-008 | Frontend Login | Verify login component tests | Login tests should pass | Pending | |
| REG-TC-009 | Frontend Register | Verify register component tests | Register tests should pass | Pending | |
| REG-TC-010 | Frontend Progress | Verify progress page tests | Progress page tests should pass | Pending | |

### 6.2 Manual Regression Checks

| Test ID | Area | Steps | Expected Result | Status | Notes |
|--------|------|-------|-----------------|--------|-------|
| REG-TC-011 | Login | Open app and log in with valid credentials | User should be logged in and redirected correctly | Pending | |
| REG-TC-012 | Login Validation | Try invalid login | Proper validation or error message should appear | Pending | |
| REG-TC-013 | Registration | Register a new user with valid data | User should be created successfully | Pending | |
| REG-TC-014 | Preferences | Open preferences/settings and update values | Changes should save and reflect in UI | Pending | |
| REG-TC-015 | Preferences Reset | Reset preferences to default | Default values should be restored | Pending | |
| REG-TC-016 | Progress Page | Open progress page after login | Progress page should load without errors | Pending | |
| REG-TC-017 | ADHD View | Open ADHD learning view and navigate basic flow | View should load and basic interactions should work | Pending | |
| REG-TC-018 | Autism View | Open Autism learning view and navigate basic flow | View should load and basic interactions should work | Pending | |
| REG-TC-019 | Dyslexia Flow | Open dyslexia-related learning content if available | Content should render correctly | Pending | |
| REG-TC-020 | Lesson Access | Open lesson content from the app | Lesson should load with correct data | Pending | |
| REG-TC-021 | Localization | Check translated/localized content where supported | Expected language content should display | Pending | |
| REG-TC-022 | Logout | Log out from the application | Session should end and user should return to the login or landing page | Pending | |

---

## 7. What to Focus On During Regression

The main idea is to re-check the features most likely to be affected by recent shared changes.

Focus areas:
- authentication flow
- accessibility preferences
- progress tracking
- lesson rendering
- learning view behavior
- localization support
- shared route and state behavior

If something fails, check whether it is:
- a new regression
- an already known issue
- a test environment problem
- a dependency/setup problem

---

## 8. Current Known Issue to Track Separately

At the moment, one frontend suite is still unstable:

- `src/__tests__/components/learning/ADHDView.test.js`

This appears to be related to the audio/TTS path in the test environment. It should be recorded if it appears again during regression, but it should not be mixed up with unrelated regressions unless the root cause changes.

---

## 9. Result Summary

Use this section after execution.

| Area | Result | Notes |
|------|--------|-------|
| Backend automated regression | Pending | |
| Frontend automated regression | Pending | |
| Manual regression checks | Pending | |
| New regressions found | Pending | |
| Known issues reappeared | Pending | |

---

## 10. Defect Log

Record any regression issues here.

| Defect ID | Area | Description | Severity | Status | Notes |
|-----------|------|-------------|----------|--------|-------|
| REG-DEF-001 | | | | | |

---

## 11. Final Notes

This report is meant to be updated after each regression cycle. Keep the wording simple and record only what was actually tested. If a test was skipped, mark it clearly. If a failure is already known, note that instead of describing it like a new bug.

---

