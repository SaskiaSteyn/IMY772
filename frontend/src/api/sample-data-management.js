const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
    console.log(`Request to ${path}:`, options.body ? JSON.parse(options.body) : 'No body');
    const res = await fetch(`${API_URL}${path}`, {
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

export const createFullSample = async (data) => {
    try {
        // 1. Extract sample fields (everything except metagenomic or wgs)
        const {metagenomic, wgs, ...sampleFields} = data;

        // 2. Create the sample
        const sampleResponse = await request('/api/samples', {
            method: 'POST',
            body: JSON.stringify(sampleFields),
        });
        const createdSample = sampleResponse.sample;
        const sampleID = createdSample.sampleID;

        // 3. Handle metagenomic data if present
        if (metagenomic && Array.isArray(metagenomic)) {
            // Collect unique AMR genes from all metagenomic records
            const allAmrGenes = new Set();
            for (const metaRecord of metagenomic) {
                if (metaRecord.amr_resistance_genes && Array.isArray(metaRecord.amr_resistance_genes)) {
                    metaRecord.amr_resistance_genes.forEach(gene => {
                        if (gene && gene.trim() !== '') allAmrGenes.add(gene.trim());
                    });
                }
            }
            // Create AMR resistance genes once per sample
            for (const geneSymbol of allAmrGenes) {
                await request('/api/amr-resistance-genes', {
                    method: 'POST',
                    body: JSON.stringify({sampleID, geneSymbol}),
                });
            }

            // Create each metagenomic record
            for (const metaRecord of metagenomic) {
                await request('/api/metagenomic', {
                    method: 'POST',
                    body: JSON.stringify({
                        sampleID,
                        sequence_name: metaRecord.sequence_name,
                        element_type: metaRecord.element_type,
                        class: metaRecord.class,
                        subclass: metaRecord.subclass,
                    }),
                });
            }
        }

        // 4. Handle WGS data if present
        if (wgs && Array.isArray(wgs)) {
            for (const wgsRecord of wgs) {

                // Create WGS record
                const wgsResponse = await request('/api/wgs', {
                    method: 'POST',
                    body: JSON.stringify({
                        sampleID,
                        isolateID: parseInt(wgsRecord.isolateID, 10),
                        organism: wgsRecord.organism,
                    }),
                });
                const createdWGS = wgsResponse.wgs;
                const isolateID = createdWGS.isolateID;

                // Create virulence genes for this WGS isolate
                if (wgsRecord.virulence_genes && Array.isArray(wgsRecord.virulence_genes)) {
                    for (const geneSymbol of wgsRecord.virulence_genes) {
                        if (geneSymbol && geneSymbol.trim() !== '') {
                            await request('/api/virulence-genes', {
                                method: 'POST',
                                body: JSON.stringify({
                                    sampleID,
                                    isolateID,
                                    geneSymbol: geneSymbol.trim(),
                                }),
                            });
                        }
                    }
                }
            }
        }

        // 5. Fetch the complete sample with all relations
        const fullSampleResponse = await request(`/api/samples/${sampleID}`);
        return fullSampleResponse.sample;
    } catch (error) {
        console.error('API Error creating sample:', error);
        throw error;
    }
};

export const fetchAllSamples = async () => {
    try {
        const response = await request('/api/samples');
        return response.samples || [];
    } catch (error) {
        console.error('API Error fetching samples:', error);
        throw error;
    }
};

export const extractSamplesFromImage = async (file) => {
    if (!file) {
        throw new Error('Image file is required for OCR extraction');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/ocr/extract`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.details || data.error || 'Image extraction failed');
    }

    return data;
};

export const ingestReviewedSamples = async (samples) => {
    if (!Array.isArray(samples) || samples.length === 0) {
        throw new Error('At least one reviewed sample is required');
    }

    try {
        const response = await request('/api/ocr/ingest-reviewed', {
            method: 'POST',
            body: JSON.stringify({ samples }),
        });
        return response.results;
    } catch (error) {
        console.error('API Error ingesting reviewed samples:', error);
        throw error;
    }
};