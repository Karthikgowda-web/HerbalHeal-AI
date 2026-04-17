let rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Auto-fix: Ensure the URL ends with /api
if (!rawUrl.endsWith('/api') && !rawUrl.endsWith('/api/')) {
    rawUrl = rawUrl.replace(/\/$/, '') + '/api';
}

export const API_BASE_URL = rawUrl;
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_LOCALHOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

