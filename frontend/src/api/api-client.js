const DEFAULT_DEV_API_URL = 'http://localhost:3000';

function stripTrailingSlashes(value) {
    return String(value || '').replace(/\/+$/, '');
}

export function getApiBaseUrl() {
    const envUrl = stripTrailingSlashes(import.meta.env.VITE_API_URL);
    if (envUrl) {
        return envUrl;
    }

    if (import.meta.env.DEV) {
        return DEFAULT_DEV_API_URL;
    }

    return '';
}

export function buildApiUrl(path) {
    const baseUrl = getApiBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}
