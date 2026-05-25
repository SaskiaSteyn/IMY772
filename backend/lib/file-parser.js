import {parse} from 'csv-parse/sync';

export async function parseCSVFile(fileContent) {
    try {
        const csvContent = fileContent.toString();
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });

        if (!records || records.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Detect CSV type from column headers
        const headers = Object.keys(records[0]);
        const isSamples = headers.includes('sample_id') && (headers.includes('collection_date') || headers.includes('location_name'));
        const isIsolates = headers.includes('isolate_id') && headers.includes('organism');
        const isPhenotypes = headers.includes('phenotype_id') && headers.includes('antibiotic');
        const isAmrFindings = headers.includes('finding_id') && headers.includes('gene_symbol');

        if (isSamples) {
            return transformCsvSamples(records);
        } else if (isIsolates) {
            return transformCsvIsolates(records);
        } else if (isPhenotypes) {
            return transformCsvPhenotypes(records);
        } else if (isAmrFindings) {
            return transformCsvAmrFindings(records);
        } else {
            throw new Error('CSV columns do not match expected format (samples, isolates, phenotypes, or amr_findings)');
        }
    } catch (error) {
        throw new Error(`CSV parsing error: ${error.message}`);
    }
}

function transformCsvSamples(records) {
    const sampleMap = new Map();
    for (const record of records) {
        const sample_id = record.sample_id;
        if (!sample_id) throw new Error('CSV must contain sample_id column');

        if (!sampleMap.has(sample_id)) {
            sampleMap.set(sample_id, {
                sample_id,
                collection_date: record.collection_date || null,
                location_name: record.location_name || null,
                latitude: parseFloat(record.latitude),
                longitude: parseFloat(record.longitude),
                isolation_source: record.isolation_source || null,
                water_temperature: record.water_temperature ? parseFloat(record.water_temperature) : null,
                ph: record.ph ? parseFloat(record.ph) : null,
                tds: record.tds ? parseFloat(record.tds) : null,
                do: record.do ? parseFloat(record.do) : null,
                isolates: [],
                phenotypes: [],
                amr_findings: [],
            });
        }
    }
    return Array.from(sampleMap.values());
}

function transformCsvIsolates(records) {
    return records.map(record => ({
        sample_id: record.sample_id,
        collection_date: null,
        location_name: null,
        latitude: null,
        longitude: null,
        isolation_source: null,
        water_temperature: null,
        ph: null,
        tds: null,
        do: null,
        isolates: [{
            isolate_id: record.isolate_id,
            sample_id: record.sample_id,
            organism: record.organism || null,
            mlst_type: record.mlst_type || null,
        }],
        phenotypes: [],
        amr_findings: [],
    }));
}

function transformCsvPhenotypes(records) {
    return records.map(record => ({
        sample_id: record.sample_id,
        collection_date: null,
        location_name: null,
        latitude: null,
        longitude: null,
        isolation_source: null,
        water_temperature: null,
        ph: null,
        tds: null,
        do: null,
        isolates: [],
        phenotypes: [{
            phenotype_id: record.phenotype_id,
            sample_id: record.sample_id,
            organism: record.organism || null,
            antibiotic: record.antibiotic || null,
            resistant: record.resistant === 'true' || record.resistant === true,
        }],
        amr_findings: [],
    }));
}

function transformCsvAmrFindings(records) {
    return records.map(record => ({
        sample_id: record.sample_id,
        collection_date: null,
        location_name: null,
        latitude: null,
        longitude: null,
        isolation_source: null,
        water_temperature: null,
        ph: null,
        tds: null,
        do: null,
        isolates: [],
        phenotypes: [],
        amr_findings: [{
            finding_id: record.finding_id,
            sample_id: record.sample_id,
            analysis_type: record.analysis_type || null,
            gene_symbol: record.gene_symbol || null,
            drug_class: record.drug_class || null,
            method: record.method || null,
            percent_identity: record.percent_identity ? parseFloat(record.percent_identity) : null,
        }],
    }));
}

