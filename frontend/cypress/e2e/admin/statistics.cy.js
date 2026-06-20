const ADMIN_USER = {
  id: 2,
  userID: 2,
  name: 'Admin',
  surname: 'User',
  email: 'admin@mail.com',
  role: 'admin',
};

const MOCK_METRICS = {
  usersCount: 42,
  samplesCount: 158,
  metagenomicCount: 25,
  wgsCount: 10,
  amrCount: 89,
  virulenceCount: 33,
};

const MOCK_DELETION = {
  id: 1,
  entityType: 'sample',
  actorEmail: 'admin@mail.com',
  actorUserID: 2,
  reason: 'Duplicate entry',
  created_at: '2024-03-01T10:30:00Z',
};

describe('Admin Statistics page (mocked)', () => {

  function stubAdmin() {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: ADMIN_USER },
    }).as('meRequest');
  }

  describe('with summary data and recent deletions', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/summary', {
        statusCode: 200,
        body: { metrics: MOCK_METRICS, recentDeletions: [MOCK_DELETION] },
      }).as('summaryRequest');
      cy.visit('/admin/statistics');
      cy.wait('@meRequest');
      cy.wait('@summaryRequest');
      cy.contains('Statistics').should('be.visible');
    });

    it('renders all metric cards with correct values', () => {
      cy.contains('42').should('be.visible');
      cy.contains('158').should('be.visible');
      cy.contains('Users').should('be.visible');
      cy.contains('Samples').should('be.visible');
      cy.contains('AMR Genes').should('be.visible');
      cy.contains('89').should('be.visible');
    });

    it('renders the Recent deletions table with a deletion row', () => {
      cy.contains('Recent deletions').should('be.visible');
      cy.contains('sample').should('be.visible');
      cy.contains('admin@mail.com').should('be.visible');
      cy.contains('Duplicate entry').should('be.visible');
    });

    it('renders the admin sidebar navigation tabs', () => {
      cy.contains('Water Data').should('be.visible');
      cy.contains('Users').should('be.visible');
      cy.contains('Statistics').should('be.visible');
    });

    it('navigates to Users tab when clicked', () => {
      cy.intercept('GET', '**/api/admin/users', {
        statusCode: 200,
        body: { users: [] },
      }).as('usersRequest');
      cy.contains('a', 'Users').click();
      cy.url().should('include', '/admin/users');
    });
  });

  describe('with no recent deletions', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/summary', {
        statusCode: 200,
        body: { metrics: MOCK_METRICS, recentDeletions: [] },
      }).as('summaryRequest');
      cy.visit('/admin/statistics');
      cy.wait('@meRequest');
      cy.wait('@summaryRequest');
    });

    it('shows the no delete activity message', () => {
      cy.contains('No delete activity recorded yet').should('be.visible');
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      cy.clearCookies();
      cy.clearLocalStorage();
      stubAdmin();
      cy.intercept('GET', '**/api/admin/summary', {
        statusCode: 500,
        body: { message: 'Internal server error' },
      }).as('summaryError');
      cy.visit('/admin/statistics');
      cy.wait('@meRequest');
      cy.wait('@summaryError');
    });

    it('shows an error alert when summary fails to load', () => {
      cy.get('[role="alert"]').should('be.visible');
    });
  });

  describe('route guard', () => {
    it('redirects a non-admin user from /admin/statistics to /dashboard', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.intercept('GET', '**/api/auth/me', {
        statusCode: 200,
        body: { user: { id: 1, userID: 1, name: 'Test', surname: 'User', email: 'test@mail.com', role: 'logged_in_user' } },
      }).as('meUser');
      cy.intercept('GET', '**/api/samples', { statusCode: 200, body: [] }).as('samples');
      cy.visit('/admin/statistics');
      cy.wait('@meUser');
      cy.url().should('include', '/dashboard');
    });
  });

});
