const SAMPLE_FIXTURES = [
  {
    sample_id: 1,
    location_name: 'Hennops River',
    latitude: '-25.8553',
    longitude: '28.0456',
    collection_date: '2024-01-15',
    predicted_sir_profile: 'susceptible',
  },
  {
    sample_id: 2,
    location_name: 'Crocodile River',
    latitude: '-25.6500',
    longitude: '27.7800',
    collection_date: '2024-02-10',
    predicted_sir_profile: 'resistant',
  },
];

function stubGuest() {
  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 401,
    body: { message: 'Unauthorized' },
  }).as('meRequest');
}

// fetchAllSamples expects { samples: [...] } — wrap the body correctly
function stubSamples(samples) {
  const body = samples !== undefined ? { samples } : { samples: SAMPLE_FIXTURES };
  cy.intercept('GET', '**/api/samples', {
    statusCode: 200,
    body,
  }).as('samplesRequest');
}

describe('Dashboard page (mocked)', () => {

  describe('with sample data', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      stubSamples();
      cy.visit('/dashboard');
      cy.wait('@samplesRequest');
      cy.get('.dashboard-container').should('be.visible');
    });

    it('renders the map and leaflet container', () => {
      cy.get('.leaflet-map').should('be.visible');
      cy.get('.leaflet-container').should('exist');
    });

    it('renders the sidebar navbar', () => {
      cy.get('.sidebar').should('be.visible');
    });

    it('renders a map marker for each unique location', () => {
      cy.get('.leaflet-marker-icon', { timeout: 10000 }).should('have.length.at.least', 1);
    });

    it('renders the AI filter bar', () => {
      cy.get('.ai-float').should('exist');
    });

    it('shows only the Dashboard link as active in the sidebar for guests', () => {
      cy.get('.sidebar-nav .nav-item.active').should('exist');
    });
  });

  describe('server error / waking-up state', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      cy.intercept('GET', '**/api/samples', { statusCode: 503, body: {} }).as('samplesError');
      cy.visit('/dashboard');
      cy.wait('@samplesError');
    });

    it('shows the server waking-up message', () => {
      cy.get('.server-waking-up').should('be.visible');
      cy.contains('Server is waking up').should('be.visible');
      cy.contains('Retrying automatically').should('be.visible');
    });

    it('still renders the sidebar in the error state', () => {
      cy.get('.sidebar').should('be.visible');
    });
  });

  describe('with no samples', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubGuest();
      stubSamples([]);
      cy.visit('/dashboard');
      cy.wait('@samplesRequest');
      cy.get('.dashboard-container').should('be.visible');
    });

    it('renders the map with no markers when there are no samples', () => {
      cy.get('.leaflet-container').should('exist');
      cy.get('.leaflet-marker-icon').should('not.exist');
    });
  });

  describe('authenticated regular user', () => {
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
            role: 'logged_in_user',
          },
        },
      }).as('meRequest');
      stubSamples();
      cy.visit('/dashboard');
      cy.wait('@samplesRequest');
      cy.get('.dashboard-container').should('be.visible');
    });

    it('shows user name in the sidebar footer', () => {
      cy.get('.sidebar-footer').contains('Test User').should('be.visible');
    });

    it('shows Data nav item in the sidebar', () => {
      cy.get('.sidebar-nav').contains('Data').should('be.visible');
    });

    it('shows Profile Settings nav item in the sidebar', () => {
      cy.get('.sidebar-nav').contains('Profile Settings').should('be.visible');
    });

    it('does not show Admin Dashboard link for a regular user', () => {
      cy.get('.sidebar-nav').contains('Admin Dashboard').should('not.exist');
    });

    it('shows a Logout button in the sidebar footer', () => {
      cy.get('.sidebar-footer').contains('Logout').should('be.visible');
    });
  });

});
