const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const fallbackMessageByStatus = {
    400: 'Invalid admin request',
    401: 'Authentication required',
    403: 'Admin access required',
    404: 'Admin endpoint not found',
    500: 'Admin server error',
}

function buildRequestError(path, response, data) {
    const error = new Error(
        data.message || fallbackMessageByStatus[response.status] || 'Request failed'
    )

    error.status = response.status
    error.path = path
    error.data = data
    return error
}

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw buildRequestError(path, res, data)
    }

    return data
}

export const adminApi = {
    listUsers: () => request('/api/admin/users'),

    getUser: (userID) => request(`/api/admin/users/${userID}`),

    createUser: (payload) =>
        request('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateUser: (userID, payload) =>
        request(`/api/admin/users/${userID}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteUser: (userID, reason) =>
        request(`/api/admin/users/${userID}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    getSummary: () => request('/api/admin/summary'),

    listWaterSamples: () => request('/api/admin/water/samples'),

    createWaterSample: (payload) =>
        request('/api/admin/water/samples', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateWaterSample: (sampleID, payload) =>
        request(`/api/admin/water/samples/${sampleID}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteWaterSample: (sampleID, reason) =>
        request(`/api/admin/water/samples/${sampleID}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    listData: (entity) => request(`/api/admin/data/${entity}`),

    createData: (entity, payload) =>
        request(`/api/admin/data/${entity}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateData: (entity, rowId, payload) =>
        request(`/api/admin/data/${entity}/${encodeURIComponent(rowId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteData: (entity, rowId, reason) =>
        request(`/api/admin/data/${entity}/${encodeURIComponent(rowId)}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),
}
