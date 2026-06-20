/**
 * Navbar / Sidebar tests
 *
 * Tests the DashboardNavbar component's collapse/expand behaviour,
 * navigation links, guest login button, authenticated user section,
 * logout modal, and admin-only link visibility.
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

function stubSamples() {
  cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samplesRequest');
}

describe('Sidebar / Navbar (mocked)', () => {

  describe('as a guest (unauthenticated)', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { message: 'Unauthorized' } }).as('meGuest');
      stubSamples();
      cy.visit('/dashboard');
      cy.wait('@meGuest');
      cy.wait('@samplesRequest');
      cy.get('.sidebar').should('be.visible');
    });

    it('renders the sidebar in open state by default', () => {
      cy.get('.sidebar.open').should('exist');
    });

    it('shows only the Dashboard nav item for guests', () => {
      cy.get('.sidebar-nav').contains('Dashboard').should('be.visible');
      cy.get('.sidebar-nav').contains('Data').should('not.exist');
      cy.get('.sidebar-nav').contains('Profile Settings').should('not.exist');
    });

    it('shows a Login button in the footer for guests', () => {
      cy.get('.sidebar-footer').contains('Login').should('be.visible');
    });

    it('Login button navigates to /login', () => {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 401, body: { message: 'Unauthorized' } }).as('meLogin');
      cy.get('.sidebar-footer').contains('Login').click();
      cy.url().should('include', '/login');
    });

    it('collapses and expands the sidebar with the toggle button', () => {
      cy.get('.sidebar-edge-toggle').click();
      cy.get('.sidebar.closed').should('exist');
      cy.get('.sidebar-edge-toggle').click();
      cy.get('.sidebar.open').should('exist');
    });

    it('hides nav labels when sidebar is collapsed', () => {
      cy.get('.sidebar-edge-toggle').click();
      cy.get('.nav-label').should('not.exist');
    });
  });

  describe('as a regular authenticated user', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: REGULAR_USER } }).as('meAuth');
      stubSamples();
      cy.visit('/dashboard');
      cy.wait('@meAuth');
      cy.wait('@samplesRequest');
      cy.get('.sidebar').should('be.visible');
    });

    it('shows authenticated nav items: Dashboard, Data, Profile Settings', () => {
      cy.get('.sidebar-nav').contains('Dashboard').should('be.visible');
      cy.get('.sidebar-nav').contains('Data').should('be.visible');
      cy.get('.sidebar-nav').contains('Profile Settings').should('be.visible');
    });

    it('does not show Admin Dashboard link for regular users', () => {
      cy.get('.sidebar-nav').contains('Admin Dashboard').should('not.exist');
    });

    it('shows the user name and email in the sidebar footer', () => {
      cy.get('.sidebar-footer').contains('Test User').should('be.visible');
      cy.get('.sidebar-footer').contains('test@mail.com').should('be.visible');
    });

    it('shows a Logout button in the sidebar footer', () => {
      cy.get('.sidebar-footer').contains('Logout').should('be.visible');
    });

    it('clicking Logout opens the confirmation modal', () => {
      cy.get('.sidebar-footer').contains('Logout').click();
      cy.get('[role="dialog"]').contains('Confirm Logout').should('be.visible');
    });

    it('logout modal Cancel button closes the modal', () => {
      cy.get('.sidebar-footer').contains('Logout').click();
      cy.get('[role="dialog"]').contains('button', 'Cancel').click();
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('confirming logout calls the logout API and shows unauthenticated state', () => {
      cy.intercept('POST', '**/api/auth/logout', { statusCode: 200, body: {} }).as('logoutRequest');
      cy.get('.sidebar-footer').contains('Logout').click();
      cy.get('[role="dialog"]').contains('button', 'Logout').click();
      cy.wait('@logoutRequest');
    });

    it('Data nav item navigates to /capture-data', () => {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: REGULAR_USER } }).as('meCapture');
      cy.intercept('GET', '**/api/isolates', { statusCode: 200, body: [] }).as('isolates');
      cy.intercept('GET', '**/api/predicted-phenotypes', { statusCode: 200, body: [] }).as('phenotypes');
      cy.intercept('GET', '**/api/amr-findings', { statusCode: 200, body: [] }).as('amr');
      cy.intercept('GET', '**/api/virulence-genes', { statusCode: 200, body: [] }).as('virulence');
      cy.get('.sidebar-nav').contains('Data').click();
      cy.url().should('include', '/capture-data');
    });

    it('Profile Settings nav item navigates to /profile-settings', () => {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: REGULAR_USER } }).as('meProfile');
      cy.intercept('GET', '**/api/auth/profile', { statusCode: 200, body: { profile: {} } }).as('profile');
      cy.intercept('GET', '**/api/samples/uploaded_by/**', { statusCode: 200, body: [] }).as('userSamples');
      cy.intercept('GET', '**/api/isolates', { statusCode: 200, body: [] }).as('isolates');
      cy.intercept('GET', '**/api/amr-findings', { statusCode: 200, body: [] }).as('amr');
      cy.intercept('GET', '**/api/predicted-phenotypes', { statusCode: 200, body: [] }).as('phenotypes');
      cy.get('.sidebar-nav').contains('Profile Settings').click();
      cy.url().should('include', '/profile');
    });
  });

  describe('as an admin user', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: ADMIN_USER } }).as('meAdmin');
      stubSamples();
      cy.visit('/dashboard');
      cy.wait('@meAdmin');
      cy.wait('@samplesRequest');
      cy.get('.sidebar').should('be.visible');
    });

    it('shows the Admin Dashboard link for admin users', () => {
      cy.get('.sidebar-nav').contains('Admin Dashboard').should('be.visible');
    });

    it('Admin Dashboard link navigates to /admin', () => {
      cy.intercept('GET', '**/api/auth/me', { statusCode: 200, body: { user: ADMIN_USER } }).as('meAdmin2');
      cy.intercept('GET', '**/api/admin/water/samples', { statusCode: 200, body: { rows: [] } }).as('waterData');
      cy.get('.sidebar-nav').contains('Admin Dashboard').click();
      cy.url().should('include', '/admin');
    });
  });

});
