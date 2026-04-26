describe('Login flow (mocked)', () => {

  beforeEach(() => {

    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@mail.com'
        },
        token: 'fake-jwt-token'
      }
    }).as('loginRequest');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: {
        message: 'Unauthorized'
      }
    }).as('meRequest');

    cy.visit('/login');
    cy.get('input[type="email"]').should('be.visible').and('not.be.disabled');
  });

  it('logs in successfully', () => {
    cy.get('input[type="email"]').type('test@mail.com');
    cy.get('input[type="password"]').type('123456');
    cy.contains('button', 'Sign In').click();
    
    cy.wait('@loginRequest');
    
    cy.url().should('include', '/dashboard');
  });

});