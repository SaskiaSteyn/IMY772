describe('Profile page (mocked)', () => {

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

    cy.intercept('GET', '**/api/auth/profile', {
      statusCode: 200,
      body: {
        profile: {
          name: 'Test',
          surname: 'User',
          email: 'test@mail.com',
          bio: 'Water quality researcher.',
          interests: ['Water Quality', 'Microbiology'],
          education: [],
          experience: []
        }
      }
    }).as('profileRequest');

    cy.intercept('GET', '**/api/samples/uploaded_by/**', {
      statusCode: 200,
      body: []
    }).as('userSamplesRequest');

    cy.intercept('GET', '**/api/isolates', {
      statusCode: 200,
      body: { isolates: [] }
    }).as('isolatesRequest');

    cy.intercept('GET', '**/api/amr-findings', {
      statusCode: 200,
      body: { amrFindings: [] }
    }).as('amrRequest');

    cy.intercept('GET', '**/api/predicted-phenotypes', {
      statusCode: 200,
      body: { phenotypes: [] }
    }).as('phenotypesRequest');

    cy.visit('/profile');
    cy.wait('@meRequest');
    cy.wait('@profileRequest');
    cy.get('.profile-page').should('be.visible');
  });

  it('displays the user profile and allows editing', () => {
    cy.contains('Test User').should('be.visible');
    cy.contains('test@mail.com').should('be.visible');

    cy.contains('button', 'Edit Profile').should('be.visible').click();

    cy.intercept('PUT', '**/api/auth/profile', {
      statusCode: 200,
      body: { message: 'Profile updated' }
    }).as('updateProfileRequest');

    cy.contains('button', 'Save Changes').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible').click();

    cy.contains('button', 'Edit Profile').should('be.visible');
  });

});
