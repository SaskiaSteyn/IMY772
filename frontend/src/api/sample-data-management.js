const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
    const {signal, ...restOptions} = options
    const res = await fetch(`${API_URL}${path}`, {
        headers: {'Content-Type': 'application/json'},
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

// ─── SAMPLES API ──────────────────────────────────────────────────────────────

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
    const response = await request('/api/samples', {signal})
    return response.samples || []
}

export const fetchSampleById = async (sampleId, signal) => {
    const response = await request(`/api/samples/${sampleId}`, {signal})
    return response.sample
}

export const fetchSamplesByUser = async (userId, signal) => {
    const response = await request(`/api/samples/uploaded_by/${userId}`, {signal})
    return response.samples || []
}

export const createSample = async (sampleData, signal) => {
    const response = await request('/api/samples', {
        method: 'POST',
        body: JSON.stringify(sampleData),
        signal,
    })
    return response.sample
}

export const updateSample = async (sampleId, updateData, signal) => {
    const response = await request(`/api/samples/${sampleId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.sample
}

export const deleteSample = async (sampleId, signal) => {
    await request(`/api/samples/${sampleId}`, {
        method: 'DELETE',
        signal,
    })
}

export const predictPhenotype = async (sampleData, signal) => {
    const response = await request('/api/samples/predict-phenotype', {
        method: 'POST',
        body: JSON.stringify(sampleData),
        signal,
    })
    return response.prediction
}

// ─── ISOLATES API ────────────────────────────────────────────────────────────

export const fetchAllIsolates = async (signal) => {
    const response = await request('/api/isolates', {signal})
    return response.isolates || []
}

export const fetchIsolateById = async (isolateId, signal) => {
    const response = await request(`/api/isolates/${isolateId}`, {signal})
    return response.isolate
}

export const fetchIsolatesBySample = async (sampleId, signal) => {
    const response = await request(`/api/isolates/sample/${sampleId}`, {signal})
    return response.isolates || []
}

export const createIsolate = async (isolateData, signal) => {
    const response = await request('/api/isolates', {
        method: 'POST',
        body: JSON.stringify(isolateData),
        signal,
    })
    return response.isolate
}

export const updateIsolate = async (isolateId, updateData, signal) => {
    const response = await request(`/api/isolates/${isolateId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.isolate
}

export const deleteIsolate = async (isolateId, signal) => {
    await request(`/api/isolates/${isolateId}`, {
        method: 'DELETE',
        signal,
    })
}

// ─── PREDICTED PHENOTYPES API ────────────────────────────────────────────────

export const fetchAllPredictedPhenotypes = async (signal) => {
    const response = await request('/api/predicted-phenotypes', {signal})
    return response.phenotypes || []
}

export const fetchPredictedPhenotypeById = async (phenotypeId, signal) => {
    const response = await request(`/api/predicted-phenotypes/${phenotypeId}`, {signal})
    return response.phenotype
}

export const fetchPredictedPhenotypesBySample = async (sampleId, signal) => {
    const response = await request(`/api/predicted-phenotypes/sample/${sampleId}`, {signal})
    return response.phenotypes || []
}

export const createPredictedPhenotype = async (phenotypeData, signal) => {
    const response = await request('/api/predicted-phenotypes', {
        method: 'POST',
        body: JSON.stringify(phenotypeData),
        signal,
    })
    return response.phenotype
}

export const updatePredictedPhenotype = async (phenotypeId, updateData, signal) => {
    const response = await request(`/api/predicted-phenotypes/${phenotypeId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.phenotype
}

export const deletePredictedPhenotype = async (phenotypeId, signal) => {
    await request(`/api/predicted-phenotypes/${phenotypeId}`, {
        method: 'DELETE',
        signal,
    })
}

// ─── AMR FINDINGS API ────────────────────────────────────────────────────────

export const fetchAllAmrFindings = async (signal) => {
    const response = await request('/api/amr-findings', {signal})
    return response.amrFindings || []
}

export const fetchAmrFindingById = async (amrId, signal) => {
    const response = await request(`/api/amr-findings/${amrId}`, {signal})
    return response.amrFinding
}

export const fetchAmrFindingsBySample = async (sampleId, signal) => {
    const response = await request(`/api/amr-findings/sample/${sampleId}`, {signal})
    return response.amrFindings || []
}

export const createAmrFinding = async (findingData, signal) => {
    const response = await request('/api/amr-findings', {
        method: 'POST',
        body: JSON.stringify(findingData),
        signal,
    })
    return response.amrFinding
}

export const updateAmrFinding = async (amrId, updateData, signal) => {
    const response = await request(`/api/amr-findings/${amrId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        signal,
    })
    return response.amrFinding
}

export const deleteAmrFinding = async (amrId, signal) => {
    await request(`/api/amr-findings/${amrId}`, {
        method: 'DELETE',
        signal,
    })
}