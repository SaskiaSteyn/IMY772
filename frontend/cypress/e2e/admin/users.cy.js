describe('Admin Users page (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 2,
          userID: 2,
          name: 'Admin',
          surname: 'User',
          email: 'admin@mail.com',
          role: 'admin'
        }
      }
    }).as('meRequest');

    cy.intercept('GET', '**/api/admin/users', {
      statusCode: 200,
      body: {
        users: [
          {
            id: 1,
            name: 'Jane',
            surname: 'Doe',
            email: 'jane@mail.com',
            role: 'logged_in_user'
          }
        ]
      }
    }).as('usersRequest');

    cy.visit('/admin/users');
    cy.wait('@meRequest');
    cy.wait('@usersRequest');
    cy.contains('Users').should('be.visible');
  });

  it('renders the users table and filters results with search', () => {
    cy.contains('Jane').should('be.visible');
    cy.contains('jane@mail.com').should('be.visible');

    cy.get('input[placeholder="Search users"]').type('jane');
    cy.contains('jane@mail.com').should('be.visible');

    cy.get('input[placeholder="Search users"]').clear().type('zzznomatch');
    cy.contains('No users found').should('be.visible');
  });

});
