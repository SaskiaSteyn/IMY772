const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
    const { signal, ...restOptions } = options
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal,
        ...restOptions,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw new Error(data.message || 'Request failed')
    }

    return data
}

export const createFullSample = async (data) => {
    try {
        const { metagenomic, wgs, ...sampleFields } = data
        const sampleResponse = await request('/api/samples', {
            method: 'POST',
            body: JSON.stringify(sampleFields),
        })
        const createdSample = sampleResponse.sample
        const sampleID = createdSample.sampleID

        if (metagenomic && Array.isArray(metagenomic)) {
            const allAmrGenes = new Set()
            for (const metaRecord of metagenomic) {
                if (metaRecord.amr_resistance_genes && Array.isArray(metaRecord.amr_resistance_genes)) {
                    metaRecord.amr_resistance_genes.forEach(gene => {
                        if (gene && gene.trim() !== '') allAmrGenes.add(gene.trim())
                    })
                }
            }
            for (const geneSymbol of allAmrGenes) {
                await request('/api/amr-resistance-genes', {
                    method: 'POST',
                    body: JSON.stringify({ sampleID, geneSymbol }),
                })
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
                })
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
                })
                const createdWGS = wgsResponse.wgs
                const isolateID = createdWGS.isolateID

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
                            })
                        }
                    }
                }
            }
        }

        const fullSampleResponse = await request(`/api/samples/${sampleID}`)
        return fullSampleResponse.sample
    } catch (error) {
        console.error('API Error creating sample:', error)
        throw error
    }
}

// Send a photo of a water-sample table to the backend for OCR extraction.
// Uses FormData (not the JSON `request` helper) so the browser sets the
// multipart boundary. Returns { fields, confidence, rawText }; the image is
// processed in memory on the server and never stored.
export const extractSampleFromImage = async (file) => {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch(`${API_URL}/api/samples/extract-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to extract data from image')
    }

    return data
}

// Send a photo of a table where each ROW is a sample; returns { samples: [...] }
// of core sample objects for the user to review/edit before bulk submission.
export const extractSamplesFromImage = async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('mode', 'multi')

    const res = await fetch(`${API_URL}/api/samples/extract-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to extract data from image')
    }

    return data
}

export const fetchAllSamples = async (signal) => {
    const response = await request('/api/samples', { signal })
    return response.samples || []
}

export const fetchAllMetagenomic = async (signal) => {
    const response = await request('/api/metagenomic', { signal })
    return response.metagenomic || []
}

export const fetchAllWgs = async (signal) => {
    const response = await request('/api/wgs', { signal })
    return response.wgs || []
}

export const fetchAllAmrGenes = async (signal) => {
    const response = await request('/api/amr-resistance-genes', { signal })
    return response.amrResistanceGenes || []
}

export const fetchAllVirulenceGenes = async (signal) => {
    const response = await request('/api/virulence-genes', { signal })
    return response.virulenceGenes || []
}

export const fetchSampleById = async (sampleID, signal) => {
    const response = await request(`/api/samples/${sampleID}`, { signal })
    return response.sample
}

export const predictSirProfile = async (data, signal) => {
    const response = await request('/api/samples/predict-sir', {
        method: 'POST',
        body: JSON.stringify(data),
        signal,
    })
    return response.prediction
}

export const fetchMetagenomicBySample = async (sampleID, signal) => {
    const response = await request(`/api/metagenomic/sample/${sampleID}`, { signal })
    return response.metagenomic || []
}

export const fetchWgsBySample = async (sampleID, signal) => {
    const response = await request(`/api/wgs/sample/${sampleID}`, { signal })
    return response.wgs || []
}

export const fetchAmrBySample = async (sampleID, signal) => {
    const response = await request(`/api/amr-resistance-genes/sample/${sampleID}`, { signal })
    return response.amrResistanceGenes || []
}

