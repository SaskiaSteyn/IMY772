describe('Not Found page (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' }
    }).as('meRequest');

    cy.visit('/this-route-does-not-exist');
    cy.wait('@meRequest');
    cy.get('.not-found-page').should('be.visible');
  });

  it('shows the 404 page with navigation options', () => {
    cy.get('.not-found-code').should('contain', '404');
    cy.contains('Page not found').should('be.visible');
    cy.contains('button', 'Go to Dashboard').should('be.visible');
    cy.contains('button', 'Go Back').should('be.visible');

    cy.contains('button', 'Go to Dashboard').click();
    cy.url().should('include', '/dashboard');
  });

});
