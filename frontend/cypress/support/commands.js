// ***********************************************
// Custom Cypress commands shared across all tests
// ***********************************************

/**
 * Stub the /api/auth/me endpoint to return an authenticated regular user,
 * then visit the given URL and wait for the me-stub to resolve.
 */
Cypress.Commands.add('loginAs', (user = {}, url = '/dashboard') => {
  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: {
      user: {
        id: 1,
        userID: 1,
        name: 'Test',
        surname: 'User',
        email: 'test@mail.com',
        role: 'logged_in_user',
        ...user,
      },
    },
  }).as('meAuth');

  cy.visit(url);
  cy.wait('@meAuth');
});

/**
 * Stub /api/auth/me to return an admin user, then visit the given URL.
 */
Cypress.Commands.add('loginAsAdmin', (url = '/admin/statistics') => {
  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: {
      user: {
        id: 2,
        userID: 2,
        name: 'Admin',
        surname: 'User',
        email: 'admin@mail.com',
        role: 'admin',
      },
    },
  }).as('meAdmin');

  cy.visit(url);
  cy.wait('@meAdmin');
});

/**
 * Stub /api/auth/me to return 401 (guest), then visit the given URL.
 */
Cypress.Commands.add('visitAsGuest', (url = '/dashboard') => {
  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 401,
    body: { message: 'Unauthorized' },
  }).as('meGuest');

  cy.visit(url);
  cy.wait('@meGuest');
});
