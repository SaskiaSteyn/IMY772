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
        const {metagenomic, wgs, ...sampleFields} = data;
        const sampleResponse = await request('/api/samples', {
            method: 'POST',
            body: JSON.stringify(sampleFields),
        });
        const createdSample = sampleResponse.sample;
        const sampleID = createdSample.sampleID;

        if (metagenomic && Array.isArray(metagenomic)) {
            const allAmrGenes = new Set();
            for (const metaRecord of metagenomic) {
                if (metaRecord.amr_resistance_genes && Array.isArray(metaRecord.amr_resistance_genes)) {
                    metaRecord.amr_resistance_genes.forEach(gene => {
                        if (gene && gene.trim() !== '') allAmrGenes.add(gene.trim());
                    });
                }
            }
            for (const geneSymbol of allAmrGenes) {
                await request('/api/amr-resistance-genes', {
                    method: 'POST',
                    body: JSON.stringify({sampleID, geneSymbol}),
                });
            }
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

        if (wgs && Array.isArray(wgs)) {
            for (const wgsRecord of wgs) {
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

// ----- New fetch helpers for update -----
export const fetchSampleById = async (sampleID) => {
    const response = await request(`/api/samples/${sampleID}`);
    return response.sample;
};

export const fetchMetagenomicBySample = async (sampleID) => {
    const response = await request(`/api/metagenomic/sample/${sampleID}`);
    return response.metagenomic || [];
};

export const fetchWgsBySample = async (sampleID) => {
    const response = await request(`/api/wgs/sample/${sampleID}`);
    return response.wgs || [];
};

export const fetchAmrBySample = async (sampleID) => {
    const response = await request(`/api/amr-resistance-genes/sample/${sampleID}`);
    return response.amrResistanceGenes || [];
};

// Virulence genes by sampleID: we need to get WGS isolates first, then fetch virulence for each isolate
export const fetchVirulenceBySample = async (sampleID) => {
    const wgsRecords = await fetchWgsBySample(sampleID);
    const isolateIds = wgsRecords.map(w => w.isolateID);
    if (isolateIds.length === 0) return [];
    const allVirulence = await fetchAllVirulenceGenes();
    return allVirulence.filter(v => isolateIds.includes(v.isolateID));
};

// ----- Full update: deletes all child records and recreates them -----
export const updateFullSample = async (sampleID, updatedData) => {
    // 1. Update main sample
    const {metagenomic, wgs, amrGenes, virulenceGenes, ...sampleFields} = updatedData;
    await request(`/api/samples/${sampleID}`, {
        method: 'PUT',
        body: JSON.stringify(sampleFields),
    });

    // 2. Replace Metagenomic records (if analysis type is Metagenomic)
    const existingMeta = await fetchMetagenomicBySample(sampleID);
    for (const meta of existingMeta) {
        await request(`/api/metagenomic/sample/${sampleID}/sequence/${encodeURIComponent(meta.sequence_name)}`, {
            method: 'DELETE',
        });
    }
    if (metagenomic && metagenomic.length) {
        for (const meta of metagenomic) {
            await request('/api/metagenomic', {
                method: 'POST',
                body: JSON.stringify({
                    sampleID,
                    sequence_name: meta.sequence_name,
                    element_type: meta.element_type,
                    class: meta.class,
                    subclass: meta.subclass,
                }),
            });
        }
    }

    // 3. Replace AMR genes (if any)
    const existingAmr = await fetchAmrBySample(sampleID);
    for (const amr of existingAmr) {
        await request(`/api/amr-resistance-genes/sample/${sampleID}/gene/${encodeURIComponent(amr.geneSymbol)}`, {
            method: 'DELETE',
        });
    }
    if (amrGenes && amrGenes.length) {
        for (const geneSymbol of amrGenes) {
            if (geneSymbol && geneSymbol.trim()) {
                await request('/api/amr-resistance-genes', {
                    method: 'POST',
                    body: JSON.stringify({sampleID, geneSymbol: geneSymbol.trim()}),
                });
            }
        }
    }

    // 4. Replace WGS and their virulence genes
    const existingWgs = await fetchWgsBySample(sampleID);
    // First delete all virulence genes linked to existing isolates
    for (const w of existingWgs) {
        const virForIsolate = await request(`/api/virulence-genes/isolate/${w.isolateID}`);
        if (virForIsolate.virulenceGenes) {
            for (const v of virForIsolate.virulenceGenes) {
                await request(`/api/virulence-genes/isolate/${w.isolateID}/gene/${encodeURIComponent(v.geneSymbol)}`, {
                    method: 'DELETE',
                });
            }
        }
        // Delete the WGS record itself
        await request(`/api/wgs/${w.sampleID}/${w.isolateID}`, {method: 'DELETE'});
    }

    if (wgs && wgs.length) {
        for (const wgsRecord of wgs) {
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

            // Add virulence genes for this isolate (if any)
            if (virulenceGenes && virulenceGenes.length) {
                // virulenceGenes is an array of objects: { isolateID, geneSymbol }
                // Filter those belonging to this isolateID (or all if we assign to first isolate)
                const genesForThisIsolate = virulenceGenes.filter(vg => vg.isolateID === isolateID);
                for (const vg of genesForThisIsolate) {
                    if (vg.geneSymbol && vg.geneSymbol.trim()) {
                        await request('/api/virulence-genes', {
                            method: 'POST',
                            body: JSON.stringify({
                                sampleID,
                                isolateID,
                                geneSymbol: vg.geneSymbol.trim(),
                            }),
                        });
                    }
                }
            }
        }
    }
};

// ----- Keep existing update functions (for single record edits) -----
export const updateSample = async (sampleID, updateData) => {
    const response = await request(`/api/samples/${sampleID}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    return response.sample;
};

export const updateMetagenomic = async (sampleID, sequenceName, updateData) => {
    const response = await request(`/api/metagenomic/sample/${sampleID}/sequence/${encodeURIComponent(sequenceName)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    return response.metagenomic;
};

export const updateWgs = async (sampleID, isolateID, updateData) => {
    const response = await request(`/api/wgs/${sampleID}/${isolateID}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    return response.wgs;
};

export const updateAmrGene = async (sampleID, geneSymbol, updateData) => {
    const response = await request(`/api/amr-resistance-genes/sample/${sampleID}/gene/${encodeURIComponent(geneSymbol)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    return response.amrResistanceGene;
};

export const updateVirulenceGene = async (isolateID, geneSymbol, updateData) => {
    const response = await request(`/api/virulence-genes/isolate/${isolateID}/gene/${encodeURIComponent(geneSymbol)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
    return response.virulenceGene;
};