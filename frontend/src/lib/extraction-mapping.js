// Pure mapping from an OCR extraction result (as returned by the
// /api/samples/extract-image endpoint) into updates for the Add-Data form's
// `formData`, the analysis-type label, and a human summary. Kept pure (no React)
// so it can be unit-tested without a DOM.

export const LOW_CONFIDENCE_THRESHOLD = 70;

export const EXTRACTED_FIELD_LABELS = {
    water_temperature: 'Water Temperature',
    ph: 'pH Level',
    tds: 'Total Dissolved Solids (TDS)',
    do: 'Dissolved Oxygen (DO)',
    sample_analysis_type: 'Sample Analysis Type',
    isolation_source: 'Isolation Source',
    collection_date: 'Collection Date',
    location_name: 'Location Name',
    latitude: 'Latitude',
    longitude: 'Longitude',
    collected_by: 'Collected By',
};

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * @param {object} result - { fields, confidence, metagenomic, wgs, amrGenes, virulenceGenes }
 * @returns {{ updates: object, analysisType: string|null, info: {filled: string[], lowConfidence: string[], extras: string[]} }}
 */
export function mapExtractionToFormData(result) {
    const {
        fields = {},
        confidence = {},
        metagenomic = [],
        wgs = [],
        amrGenes = [],
        virulenceGenes = [],
    } = result || {};

    const updates = {};
    const filled = [];
    const lowConfidence = [];
    const extras = [];
    let analysisType = null;

    // Flat Sample fields
    Object.entries(fields).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;

        let applied = true;
        if (key === 'sample_analysis_type') {
            analysisType =
                value === 'WGS' ? 'Whole Genome Sequence (WGS)' : 'Metagenomic';
            updates.sample_analysis_type = analysisType;
        } else if (key === 'collection_date') {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) applied = false;
            else updates.collection_date = date;
        } else {
            updates[key] = value;
        }

        if (!applied) return;
        filled.push(EXTRACTED_FIELD_LABELS[key] || key);
        if ((confidence?.[key] ?? 100) < LOW_CONFIDENCE_THRESHOLD) {
            lowConfidence.push(EXTRACTED_FIELD_LABELS[key] || key);
        }
    });

    // Analysis-detail records and gene lists
    if (metagenomic.length > 0) {
        updates.metagenomicRecords = metagenomic.map((r) => ({
            sequence_name: r.sequence_name || '',
            element_type: r.element_type || '',
            class: r.class || '',
            subclass: r.subclass || '',
        }));
        extras.push(plural(metagenomic.length, 'Metagenomic record'));
    }
    if (wgs.length > 0) {
        updates.wgsRecords = wgs.map((r) => ({
            isolateID: r.isolateID != null ? String(r.isolateID) : '',
            organism: r.organism || '',
        }));
        extras.push(plural(wgs.length, 'WGS record'));
    }
    if (amrGenes.length > 0) {
        updates.amrGenes = amrGenes;
        extras.push(plural(amrGenes.length, 'AMR gene'));
    }
    if (virulenceGenes.length > 0) {
        updates.virulenceGenes = virulenceGenes;
        extras.push(plural(virulenceGenes.length, 'virulence gene'));
    }

    // If the analysis type wasn't read directly, infer it from which detail
    // tables were found so the right stepper branch is shown.
    if (!analysisType) {
        if (metagenomic.length > 0) analysisType = 'Metagenomic';
        else if (wgs.length > 0) analysisType = 'Whole Genome Sequence (WGS)';
        if (analysisType) updates.sample_analysis_type = analysisType;
    }

    return { updates, analysisType, info: { filled, lowConfidence, extras } };
}