export async function parseJSONFile(fileContent) {
    try {
        const jsonContent = fileContent.toString();
        const data = JSON.parse(jsonContent);

        // Check if it's a nested structure (all_tables_combined.json format)
        if (data.samples && (data.isolates || data.predicted_phenotypes || data.amr_findings)) {
            return transformNestedJson(data);
        }

        // Check if it's an array of a single type
        if (Array.isArray(data)) {
            return transformFlatArray(data);
        }

        throw new Error('JSON must be either an array or contain samples, isolates, predicted_phenotypes, and amr_findings properties');
    } catch (error) {
        throw new Error(`JSON parsing error: ${error.message}`);
    }
}

function transformNestedJson(data) {
    const {samples = [], isolates = [], predicted_phenotypes = [], amr_findings = []} = data;

    // Build lookup maps for quick access by sample_id
    const isolateMap = {};
    const phenotypeMap = {};
    const amrMap = {};

    isolates.forEach(iso => {
        if (!isolateMap[iso.sample_id]) isolateMap[iso.sample_id] = [];
        isolateMap[iso.sample_id].push({
            isolate_id: iso.isolate_id,
            sample_id: iso.sample_id,
            organism: iso.organism || null,
            mlst_type: iso.mlst_type || null,
        });
    });

    predicted_phenotypes.forEach(phen => {
        if (!phenotypeMap[phen.sample_id]) phenotypeMap[phen.sample_id] = [];
        phenotypeMap[phen.sample_id].push({
            phenotype_id: phen.phenotype_id,
            sample_id: phen.sample_id,
            organism: phen.organism || null,
            antibiotic: phen.antibiotic || null,
            resistant: phen.resistant === true || phen.resistant === 'true',
        });
    });

    amr_findings.forEach(amr => {
        if (!amrMap[amr.sample_id]) amrMap[amr.sample_id] = [];
        amrMap[amr.sample_id].push({
            finding_id: amr.finding_id,
            sample_id: amr.sample_id,
            analysis_type: amr.analysis_type || null,
            gene_symbol: amr.gene_symbol || null,
            drug_class: amr.drug_class || null,
            method: amr.method || null,
            percent_identity: amr.percent_identity ? parseFloat(amr.percent_identity) : null,
        });
    });

    // Transform samples with related data
    return samples.map(sample => ({
        sample_id: sample.sample_id,
        collection_date: sample.collection_date || null,
        location_name: sample.location_name || null,
        latitude: parseFloat(sample.latitude),
        longitude: parseFloat(sample.longitude),
        isolation_source: sample.isolation_source || null,
        water_temperature: sample.water_temperature ? parseFloat(sample.water_temperature) : null,
        ph: sample.ph ? parseFloat(sample.ph) : null,
        tds: sample.tds ? parseFloat(sample.tds) : null,
        do: sample.do ? parseFloat(sample.do) : null,
        isolates: isolateMap[sample.sample_id] || [],
        phenotypes: phenotypeMap[sample.sample_id] || [],
        amr_findings: amrMap[sample.sample_id] || [],
    }));
}

