const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Generic API client handling JSON encoding and standard error structures
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const config = { ...options, headers };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) throw new Error(response.statusText);
    return null; // Some ok responses might not have JSON bodies
  }

  if (!response.ok) {
    let errMsg = response.statusText;
    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        errMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        errMsg = data.detail.map(e => `${e.loc?.join('.') || 'error'}: ${e.msg}`).join(', ');
      } else {
        errMsg = JSON.stringify(data.detail);
      }
    } else if (data && data.message) {
      errMsg = data.message;
    }
    throw new Error(errMsg);
  }

  return data;
}
