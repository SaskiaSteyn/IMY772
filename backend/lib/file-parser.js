import {parse} from 'csv-parse/sync';

export async function parseCSVFile(fileContent) {
    try {
        const csvContent = fileContent.toString();
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        const sampleMap = new Map();
        for (const record of records) {
            const sampleID = record.sampleID;
            if (!sampleID) throw new Error('CSV must contain sampleID column');
            if (!sampleMap.has(sampleID)) {
                let sirProfile = record.predicted_sir_profile;
                if (sirProfile) {
                    const lower = sirProfile.toLowerCase();
                    if (lower === 'susceptible') sirProfile = 'Susceptible';
                    else if (lower === 'intermediate') sirProfile = 'Intermediate';
                    else if (lower === 'resistant') sirProfile = 'Resistant';
                    else sirProfile = null;
                }
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
                    predicted_sir_profile: sirProfile,
                    metagenomic: [],
                };
                sampleMap.set(sampleID, sample);
            }
            if (record.sequence_name) {
                const metagenomicRecord = {
                    sequence_name: record.sequence_name,
                    element_type: record.element_type || null,
                    class: record.class || null,
                    subclass: record.subclass || null,
                };
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

export async function parseJSONFile(fileContent) {
    try {
        const jsonContent = fileContent.toString();
        const data = JSON.parse(jsonContent);
        let samples = Array.isArray(data) ? data : data.samples;
        if (!Array.isArray(samples)) {
            throw new Error('JSON must contain an array of samples or { samples: [...] } structure');
        }
        return samples.map((sample, index) => {
            if (!sample.latitude || !sample.longitude) {
                throw new Error(`Sample at index ${index} missing required latitude/longitude`);
            }
            // Normalize SIR profile to allowed values
            let sirProfile = sample.predicted_sir_profile;
            if (sirProfile) {
                const lower = sirProfile.toLowerCase();
                if (lower === 'susceptible') sirProfile = 'Susceptible';
                else if (lower === 'intermediate') sirProfile = 'Intermediate';
                else if (lower === 'resistant') sirProfile = 'Resistant';
                else sirProfile = null;
            }
            return {
                latitude: parseFloat(sample.latitude),
                longitude: parseFloat(sample.longitude),
                water_temperature: sample.water_temperature ? parseFloat(sample.water_temperature) : null,
                ph: sample.ph ? parseFloat(sample.ph) : null,
                tds: sample.tds ? parseFloat(sample.tds) : null,
                do: sample.do ? parseFloat(sample.do) : null,
                sample_analysis_type: sample.sample_analysis_type || null,
                isolation_source: sample.isolation_source || null,
                collection_date: sample.collection_date || null,
                location_name: sample.location_name || null,
                collected_by: sample.collected_by || null,
                predicted_sir_profile: sirProfile,
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
                wgs: sample.wgs, // preserve for later processing
            };
        });
    } catch (error) {
        throw new Error(`JSON parsing error: ${error.message}`);
    }
}

export function validateSamples(samples) {
    const errors = [];
    if (!Array.isArray(samples)) {
        return {isValid: false, errors: ['Data must be an array of samples']};
    }
    samples.forEach((sample, index) => {
        if (!sample.latitude) errors.push(`Sample ${index}: missing latitude`);
        if (!sample.longitude) errors.push(`Sample ${index}: missing longitude`);
        if (sample.latitude && isNaN(parseFloat(sample.latitude))) errors.push(`Sample ${index}: latitude must be numeric`);
        if (sample.longitude && isNaN(parseFloat(sample.longitude))) errors.push(`Sample ${index}: longitude must be numeric`);
        if (sample.water_temperature && isNaN(parseFloat(sample.water_temperature))) errors.push(`Sample ${index}: water_temperature must be numeric`);
        if (sample.ph && isNaN(parseFloat(sample.ph))) errors.push(`Sample ${index}: ph must be numeric`);
        if (sample.tds && isNaN(parseFloat(sample.tds))) errors.push(`Sample ${index}: tds must be numeric`);
        if (sample.do && isNaN(parseFloat(sample.do))) errors.push(`Sample ${index}: do must be numeric`);
        if (sample.predicted_sir_profile && !['Susceptible', 'Intermediate', 'Resistant'].includes(sample.predicted_sir_profile)) {
            errors.push(`Sample ${index}: predicted_sir_profile must be "Susceptible", "Intermediate", or "Resistant" (case-insensitive)`);
        }
    });
    return {isValid: errors.length === 0, errors};
}