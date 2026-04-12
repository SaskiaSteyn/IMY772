import { parse } from 'csv-parse/sync';

/**
 * Parse CSV file content and convert to nested JSON structure
 * @param {Buffer|string} fileContent - The file content
 * @returns {Array} Array of sample objects with nested metagenomic data
 */
export async function parseCSVFile(fileContent) {
    try {
        const csvContent = fileContent.toString();
        const records = parse(csvContent, {
            columns: true, // Use headers as column names
            skip_empty_lines: true,
            trim: true,
        });

        // Convert flat CSV records to nested structure
        // Assumes CSV has columns like: sampleID, latitude, longitude, water_temperature, ...
        // And columns for metagenomic data with prefix "metagenomic_" or similar
        const sampleMap = new Map();

        for (const record of records) {
            const sampleID = record.sampleID;

            if (!sampleID) {
                throw new Error('CSV must contain sampleID column');
            }

            // Initialize sample if not seen before
            if (!sampleMap.has(sampleID)) {
                const sample = {
                    latitude: parseFloat(record.latitude),
                    longitude: parseFloat(record.longitude),
                    water_temperature: record.water_temperature ? parseFloat(record.water_temperature) : null,
                    ph: record.ph ? parseFloat(record.ph) : null,
                    tds: record.tds ? parseFloat(record.tds) : null,
                    do: record.do ? parseFloat(record.do) : null,
                    sample_analysis_type: record.sample_analysis_type || null,
                    isolation_source: record.isolation_source || null,
                    collection_date: record.collection_date || null,
                    location_name: record.location_name || null,
                    collected_by: record.collected_by || null,
                    predicted_sir_profile: record.predicted_sir_profile || null,
                    metagenomic: [],
                };

                sampleMap.set(sampleID, sample);
            }

            // Extract metagenomic data if present
            if (record.sequence_name) {
                const metagenomicRecord = {
                    sequence_name: record.sequence_name,
                    element_type: record.element_type || null,
                    class: record.class || null,
                    subclass: record.subclass || null,
                };

                // Parse AMR genes if they're in a comma-separated format
                if (record.amr_resistance_genes) {
                    metagenomicRecord.amr_resistance_genes = record.amr_resistance_genes
                        .split(',')
                        .map((gene) => gene.trim())
                        .filter((gene) => gene.length > 0);
                }

                sampleMap.get(sampleID).metagenomic.push(metagenomicRecord);
            }
        }

        return Array.from(sampleMap.values());
    } catch (error) {
        throw new Error(`CSV parsing error: ${error.message}`);
    }
}

/**
 * Parse JSON file content
 * @param {Buffer|string} fileContent - The file content
 * @returns {Array} Array of sample objects with nested metagenomic data
 */
export async function parseJSONFile(fileContent) {
    try {
        const jsonContent = fileContent.toString();
        const data = JSON.parse(jsonContent);

        // Handle both { samples: [...] } and direct array formats
        let samples = Array.isArray(data) ? data : data.samples;

        if (!Array.isArray(samples)) {
            throw new Error('JSON must contain an array of samples or { samples: [...] } structure');
        }

        // Validate and normalize each sample
        return samples.map((sample, index) => {
            if (!sample.latitude || !sample.longitude) {
                throw new Error(`Sample at index ${index} missing required latitude/longitude`);
            }

            return {
                latitude: parseFloat(sample.latitude),
                longitude: parseFloat(sample.longitude),
                water_temperature: sample.water_temperature
                    ? parseFloat(sample.water_temperature)
                    : null,
                ph: sample.ph ? parseFloat(sample.ph) : null,
                tds: sample.tds ? parseFloat(sample.tds) : null,
                do: sample.do ? parseFloat(sample.do) : null,
                sample_analysis_type: sample.sample_analysis_type || null,
                isolation_source: sample.isolation_source || null,
                collection_date: sample.collection_date || null,
                location_name: sample.location_name || null,
                collected_by: sample.collected_by || null,
                predicted_sir_profile: sample.predicted_sir_profile || null,
                metagenomic: Array.isArray(sample.metagenomic)
                    ? sample.metagenomic.map((meta) => ({
                          sequence_name: meta.sequence_name,
                          element_type: meta.element_type || null,
                          class: meta.class || null,
                          subclass: meta.subclass || null,
                          amr_resistance_genes: Array.isArray(meta.amr_resistance_genes)
                              ? meta.amr_resistance_genes
                              : [],
                      }))
                    : [],
            };
        });
    } catch (error) {
        throw new Error(`JSON parsing error: ${error.message}`);
    }
}

/**
 * Validate sample data structure
 * @param {Array} samples - Array of samples to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateSamples(samples) {
    const errors = [];

    if (!Array.isArray(samples)) {
        return {
            isValid: false,
            errors: ['Data must be an array of samples'],
        };
    }

    samples.forEach((sample, index) => {
        // Check required fields
        if (!sample.latitude) {
            errors.push(`Sample ${index}: missing latitude`);
        }
        if (!sample.longitude) {
            errors.push(`Sample ${index}: missing longitude`);
        }

        // Validate numeric fields
        if (sample.latitude && isNaN(parseFloat(sample.latitude))) {
            errors.push(`Sample ${index}: latitude must be numeric`);
        }
        if (sample.longitude && isNaN(parseFloat(sample.longitude))) {
            errors.push(`Sample ${index}: longitude must be numeric`);
        }
        if (
            sample.water_temperature &&
            isNaN(parseFloat(sample.water_temperature))
        ) {
            errors.push(`Sample ${index}: water_temperature must be numeric`);
        }
        if (sample.ph && isNaN(parseFloat(sample.ph))) {
            errors.push(`Sample ${index}: ph must be numeric`);
        }
        if (sample.tds && isNaN(parseFloat(sample.tds))) {
            errors.push(`Sample ${index}: tds must be numeric`);
        }
        if (sample.do && isNaN(parseFloat(sample.do))) {
            errors.push(`Sample ${index}: do must be numeric`);
        }

        // Validate SIR profile if present
        if (
            sample.predicted_sir_profile &&
            !['Susceptible', 'Intermediate', 'Resistant'].includes(
                sample.predicted_sir_profile
            )
        ) {
            errors.push(
                `Sample ${index}: predicted_sir_profile must be "Susceptible", "Intermediate", or "Resistant"`
            );
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
}
