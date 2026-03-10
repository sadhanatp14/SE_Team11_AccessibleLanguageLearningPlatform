/// <reference types="cypress" />

describe('Core E2E Flows - Accessible Language Learning Platform', () => {
  const baseUrl = 'http://localhost:3000';

  // Test accounts for different learning conditions
  const autismAccount = {
    email: 'yeshwanthnaidu2204@gmail.com',
    password: 'yeshwanth',
    learningCondition: 'autism',
  };

  const adhdAccount = {
    email: 'sample@gmail.com',
    password: 'yeshwanth',
    learningCondition: 'adhd',
  };

  // ===== PUBLIC ROUTE TESTS =====
  
  describe('Public Routes - Authentication', () => {
    it('E2E-TC-001: Login page loads correctly', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('h2.login-title', { timeout: 5000 }).should('contain', 'Welcome Back');
      cy.get('input[type="email"]', { timeout: 5000 }).should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.get('button[type="submit"]').should('exist');
    });

    it('E2E-TC-002: Navigate to Register page', () => {
      cy.visit(`${baseUrl}/login`);
      cy.contains('a', /sign up/i).click();
      cy.url().should('include', '/register');
      cy.get('input[name="name"]').should('exist');
    });

    it('E2E-TC-003: Register navigation link works', () => {
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="name"]').should('exist');
      cy.get('input[name="email"]').should('exist');
      cy.get('input[name="password"]').should('exist');
    });
  });

  // ===== AUTISM ACCOUNT TESTS =====

  describe('Autism Account Flow (yeshwanthnaidu2204@gmail.com)', () => {
    it('E2E-TC-004: Login with Autism account', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(autismAccount.email);
      cy.get('input[type="password"]').type(autismAccount.password);
      cy.get('button[type="submit"]').click();

      // Wait for dashboard to load
      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      // Verify main content area exists
      cy.get('[id="learning-container"], [class*="dashboard"]', { timeout: 5000 }).should('exist');
    });

    it('E2E-TC-005: Access Progress page from menu (Autism)', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(autismAccount.email);
      cy.get('input[type="password"]').type(autismAccount.password);
      cy.get('button[type="submit"]').click();

      // Wait for dashboard, then open menu
      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('button[title="Menu"]', { timeout: 5000 }).click();
      
      // Click progress button in menu
      cy.contains('button', /progress/i).click();
      cy.url({ timeout: 8000 }).should('include', '/progress');
    });

    it('E2E-TC-006: Open menu and verify quick controls (Autism)', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(autismAccount.email);
      cy.get('input[type="password"]').type(autismAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('button[title="Menu"]', { timeout: 5000 }).click();
      cy.contains('button', /progress/i, { timeout: 5000 }).should('be.visible');
      cy.contains('button', /settings|profile|preferences|distraction/i, { timeout: 5000 }).should('be.visible');
    });

    it('E2E-TC-007: Logout from Autism account', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(autismAccount.email);
      cy.get('input[type="password"]').type(autismAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      // AutismView uses `btn-exit` for logout; keep a text fallback for localization variants.
      cy.get('body').then(($body) => {
        if ($body.find('button.btn-exit').length > 0) {
          cy.get('button.btn-exit', { timeout: 5000 }).first().click({ force: true });
          return;
        }
        cy.contains('button', /logout|sign out/i, { timeout: 5000 }).first().click({ force: true });
      });

      // App may route to login or welcome entry page after logout.
      cy.url({ timeout: 10000 }).should('not.include', '/dashboard');
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible');
    });
  });

  // ===== ADHD ACCOUNT TESTS =====

  describe('ADHD Account Flow (sample@gmail.com)', () => {
    it('E2E-TC-008: Login with ADHD account', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(adhdAccount.email);
      cy.get('input[type="password"]').type(adhdAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('[id="learning-container"], [class*="dashboard"]', { timeout: 5000 }).should('exist');
    });

    it('E2E-TC-009: Access Progress page from menu (ADHD)', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(adhdAccount.email);
      cy.get('input[type="password"]').type(adhdAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('button[title="Menu"]', { timeout: 5000 }).click();
      cy.contains('button', /progress/i).click();
      cy.url({ timeout: 8000 }).should('include', '/progress');
    });

    it('E2E-TC-010: Toggle Settings from side menu (ADHD)', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(adhdAccount.email);
      cy.get('input[type="password"]').type(adhdAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      // Open menu
      cy.get('button[title="Menu"]', { timeout: 5000 }).click();
      // Look for settings button
      cy.contains('button', /settings|profile|preferences|distraction/i).should('be.visible');
    });

    it('E2E-TC-011: Logout from ADHD account', () => {
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(adhdAccount.email);
      cy.get('input[type="password"]').type(adhdAccount.password);
      cy.get('button[type="submit"]').click();

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('button.btn-logout', { timeout: 5000 }).click();
      cy.url({ timeout: 8000 }).should('include', '/login');
    });
  });

  // ===== PROTECTED ROUTE TESTS =====

  describe('Protected Routes - Access Control', () => {
    it('E2E-TC-012: Dashboard redirect without authentication', () => {
      // Clear any existing auth
      cy.clearLocalStorage();
      cy.visit(`${baseUrl}/dashboard`);
      // Should redirect to login
      cy.url({ timeout: 8000 }).should('include', '/login');
    });

    it('E2E-TC-013: Progress page redirect without authentication', () => {
      cy.clearLocalStorage();
      cy.visit(`${baseUrl}/progress`);
      cy.url({ timeout: 8000 }).should('include', '/login');
    });

    it('E2E-TC-014: Lesson Library redirect without authentication', () => {
      cy.clearLocalStorage();
      cy.visit(`${baseUrl}/lesson-library`);
      cy.url({ timeout: 8000 }).should('include', '/login');
    });
  });

  // ===== LESSON INTERACTION TESTS =====

  describe('Lesson Interactions (ADHD Account)', () => {
    beforeEach(() => {
      // Login before each test in this suite
      cy.visit(`${baseUrl}/login`);
      cy.get('input[type="email"]').type(adhdAccount.email);
      cy.get('input[type="password"]').type(adhdAccount.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 8000 }).should('include', '/dashboard');
    });

    it('E2E-TC-015: Launch first available lesson from lesson library', () => {
      cy.visit(`${baseUrl}/lesson-library`);
      cy.url({ timeout: 8000 }).should('include', '/lesson-library');

      cy.get('article', { timeout: 8000 }).first().within(() => {
        cy.get('button[type="button"]').click({ force: true });
      });

      // ADHD lessons open through dashboard deep-linking.
      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('.intro-view, .lesson-player, button.btn-back', { timeout: 8000 }).should('exist');
    });

    it('E2E-TC-016: Navigate back from lesson library to dashboard', () => {
      cy.visit(`${baseUrl}/lesson-library`);
      cy.url({ timeout: 8000 }).should('include', '/lesson-library');

      // The first button on the library page is the back-to-dashboard control.
      cy.get('button[type="button"]', { timeout: 8000 }).first().click({ force: true });

      cy.url({ timeout: 8000 }).should('include', '/dashboard');
      cy.get('#learning-container, [class*="dashboard"]', { timeout: 8000 }).should('exist');
    });
  });
});