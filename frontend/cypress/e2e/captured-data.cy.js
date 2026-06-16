describe('Captured Data page (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 1,
          userID: 1,
          name: 'Test',
          surname: 'User',
          email: 'test@mail.com',
          role: 'logged_in_user'
        }
      }
    }).as('meRequest');

    cy.intercept('GET', '**/api/samples', {
      statusCode: 200,
      body: {
        samples: [
          {
            sample_id: 1,
            location_name: 'Hennops River',
            collection_date: '2024-01-15',
            uploaded_by: 1
          }
        ]
      }
    }).as('samplesRequest');

    cy.intercept('GET', '**/api/isolates', {
      statusCode: 200,
      body: { isolates: [] }
    }).as('isolatesRequest');

    cy.intercept('GET', '**/api/predicted-phenotypes', {
      statusCode: 200,
      body: { phenotypes: [] }
    }).as('phenotypesRequest');

    cy.intercept('GET', '**/api/amr-findings', {
      statusCode: 200,
      body: { amrFindings: [] }
    }).as('amrRequest');

    cy.visit('/capture-data');
    cy.wait('@meRequest');
    cy.contains('Samples').should('be.visible');
  });

  it('renders data tabs and opens the add new entry modal', () => {
    cy.contains('Isolates').should('be.visible');
    cy.contains('Predicted phenotypes').should('be.visible');
    cy.contains('AMR findings').should('be.visible');
    cy.contains('Virulence genes').should('be.visible');

    cy.contains('button', 'Add new entry').should('be.visible').click();

    cy.get('[role="dialog"]').should('be.visible');
  });

});
