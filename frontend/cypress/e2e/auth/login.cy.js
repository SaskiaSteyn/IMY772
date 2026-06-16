describe('Login flow (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('meRequest');
    cy.visit('/login');
    cy.get('input[type="email"]').should('be.visible').and('not.be.disabled');
  });

  it('logs in successfully and redirects to dashboard', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { user: { id: 1, name: 'Test User', email: 'test@mail.com' }, token: 'fake-jwt-token' },
    }).as('loginRequest');
    cy.get('input[type="email"]').type('test@mail.com');
    cy.get('input[type="password"]').type('123456');
    cy.contains('button', 'Sign In').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });

  it('shows validation error for invalid email format', () => {
    // Disable HTML5 native validation at the form level so the browser doesn't
    // intercept the submit before Mantine's onSubmit handler runs.
    // The <form> JSX only carries onSubmit+style, so React won't remove
    // noValidate during re-renders triggered by typing.
    cy.get('form').invoke('prop', 'noValidate', true);
    cy.get('input[aria-label="email"]').clear().type('not-an-email');
    cy.get('input[type="password"]').type('password');
    cy.contains('button', 'Sign In').click();
    cy.contains('Please enter a valid email').should('be.visible');
  });

  it('shows validation error when password is empty', () => {
    cy.get('input[type="email"]').type('test@mail.com');
    cy.contains('button', 'Sign In').click();
    cy.contains('Password is required').should('be.visible');
  });

  it('shows error message on invalid credentials (401)', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('loginFail');
    cy.get('input[type="email"]').type('wrong@mail.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.contains('button', 'Sign In').click();
    cy.wait('@loginFail');
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('shows error message when account lacks permission (403)', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 403,
      body: { message: 'Forbidden' },
    }).as('loginForbidden');
    cy.get('input[type="email"]').type('blocked@mail.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Sign In').click();
    cy.wait('@loginForbidden');
    cy.contains('does not have permission').should('be.visible');
  });

  it('renders the brand logo and MicroTrack label', () => {
    cy.get('.auth-brand').should('be.visible');
    cy.get('.auth-brand').contains('MicroTrack').should('be.visible');
  });

  it('has a link to the signup page', () => {
    cy.contains('a', 'Sign up').should('have.attr', 'href', '/signup');
  });

  it('renders the Remember me checkbox', () => {
    cy.contains('Remember me').should('be.visible');
  });

  it('redirects already-authenticated users away from /login to dashboard', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: { id: 1, name: 'Test', surname: 'User', email: 'test@mail.com', role: 'logged_in_user' } },
    }).as('meLoggedIn');
    cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
    cy.visit('/login');
    cy.wait('@meLoggedIn');
    cy.url().should('include', '/dashboard');
  });

});
