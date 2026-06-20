/**
 * Routing / route guard tests
 *
 * Verifies that:
 *  - The root path / redirects to /dashboard
 *  - Unauthenticated users are redirected to /login from protected routes
 *  - Non-admin users are redirected to /dashboard from admin routes
 *  - Admin users can access admin routes
 */

const REGULAR_USER = {
  id: 1,
  userID: 1,
  name: 'Test',
  surname: 'User',
  email: 'test@mail.com',
  role: 'logged_in_user',
};

const ADMIN_USER = {
  id: 2,
  userID: 2,
  name: 'Admin',
  surname: 'User',
  email: 'admin@mail.com',
  role: 'admin',
};

describe('Routing and route guards (mocked)', () => {

  describe('root redirect', () => {
    it('redirects / to /dashboard', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: {} }).as('me');
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/');
      cy.wait('@me');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('unauthenticated user', () => {
    function stubGuest() {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { message: 'Unauthorized' } }).as('meGuest');
    }

    it('redirects /profile to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/profile');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('redirects /profile-settings to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/profile-settings');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('redirects /capture-data to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/capture-data');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('redirects /app to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/app');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('redirects /admin/water-data to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/admin/water-data');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('redirects /admin/users to /login', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.visit('/admin/users');
      cy.wait('@meGuest');
      cy.url().should('include', '/login');
    });

    it('can access /dashboard without authentication', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/dashboard');
      cy.wait('@meGuest');
      cy.url().should('include', '/dashboard');
      cy.get('.dashboard-container').should('be.visible');
    });
  });

  describe('authenticated regular user', () => {
    function stubRegular() {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: REGULAR_USER } }).as('meRegular');
    }

    it('redirects /admin/water-data to /dashboard for non-admin', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubRegular();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/admin/water-data');
      cy.wait('@meRegular');
      cy.url().should('include', '/dashboard');
    });

    it('redirects /admin/users to /dashboard for non-admin', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubRegular();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/admin/users');
      cy.wait('@meRegular');
      cy.url().should('include', '/dashboard');
    });

    it('redirects /admin/statistics to /dashboard for non-admin', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubRegular();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/admin/statistics');
      cy.wait('@meRegular');
      cy.url().should('include', '/dashboard');
    });

    it('redirects /login to /dashboard when already logged in', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubRegular();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/login');
      cy.wait('@meRegular');
      cy.url().should('include', '/dashboard');
    });

    it('redirects /signup to /dashboard when already logged in', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubRegular();
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/signup');
      cy.wait('@meRegular');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('authenticated admin user', () => {
    function stubAdmin() {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: ADMIN_USER } }).as('meAdmin');
    }

    it('admin can access /admin/water-data', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/water/samples', { statusCode: 200, body: { rows: [] } }).as('water');
      cy.visit('/admin/water-data');
      cy.wait('@meAdmin');
      cy.url().should('include', '/admin/water-data');
    });

    it('admin can access /admin/users', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/users', { statusCode: 200, body: { users: [] } }).as('users');
      cy.visit('/admin/users');
      cy.wait('@meAdmin');
      cy.url().should('include', '/admin/users');
    });

    it('admin can access /admin/statistics', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/summary', { statusCode: 200, body: { metrics: {}, recentDeletions: [] } }).as('summary');
      cy.visit('/admin/statistics');
      cy.wait('@meAdmin');
      cy.url().should('include', '/admin/statistics');
    });

    it('/admin redirects to /admin/water-data by default', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/water/samples', { statusCode: 200, body: { rows: [] } }).as('water');
      cy.visit('/admin');
      cy.wait('@meAdmin');
      cy.url().should('include', '/admin/water-data');
    });
  });

});
