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

export const fetchAllMetagenomic = async () => {
    try {
        const response = await request('/api/metagenomic');
        return response.metagenomic || [];
    } catch (error) {
        console.error('API Error fetching metagenomic records:', error);
        throw error;
    }
};

export const fetchAllWgs = async () => {
    try {
        const response = await request('/api/wgs');
        return response.wgs || [];
    } catch (error) {
        console.error('API Error fetching WGS records:', error);
        throw error;
    }
};

export const fetchAllAmrGenes = async () => {
    try {
        const response = await request('/api/amr-resistance-genes');
        return response.amrResistanceGenes || [];
    } catch (error) {
        console.error('API Error fetching AMR genes:', error);
        throw error;
    }
};

export const fetchAllVirulenceGenes = async () => {
    try {
        const response = await request('/api/virulence-genes');
        return response.virulenceGenes || [];
    } catch (error) {
        console.error('API Error fetching virulence genes:', error);
        throw error;
    }
};

export const updateSample = async (sampleID, updateData) => {
    try {
        const response = await request(`/api/samples/${sampleID}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return response.sample;
    } catch (error) {
        console.error('API Error updating sample:', error);
        throw error;
    }
};

export const updateMetagenomic = async (sampleID, sequenceName, updateData) => {
    try {
        const response = await request(`/api/metagenomic/sample/${sampleID}/sequence/${encodeURIComponent(sequenceName)}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return response.metagenomic;
    } catch (error) {
        console.error('API Error updating metagenomic:', error);
        throw error;
    }
};

export const updateWgs = async (sampleID, isolateID, updateData) => {
    try {
        const response = await request(`/api/wgs/${sampleID}/${isolateID}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return response.wgs;
    } catch (error) {
        console.error('API Error updating WGS:', error);
        throw error;
    }
};

export const updateAmrGene = async (sampleID, geneSymbol, updateData) => {
    try {
        const response = await request(`/api/amr-resistance-genes/sample/${sampleID}/gene/${encodeURIComponent(geneSymbol)}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return response.amrResistanceGene;
    } catch (error) {
        console.error('API Error updating AMR gene:', error);
        throw error;
    }
};

export const updateVirulenceGene = async (isolateID, geneSymbol, updateData) => {
    try {
        const response = await request(`/api/virulence-genes/isolate/${isolateID}/gene/${encodeURIComponent(geneSymbol)}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        return response.virulenceGene;
    } catch (error) {
        console.error('API Error updating virulence gene:', error);
        throw error;
    }
};