const ADMIN_USER = {
  id: 2,
  userID: 2,
  name: 'Admin',
  surname: 'User',
  email: 'admin@mail.com',
  role: 'admin',
};

const JANE = {
  userID: 1,
  id: 1,
  name: 'Jane',
  surname: 'Doe',
  email: 'jane@mail.com',
  role: 'logged_in_user',
  created_at: '2024-01-10T08:00:00Z',
};

describe('Admin Users page (mocked)', () => {

  function stubAdmin(users) {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: ADMIN_USER },
    }).as('meRequest');

    cy.intercept('GET', '**/api/admin/users', {
      statusCode: 200,
      body: { users: users !== undefined ? users : [JANE] },
    }).as('usersRequest');
  }

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    stubAdmin();
    cy.visit('/admin/users');
    cy.wait('@meRequest');
    cy.wait('@usersRequest');
    cy.contains('Users').should('be.visible');
  });

  it('renders user name and email in the table', () => {
    cy.contains('Jane').should('be.visible');
    cy.contains('jane@mail.com').should('be.visible');
  });

  it('renders user role in the table', () => {
    cy.contains('logged_in_user').should('be.visible');
  });

  it('search filters matching users', () => {
    cy.get('input[placeholder="Search users"]').type('jane');
    cy.contains('jane@mail.com').should('be.visible');
  });

  it('search hides non-matching users and shows no-results message', () => {
    cy.get('input[placeholder="Search users"]').type('zzznomatch');
    cy.contains('No users found').should('be.visible');
    cy.contains('Jane').should('not.exist');
  });

  it('search clears correctly to show all users again', () => {
    cy.get('input[placeholder="Search users"]').type('zzz');
    cy.contains('No users found').should('be.visible');
    cy.get('input[placeholder="Search users"]').clear();
    cy.contains('Jane').should('be.visible');
  });

  it('opens the Edit User modal when clicking the edit icon', () => {
    cy.get('[aria-label="Edit user"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('Edit User').should('be.visible');
  });

  it('pre-fills the Edit User modal with existing user data', () => {
    cy.get('[aria-label="Edit user"]').first().click();
    cy.get('[role="dialog"]').find('input[value="Jane"]').should('exist');
    cy.get('[role="dialog"]').find('input[value="jane@mail.com"]').should('exist');
  });

  it('closes the Edit User modal on Cancel', () => {
    cy.get('[aria-label="Edit user"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('submits an edit and refreshes the users list', () => {
    cy.intercept('PUT', '**/api/admin/users/**', { statusCode: 200, body: {} }).as('updateUser');
    cy.intercept('GET', '**/api/admin/users', {
      statusCode: 200,
      body: { users: [{ ...JANE, name: 'Jane Updated' }] },
    }).as('usersRefresh');

    cy.get('[aria-label="Edit user"]').first().click();
    cy.get('[role="dialog"]').contains('button', 'Save Changes').click();
    cy.wait('@updateUser');
    cy.wait('@usersRefresh');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('opens the Delete modal when clicking the delete icon', () => {
    cy.get('[aria-label="Delete user"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('deleting this user').should('be.visible');
  });

  it('shows a validation error when deleting without a reason', () => {
    cy.get('[aria-label="Delete user"]').first().click();
    cy.get('[role="dialog"]').find('button').contains('Delete User').click();
    cy.contains('Please provide a short reason').should('be.visible');
  });

  it('confirms deletion with a valid reason', () => {
    cy.intercept('DELETE', '**/api/admin/users/**', { statusCode: 200, body: {} }).as('deleteUser');
    cy.intercept('GET', '**/api/admin/users', { statusCode: 200, body: { users: [] } }).as('usersRefresh');

    cy.get('[aria-label="Delete user"]').first().click();
    cy.get('[role="dialog"]').find('textarea').type('Test deletion reason');
    cy.get('[role="dialog"]').find('button').contains('Delete User').click();
    cy.wait('@deleteUser');
    cy.wait('@usersRefresh');
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains('User deleted').should('be.visible');
  });

  it('closes the Delete modal on Cancel', () => {
    cy.get('[aria-label="Delete user"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

});
