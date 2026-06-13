describe('Admin Water Data page (mocked)', () => {

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

    cy.intercept('GET', '**/api/admin/water/samples', {
      statusCode: 200,
      body: {
        rows: [
          {
            sampleID: 'W001',
            location_name: 'Hennops River',
            collected_by: 'Admin User',
            sample_analysis_type: 'chemical',
            latitude: '-25.8553',
            longitude: '28.0456'
          }
        ]
      }
    }).as('waterSamplesRequest');

    cy.visit('/admin/water-data');
    cy.wait('@meRequest');
    cy.wait('@waterSamplesRequest');
    cy.contains('Water Data').should('be.visible');
  });

  it('renders the water data table and filters results with search', () => {
    cy.contains('Hennops River').should('be.visible');

    cy.get('input[placeholder*="earch"]').type('Hennops');
    cy.contains('Hennops River').should('be.visible');

    cy.get('input[placeholder*="earch"]').clear().type('zzznomatch');
    cy.get('tbody tr').should('not.exist');
  });

});
