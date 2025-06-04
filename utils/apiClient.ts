
// Prefer the URL provided via Vite's environment variables when available so
// the frontend can easily point to a different backend in different
// environments (e.g. production or a container).  Fallback to the local
// development server URL.
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:3001/api';

interface ApiClientOptions extends RequestInit {
  useAuth?: boolean;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const { useAuth = true, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});
    
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.append('Content-Type', 'application/json');
    }

    if (useAuth && this.token) {
      headers.append('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, use status text
        errorData = { message: response.statusText || 'API request failed' };
      }
      // Attach status to the error object for better handling
      const error: any = new Error(errorData.message || 'API request failed');
      error.response = {
        status: response.status,
        data: errorData,
      };
      throw error;
    }

    // Handle cases where response might be empty (e.g., 204 No Content)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    // For non-JSON responses or empty responses, return an empty object or handle as needed
    // Or throw an error if JSON was expected but not received
    return {} as Promise<T>; // Adjust based on expected non-JSON responses
  }

  async get<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body: any, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(endpoint: string, body: any, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  async delete<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();