const MOCK_USER = {
  id: 1,
  userID: 1,
  name: 'Test',
  surname: 'User',
  email: 'test@mail.com',
  role: 'logged_in_user',
};

const MOCK_PROFILE = {
  name: 'Test',
  surname: 'User',
  email: 'test@mail.com',
  bio: 'Water quality researcher.',
  interests: ['Water Quality', 'Microbiology'],
  education: [
    {
      institution: 'University of Pretoria',
      qualification: 'BSc Microbiology',
      description: 'Environmental sampling.',
      startDate: '2019-01-01',
      endDate: '2022-12-31',
    },
  ],
  experience: [
    {
      role: 'Research Assistant',
      organization: 'MicroTrack Lab',
      description: 'Sample quality control.',
      startDate: '2024-01-01',
      endDate: '',
    },
  ],
};

describe('Profile page (mocked)', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: MOCK_USER },
    }).as('meRequest');

    cy.intercept('GET', '**/api/auth/profile', {
      statusCode: 200,
      body: { profile: MOCK_PROFILE },
    }).as('profileRequest');

    cy.intercept('GET', '**/api/samples/uploaded_by/**', {
      statusCode: 200,
      body: [],
    }).as('userSamplesRequest');

    cy.intercept('GET', '**/api/isolates', {
      statusCode: 200,
      body: { isolates: [] },
    }).as('isolatesRequest');

    cy.intercept('GET', '**/api/amr-findings', {
      statusCode: 200,
      body: { amrFindings: [] },
    }).as('amrRequest');

    cy.intercept('GET', '**/api/predicted-phenotypes', {
      statusCode: 200,
      body: { phenotypes: [] },
    }).as('phenotypesRequest');

    cy.visit('/profile');
    cy.wait('@meRequest');
    cy.wait('@profileRequest');
    cy.get('.profile-page').should('be.visible');
  });

  it('displays the user name and email', () => {
    cy.contains('Test User').should('be.visible');
    cy.contains('test@mail.com').should('be.visible');
  });

  it('displays the bio text', () => {
    cy.contains('Water quality researcher.').should('be.visible');
  });

  it('displays education entries', () => {
    cy.contains('University of Pretoria').should('be.visible');
    cy.contains('BSc Microbiology').should('be.visible');
  });

  it('displays experience entries', () => {
    cy.contains('Research Assistant').should('be.visible');
    cy.contains('MicroTrack Lab').should('be.visible');
  });

  it('displays interest tags', () => {
    cy.contains('Water Quality').should('be.visible');
    cy.contains('Microbiology').should('be.visible');
  });

  it('displays contributions section', () => {
    cy.contains('Samples Logged').should('be.visible');
    cy.contains('Sites Monitored').should('be.visible');
  });

  it('shows Edit Profile button and switches to editing mode', () => {
    cy.contains('button', 'Edit Profile').should('be.visible').click();
    cy.contains('button', 'Save Changes').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
  });

  it('cancels editing and returns to view mode', () => {
    cy.contains('button', 'Edit Profile').click();
    cy.contains('button', 'Cancel').click();
    cy.contains('button', 'Edit Profile').should('be.visible');
  });

  it('saves profile changes successfully', () => {
    cy.intercept('PUT', '**/api/auth/profile', {
      statusCode: 200,
      body: { message: 'Profile updated' },
    }).as('updateProfile');

    cy.contains('button', 'Edit Profile').click();
    cy.contains('button', 'Save Changes').click();
    cy.wait('@updateProfile');
    cy.contains('button', 'Edit Profile').should('be.visible');
  });

  it('renders the sidebar navbar', () => {
    cy.get('.sidebar').should('be.visible');
  });

  it('shows Profile Settings as the active link in the sidebar', () => {
    cy.get('.sidebar-nav .nav-item.active').should('exist');
  });

});
