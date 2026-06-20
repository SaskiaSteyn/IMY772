const ADMIN_USER = {
  id: 2,
  userID: 2,
  name: 'Admin',
  surname: 'User',
  email: 'admin@mail.com',
  role: 'admin',
};

const WATER_ROW = {
  sampleID: 'W001',
  location_name: 'Hennops River',
  collected_by: 'Admin User',
  sample_analysis_type: 'chemical',
  latitude: '-25.8553',
  longitude: '28.0456',
  water_temperature: 18.5,
  ph: 7.2,
  tds: 120,
  ec: 240,
  oc: 3.1,
  created_at: '2024-03-01T10:00:00Z',
};

describe('Admin Water Data page (mocked)', () => {

  function stubAdmin(rows) {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: ADMIN_USER },
    }).as('meRequest');

    cy.intercept('GET', '**/api/admin/water/samples', {
      statusCode: 200,
      body: { rows: rows !== undefined ? rows : [WATER_ROW] },
    }).as('waterSamplesRequest');
  }

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    stubAdmin();
    cy.visit('/admin/water-data');
    cy.wait('@meRequest');
    cy.wait('@waterSamplesRequest');
    cy.contains('Water Data').should('be.visible');
  });

  it('renders the location name in the table', () => {
    cy.contains('Hennops River').should('be.visible');
  });

  it('renders water measurement values in the table', () => {
    cy.contains('18.5').should('be.visible');
    cy.contains('7.2').should('be.visible');
  });

  it('search filters matching rows', () => {
    cy.get('input[placeholder*="earch"]').type('Hennops');
    cy.contains('Hennops River').should('be.visible');
  });

  it('search hides non-matching rows', () => {
    cy.get('input[placeholder*="earch"]').type('zzznomatch');
    cy.get('tbody tr').should('not.exist');
  });

  it('search clears to restore all rows', () => {
    cy.get('input[placeholder*="earch"]').type('zzz');
    cy.get('tbody tr').should('not.exist');
    cy.get('input[placeholder*="earch"]').clear();
    cy.contains('Hennops River').should('be.visible');
  });

  it('opens the Edit modal when clicking the edit icon', () => {
    cy.get('[aria-label="Edit row"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('closes the Edit modal on Cancel', () => {
    cy.get('[aria-label="Edit row"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('opens the Delete modal when clicking the delete icon', () => {
    cy.get('[aria-label="Delete row"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('deleting this data').should('be.visible');
  });

  it('shows a validation error when confirming deletion without a reason', () => {
    cy.get('[aria-label="Delete row"]').first().click();
    cy.get('[role="dialog"]').find('button').contains('Delete Entry').click();
    cy.contains('Please provide a short reason').should('be.visible');
  });

  it('confirms deletion with a valid reason and refreshes the table', () => {
    cy.intercept('DELETE', '**/api/admin/water/samples/**', { statusCode: 200, body: {} }).as('deleteRow');
    cy.intercept('GET', '**/api/admin/water/samples', { statusCode: 200, body: { rows: [] } }).as('waterRefresh');

    cy.get('[aria-label="Delete row"]').first().click();
    cy.get('[role="dialog"]').find('textarea').type('Erroneous entry');
    cy.get('[role="dialog"]').find('button').contains('Delete Entry').click();
    cy.wait('@deleteRow');
    cy.wait('@waterRefresh');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('closes the Delete modal on Cancel', () => {
    cy.get('[aria-label="Delete row"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('renders the admin navigation tabs', () => {
    cy.contains('Water Data').should('be.visible');
    cy.contains('Users').should('be.visible');
    cy.contains('Statistics').should('be.visible');
  });

  it('navigates to Statistics tab when clicked', () => {
    cy.intercept('GET', '**/api/admin/summary', {
      statusCode: 200,
      body: { metrics: {}, recentDeletions: [] },
    }).as('summary');
    cy.contains('a', 'Statistics').click();
    cy.url().should('include', '/admin/statistics');
  });

});
