describe('Signup flow (mocked)', () => {

  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      body: {
        user: {
          id: 2,
          name: 'New',
          surname: 'User',
          email: 'new@mail.com',
          role: 'user'
        }
      }
    }).as('signupRequest');

    cy.intercept({ method: 'GET', url: '**/api/auth/me', times: 1 }, {
      statusCode: 401,
      body: {
        message: 'Unauthorized'
      }
    }).as('guestMeRequest');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 2,
          name: 'New',
          surname: 'User',
          email: 'new@mail.com',
          role: 'user'
        }
      }
    }).as('meRequest');

    cy.visit('/signup');
    cy.wait('@guestMeRequest');
  });

  it('creates a new account', () => {
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');

    cy.contains('button', 'Sign Up').click();

    cy.wait('@signupRequest');
    cy.wait('@meRequest');

    cy.url().should('include', '/app');
  });

});