describe('Signup flow (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

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

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: {
        message: 'Unauthorized'
      }
    }).as('guestMeRequest');

    cy.visit('/signup');
    cy.wait('@guestMeRequest');
    cy.get('input[placeholder="Your first name"]').should('be.visible');
  });

  it('creates a new account', () => {
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');

    cy.contains('button', 'Sign Up').click();

    cy.wait('@signupRequest');

    cy.url().should('include', '/dashboard');
  });

});