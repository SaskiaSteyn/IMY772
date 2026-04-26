# Users table
CREATE TABLE users (
    userID SERIAL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'logged_in_user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Samples (measurements) table
CREATE TABLE measurements (
    sampleID SERIAL,
    water_temperature DECIMAL(5, 2),
    ph DECIMAL(4, 2),
    tds DECIMAL(8, 2),
    do DECIMAL(8, 2),
    sample_analysis_type VARCHAR(255),
    isolation_source VARCHAR(255),
    collection_date DATE,
    location_name VARCHAR(255),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    collected_by VARCHAR(255),
    predicted_sir_profile VARCHAR(255)
);

# Metagenomic table
CREATE TABLE metagenomic (
    sampleID INTEGER,
    sequence_name VARCHAR(255),
    element_type VARCHAR(255),
    class VARCHAR(255),
    subclass VARCHAR(255)
);

# WGS table
CREATE TABLE wgs (
    sampleID INTEGER,
    isolateID INTEGER,
    organism VARCHAR(255)
);

# AMR resistance genes table
CREATE TABLE amrResistanceGenes (
    sampleID INTEGER,
    geneSymbol VARCHAR(255)
);

# Virulence genes table
CREATE TABLE virulenceGenes (
    isolateID INTEGER,
    geneSymbol VARCHAR(255)
);
