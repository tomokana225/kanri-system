// A simple fetch wrapper for API calls
// This might not be used if everything goes through Firebase,
// but it's good to have a placeholder.

const BASE_URL = '/api'; // Example base URL

interface RequestOptions extends RequestInit {
  body?: any;
}

async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T | null> {
  const { body, ...customConfig } = options;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  const config: RequestInit = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    return Promise.reject(error);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    // JSON parsing can fail if the response body is empty
    return Promise.resolve(null);
  }
}

export default api;