function transformFlatArray(records) {
    if (!records || records.length === 0) {
        throw new Error('Array is empty');
    }

    const first = records[0];

    // Detect array type
    if (first.sample_id && (first.collection_date || first.location_name || first.latitude)) {
        // It's a samples array
        return records.map(sample => ({
            sample_id: sample.sample_id,
            collection_date: sample.collection_date || null,
            location_name: sample.location_name || null,
            latitude: parseFloat(sample.latitude),
            longitude: parseFloat(sample.longitude),
            isolation_source: sample.isolation_source || null,
            water_temperature: sample.water_temperature ? parseFloat(sample.water_temperature) : null,
            ph: sample.ph ? parseFloat(sample.ph) : null,
            tds: sample.tds ? parseFloat(sample.tds) : null,
            do: sample.do ? parseFloat(sample.do) : null,
            isolates: [],
            phenotypes: [],
            amr_findings: [],
        }));
    } else if (first.isolate_id && first.organism && first.sample_id) {
        // It's an isolates array
        return records.map(isolate => ({
            sample_id: isolate.sample_id,
            collection_date: null,
            location_name: null,
            latitude: null,
            longitude: null,
            isolation_source: null,
            water_temperature: null,
            ph: null,
            tds: null,
            do: null,
            isolates: [{
                isolate_id: isolate.isolate_id,
                sample_id: isolate.sample_id,
                organism: isolate.organism || null,
                mlst_type: isolate.mlst_type || null,
            }],
            phenotypes: [],
            amr_findings: [],
        }));
    } else if (first.phenotype_id && first.antibiotic && first.sample_id) {
        // It's a phenotypes array
        return records.map(phenotype => ({
            sample_id: phenotype.sample_id,
            collection_date: null,
            location_name: null,
            latitude: null,
            longitude: null,
            isolation_source: null,
            water_temperature: null,
            ph: null,
            tds: null,
            do: null,
            isolates: [],
            phenotypes: [{
                phenotype_id: phenotype.phenotype_id,
                sample_id: phenotype.sample_id,
                organism: phenotype.organism || null,
                antibiotic: phenotype.antibiotic || null,
                resistant: phenotype.resistant === true || phenotype.resistant === 'true',
            }],
            amr_findings: [],
        }));
    } else if (first.finding_id && first.gene_symbol && first.sample_id) {
        // It's an amr_findings array
        return records.map(finding => ({
            sample_id: finding.sample_id,
            collection_date: null,
            location_name: null,
            latitude: null,
            longitude: null,
            isolation_source: null,
            water_temperature: null,
            ph: null,
            tds: null,
            do: null,
            isolates: [],
            phenotypes: [],
            amr_findings: [{
                finding_id: finding.finding_id,
                sample_id: finding.sample_id,
                analysis_type: finding.analysis_type || null,
                gene_symbol: finding.gene_symbol || null,
                drug_class: finding.drug_class || null,
                method: finding.method || null,
                percent_identity: finding.percent_identity ? parseFloat(finding.percent_identity) : null,
            }],
        }));
    }

    throw new Error('Array type not recognized');
}

export function validateSamples(samples) {
    const errors = [];

    if (!Array.isArray(samples)) {
        return {isValid: false, errors: ['Data must be an array of samples']};
    }

    if (samples.length === 0) {
        return {isValid: false, errors: ['No samples to process']};
    }

    samples.forEach((sample, index) => {
        if (!sample.sample_id) errors.push(`Sample ${index}: missing sample_id`);
        if (sample.latitude === null || sample.latitude === undefined) errors.push(`Sample ${index}: missing latitude`);
        if (sample.longitude === null || sample.longitude === undefined) errors.push(`Sample ${index}: missing longitude`);
        if (sample.latitude && isNaN(parseFloat(sample.latitude))) errors.push(`Sample ${index}: latitude must be numeric`);
        if (sample.longitude && isNaN(parseFloat(sample.longitude))) errors.push(`Sample ${index}: longitude must be numeric`);
        if (sample.water_temperature && isNaN(parseFloat(sample.water_temperature))) errors.push(`Sample ${index}: water_temperature must be numeric`);
        if (sample.ph && isNaN(parseFloat(sample.ph))) errors.push(`Sample ${index}: ph must be numeric`);
        if (sample.tds && isNaN(parseFloat(sample.tds))) errors.push(`Sample ${index}: tds must be numeric`);
        if (sample.do && isNaN(parseFloat(sample.do))) errors.push(`Sample ${index}: do must be numeric`);
    });

    return {isValid: errors.length === 0, errors};
}