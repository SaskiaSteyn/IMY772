describe('Dashboard page (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' }
    }).as('meRequest');

    cy.intercept('GET', '**/api/samples', {
      statusCode: 200,
      body: [
        {
          sample_id: 1,
          location_name: 'Hennops River',
          latitude: '-25.8553',
          longitude: '28.0456',
          collection_date: '2024-01-15',
          predicted_sir_profile: 'susceptible'
        },
        {
          sample_id: 2,
          location_name: 'Crocodile River',
          latitude: '-25.6500',
          longitude: '27.7800',
          collection_date: '2024-02-10',
          predicted_sir_profile: 'resistant'
        }
      ]
    }).as('samplesRequest');

    cy.visit('/dashboard');
    cy.wait('@samplesRequest');
    cy.get('.dashboard-container').should('be.visible');
  });

  it('renders the dashboard with the map and navbar', () => {
    cy.get('.leaflet-map').should('be.visible');
    cy.get('.leaflet-container').should('exist');
  });

});
