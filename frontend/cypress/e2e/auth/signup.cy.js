describe('Signup flow (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('guestMeRequest');
    cy.visit('/signup');
    cy.wait('@guestMeRequest');
    cy.get('input[placeholder="Your first name"]').should('be.visible');
  });

  it('creates a new account and redirects to dashboard', () => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      body: { user: { id: 2, name: 'New', surname: 'User', email: 'new@mail.com', role: 'user' } },
    }).as('signupRequest');
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');
    cy.contains('button', 'Sign Up').click();
    cy.wait('@signupRequest');
    cy.url().should('include', '/dashboard');
  });

  it('shows validation error when name is empty', () => {
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');
    cy.contains('button', 'Sign Up').click();
    cy.contains('Name is required').should('be.visible');
  });

  it('shows validation error when surname is empty', () => {
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');
    cy.contains('button', 'Sign Up').click();
    cy.contains('Surname is required').should('be.visible');
  });

  it('shows validation error for invalid email', () => {
    // Disable HTML5 native validation at the form level so the browser doesn't
    // intercept the submit before Mantine's onSubmit handler runs.
    // The <form> JSX only carries onSubmit+style, so React won't remove
    // noValidate during re-renders triggered by typing.
    cy.get('form').invoke('prop', 'noValidate', true);
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[aria-label="email"]').clear().type('not-an-email');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');
    cy.contains('button', 'Sign Up').click();
    cy.contains('Please enter a valid email').should('be.visible');
  });

  it('shows validation error when password is too short', () => {
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('short');
    cy.get('input[type="password"]').eq(1).type('short');
    cy.contains('button', 'Sign Up').click();
    cy.contains('at least 8 characters').should('be.visible');
  });

  it('shows validation error when passwords do not match', () => {
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('new@mail.com');
    cy.get('input[type="password"]').eq(0).type('password123');
    cy.get('input[type="password"]').eq(1).type('different123');
    cy.contains('button', 'Sign Up').click();
    cy.contains('Passwords do not match').should('be.visible');
  });

  it('shows server error message when registration fails', () => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 409,
      body: { message: 'Email already in use' },
    }).as('signupFail');
    cy.get('input[placeholder="Your first name"]').type('New');
    cy.get('input[placeholder="Your last name"]').type('User');
    cy.get('input[type="email"]').type('existing@mail.com');
    cy.get('input[type="password"]').eq(0).type('12345678');
    cy.get('input[type="password"]').eq(1).type('12345678');
    cy.contains('button', 'Sign Up').click();
    cy.wait('@signupFail');
    cy.contains('Email already in use').should('be.visible');
  });

  it('renders the brand logo and MicroTrack label', () => {
    cy.get('.auth-brand').should('be.visible');
    cy.get('.auth-brand').contains('MicroTrack').should('be.visible');
  });

  it('has a link to the login page', () => {
    cy.contains('a', 'Sign in').should('have.attr', 'href', '/login');
  });

  it('renders the Remember me checkbox', () => {
    cy.contains('Remember me').should('be.visible');
  });

  it('redirects already-authenticated users away from /signup to dashboard', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: { id: 1, name: 'Test', surname: 'User', email: 'test@mail.com', role: 'logged_in_user' } },
    }).as('meLoggedIn');
    cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
    cy.visit('/signup');
    cy.wait('@meLoggedIn');
    cy.url().should('include', '/dashboard');
  });

});
