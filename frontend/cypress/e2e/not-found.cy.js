describe('Not Found page (mocked)', () => {

  function stubGuest() {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('meRequest');
  }

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    stubGuest();
    cy.visit('/this-route-does-not-exist');
    cy.wait('@meRequest');
    cy.get('.not-found-page').should('be.visible');
  });

  it('displays the 404 code', () => {
    cy.get('.not-found-code').should('contain', '404');
  });

  it('displays "Page not found" heading', () => {
    cy.contains('Page not found').should('be.visible');
  });

  it('displays the descriptive message', () => {
    cy.contains("doesn't exist or has been moved").should('be.visible');
  });

  it('renders Go to Dashboard and Go Back buttons', () => {
    cy.contains('button', 'Go to Dashboard').should('be.visible');
    cy.contains('button', 'Go Back').should('be.visible');
  });

  it('Go to Dashboard button navigates to /dashboard', () => {
    cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
    cy.contains('button', 'Go to Dashboard').click();
    cy.url().should('include', '/dashboard');
  });

  it('renders the MicroTrack brand on the 404 page', () => {
    cy.get('.not-found-brand').should('be.visible');
    cy.get('.not-found-brand').contains('MicroTrack').should('be.visible');
  });

  it('shows the 404 page for any unknown route', () => {
    stubGuest();
    cy.visit('/another/unknown/path');
    cy.wait('@meRequest');
    cy.get('.not-found-code').should('contain', '404');
  });

});
