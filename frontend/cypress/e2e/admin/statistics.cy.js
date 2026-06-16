describe('Admin Statistics page (mocked)', () => {

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

    cy.intercept('GET', '**/api/admin/summary', {
      statusCode: 200,
      body: {
        metrics: {
          usersCount: 42,
          samplesCount: 158,
          isolatesCount: 312,
          amrFindingsCount: 89,
          phenotypesCount: 201,
          waterSamplesCount: 17
        },
        recentDeletions: []
      }
    }).as('summaryRequest');

    cy.visit('/admin/statistics');
    cy.wait('@meRequest');
    cy.wait('@summaryRequest');
    cy.contains('Statistics').should('be.visible');
  });

  it('renders metric cards with the mocked summary data', () => {
    cy.contains('42').should('be.visible');
    cy.contains('158').should('be.visible');
    cy.contains('Users').should('be.visible');
    cy.contains('Samples').should('be.visible');
  });

});
