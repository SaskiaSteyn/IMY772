import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function applyFiltersToSamples(samples, filters) {
    if (!filters || filters.length === 0) return samples
    return samples.filter((sample) =>
        filters.every((f) => {
            const val = sample[f.field]
            if (val == null) return false
            switch (f.op) {
                case 'eq':
                    return typeof val === 'string'
                        ? val.toLowerCase() === String(f.value).toLowerCase()
                        : Number(val) === Number(f.value)
                case 'gt':
                    return Number(val) > Number(f.value)
                case 'lt':
                    return Number(val) < Number(f.value)
                case 'gte':
                    return Number(val) >= Number(f.value)
                case 'lte':
                    return Number(val) <= Number(f.value)
                case 'contains':
                    return String(val).toLowerCase().includes(String(f.value).toLowerCase())
                case 'between':
                    return Number(val) >= Number(f.value[0]) && Number(val) <= Number(f.value[1])
                default:
                    return true
            }
        })
    )
}

export function useAiFilter() {
    const [query, setQuery] = useState('')
    const [filters, setFilters] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    async function applyFilter() {
        if (!query.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/api/ai/filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ query }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Request failed')
            if (data.error) {
                setError(data.error)
                setFilters([])
            } else {
                setFilters(data.filters || [])
            }
        } catch (err) {
            setError(err.message)
            setFilters([])
        } finally {
            setLoading(false)
        }
    }

    function clearFilter() {
        setQuery('')
        setFilters([])
        setError(null)
    }

    return { query, setQuery, filters, loading, error, applyFilter, clearFilter, applyFiltersToSamples }
}
