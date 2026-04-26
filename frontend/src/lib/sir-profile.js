export function formatSirProfileLabel(value, fallback = '') {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()

    if (!normalized) {
        return fallback
    }

    if (normalized === 'susceptible') {
        return 'Susceptible'
    }

    if (normalized === 'intermediate') {
        return 'Intermediate'
    }

    if (normalized === 'resistant') {
        return 'Resistant'
    }

    return normalized
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