export const fetchVirulenceBySample = async (sampleID, signal) => {
    const wgsRecords = await fetchWgsBySample(sampleID, signal)
    const isolateIds = wgsRecords.map(w => w.isolateID)
    if (isolateIds.length === 0) return []
    const allVirulence = await fetchAllVirulenceGenes(signal)
    return allVirulence.filter(v => isolateIds.includes(v.isolateID))
}

export const updateFullSample = async (sampleID, updatedData, signal) => {
    const { metagenomic, wgs, amrGenes, virulenceGenes, ...sampleFields } = updatedData
    await request(`/api/samples/${sampleID}`, {
        method: 'PUT',
        body: JSON.stringify(sampleFields),
        signal,
    })

    const existingMeta = await fetchMetagenomicBySample(sampleID, signal)
    for (const meta of existingMeta) {
        await request(`/api/metagenomic/sample/${sampleID}/sequence/${encodeURIComponent(meta.sequence_name)}`, {
            method: 'DELETE',
            signal,
        })
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
                signal,
            })
        }
    }

    const existingAmr = await fetchAmrBySample(sampleID, signal)
    for (const amr of existingAmr) {
        await request(`/api/amr-resistance-genes/sample/${sampleID}/gene/${encodeURIComponent(amr.geneSymbol)}`, {
            method: 'DELETE',
            signal,
        })
    }
    if (amrGenes && amrGenes.length) {
        for (const geneSymbol of amrGenes) {
            if (geneSymbol && geneSymbol.trim()) {
                await request('/api/amr-resistance-genes', {
                    method: 'POST',
                    body: JSON.stringify({ sampleID, geneSymbol: geneSymbol.trim() }),
                    signal,
                })
            }
        }
    }

    const existingWgs = await fetchWgsBySample(sampleID, signal)
    for (const w of existingWgs) {
        const virForIsolate = await request(`/api/virulence-genes/isolate/${w.isolateID}`, { signal })
        if (virForIsolate.virulenceGenes) {
            for (const v of virForIsolate.virulenceGenes) {
                await request(`/api/virulence-genes/isolate/${w.isolateID}/gene/${encodeURIComponent(v.geneSymbol)}`, {
                    method: 'DELETE',
                    signal,
                })
            }
        }
        await request(`/api/wgs/${w.sampleID}/${w.isolateID}`, { method: 'DELETE', signal })
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
                signal,
            })
            const createdWGS = wgsResponse.wgs
            const isolateID = createdWGS.isolateID

            if (virulenceGenes && virulenceGenes.length) {
                const genesForThisIsolate = virulenceGenes.filter(vg => vg.isolateID === isolateID)
                for (const vg of genesForThisIsolate) {
                    if (vg.geneSymbol && vg.geneSymbol.trim()) {
                        await request('/api/virulence-genes', {
                            method: 'POST',
                            body: JSON.stringify({
                                sampleID,
                                isolateID,
                                geneSymbol: vg.geneSymbol.trim(),
                            }),
                            signal,
                        })
                    }
                }
            }
        }
    }
}

export const updateSample = async (sampleID, updateData, signal) => {
    const response = await request(`/api/samples/${sampleID}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.sample
}

export const updateMetagenomic = async (sampleID, sequenceName, updateData, signal) => {
    const response = await request(`/api/metagenomic/sample/${sampleID}/sequence/${encodeURIComponent(sequenceName)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.metagenomic
}

export const updateWgs = async (sampleID, isolateID, updateData, signal) => {
    const response = await request(`/api/wgs/${sampleID}/${isolateID}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.wgs
}

export const updateAmrGene = async (sampleID, geneSymbol, updateData, signal) => {
    const response = await request(`/api/amr-resistance-genes/sample/${sampleID}/gene/${encodeURIComponent(geneSymbol)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.amrResistanceGene
}

export const updateVirulenceGene = async (isolateID, geneSymbol, updateData, signal) => {
    const response = await request(`/api/virulence-genes/isolate/${isolateID}/gene/${encodeURIComponent(geneSymbol)}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.virulenceGene
}