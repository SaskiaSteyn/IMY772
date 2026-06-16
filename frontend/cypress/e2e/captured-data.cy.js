const MOCK_USER = {
  id: 1,
  userID: 1,
  name: 'Test',
  surname: 'User',
  email: 'test@mail.com',
  role: 'logged_in_user',
};

const MOCK_SAMPLE = {
  sample_id: 1,
  location_name: 'Hennops River',
  collection_date: '2024-01-15',
  uploaded_by: 1,
};

const MOCK_ISOLATE = {
  isolate_id: 10,
  sample_id: 1,
  organism: 'E. coli',
  mlst_type: 'ST131',
};

const MOCK_PHENOTYPE = {
  phenotype_id: 20,
  sample_id: 1,
  organism: 'E. coli',
  antibiotic: 'Ampicillin',
  resistant: true,
};

const MOCK_AMR = {
  finding_id: 30,
  sample_id: 1,
  gene_symbol: 'blaTEM',
  amr_class: 'Beta-lactam',
};

const MOCK_VIRULENCE = {
  virulence_gene_id: 40,
  sample_id: 1,
  gene_symbol: 'stx1',
  element_type: 'toxin',
};

describe('Captured Data page (mocked)', () => {

  // Suppress uncaught exceptions so a React render error doesn't abort the
  // whole suite before we have a chance to diagnose via assertions.
  Cypress.on('uncaught:exception', () => false);

  function stubAllData() {
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { user: MOCK_USER },
    }).as('meRequest');

    // API client expects { samples: [...] }
    cy.intercept('GET', '**/api/samples', {
      statusCode: 200,
      body: { samples: [MOCK_SAMPLE] },
    }).as('samplesRequest');

    // API client expects { isolates: [...] }
    cy.intercept('GET', '**/api/isolates', {
      statusCode: 200,
      body: { isolates: [MOCK_ISOLATE] },
    }).as('isolatesRequest');

    // API client expects { phenotypes: [...] }
    cy.intercept('GET', '**/api/predicted-phenotypes', {
      statusCode: 200,
      body: { phenotypes: [MOCK_PHENOTYPE] },
    }).as('phenotypesRequest');

    // API client expects { amrFindings: [...] }
    cy.intercept('GET', '**/api/amr-findings', {
      statusCode: 200,
      body: { amrFindings: [MOCK_AMR] },
    }).as('amrRequest');

    // API client expects { virulenceGenes: [...] }
    cy.intercept('GET', '**/api/virulence-genes', {
      statusCode: 200,
      body: { virulenceGenes: [MOCK_VIRULENCE] },
    }).as('virulenceRequest');
  }

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    stubAllData();
    cy.visit('/capture-data', { timeout: 120000 });
    // Single synchronisation point: the Samples tab label only renders after
    // auth resolves, all 5 data APIs return, and loading clears to false.
    // 90 s covers Vite cold-start compilation of the large import graph
    // (xlsx/SheetJS + 15+ modal components) on the first run of the suite.
    cy.contains('Samples', { timeout: 90000 }).should('be.visible');
  });

  it('renders all data tabs', () => {
    cy.contains('Samples').should('be.visible');
    cy.contains('Isolates').should('be.visible');
    cy.contains('Predicted phenotypes').should('be.visible');
    cy.contains('AMR findings').should('be.visible');
    cy.contains('Virulence genes').should('be.visible');
  });

  it('opens the Add new entry modal', () => {
    cy.contains('button', 'Add new entry').should('be.visible').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('closes the Add new entry modal with the X button', () => {
    cy.contains('button', 'Add new entry').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('.mantine-Modal-close').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('opens the Bulk upload modal', () => {
    cy.contains('button', 'Upload bulk data').should('be.visible').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('switches to the Isolates tab and shows isolate data', () => {
    cy.contains('[role="tab"]', 'Isolates').click();
    // DataTable cells live inside an overflow:hidden scroll container;
    // assert existence rather than visibility to avoid clipping false-negatives.
    cy.contains('E. coli').should('exist');
  });

  it('switches to the Predicted phenotypes tab and shows phenotype data', () => {
    cy.contains('[role="tab"]', 'Predicted phenotypes').click();
    cy.contains('Ampicillin').should('exist');
  });

  it('switches to the AMR findings tab and shows AMR data', () => {
    cy.contains('[role="tab"]', 'AMR findings').click();
    cy.contains('blaTEM').should('exist');
  });

  it('switches to the Virulence genes tab and shows virulence data', () => {
    cy.contains('[role="tab"]', 'Virulence genes').click();
    cy.contains('stx1').should('exist');
  });

  it('shows the sample location name in the Samples tab', () => {
    // The DataTable wraps rows in an overflow:hidden scroll container, so the
    // <td> may be clipped from Cypress's "visible" check. Asserting existence
    // is sufficient — it confirms the data reached the DOM.
    cy.contains('Hennops River').should('exist');
  });

  it('renders the sidebar navbar', () => {
    cy.get('.sidebar').should('be.visible');
  });

  it('shows the Data link as active in the sidebar', () => {
    cy.get('.sidebar-nav .nav-item.active').should('exist');
  });

  it('unauthenticated user is redirected to /login when visiting /capture-data', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('meGuest');
    cy.visit('/capture-data');
    cy.wait('@meGuest');
    cy.url().should('include', '/login');
  });

});
