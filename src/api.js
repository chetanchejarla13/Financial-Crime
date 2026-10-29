/**
 * Financial Crime Investigation System - API Client
 * Connects React frontend directly to the Flask REST API & SQL Database.
 * No dummy or simulated fake data is generated.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Helper to handle fetch requests with standard error handling and auth headers
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('fcri_auth_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage = (data && data.error) || (data && data.message) || (
        (response.status === 502 || response.status === 503 || response.status === 504)
          ? 'Unable to connect to the investigation server. Please try again.'
          : `HTTP error ${response.status}`
      );
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      if (!data?.error && (response.status === 502 || response.status === 503 || response.status === 504)) {
        error.isConnectionError = true;
      }
      throw error;
    }

    return data;
  } catch (err) {
    // If backend server is unreachable or offline
    if (err.isConnectionError) {
      throw err;
    }
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      const connError = new Error('Unable to connect to the investigation server. Please try again.');
      connError.isConnectionError = true;
      throw connError;
    }
    throw err;
  }
}

export const api = {
  // Authentication Endpoints
  auth: {
    signup: async (credentials) => {
      // POST /api/auth/signup
      return await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },

    login: async (credentials) => {
      // POST /api/auth/login
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (res && res.token) {
        localStorage.setItem('fcri_auth_token', res.token);
      }
      if (res && res.user) {
        localStorage.setItem('fcri_user', JSON.stringify(res.user));
      } else {
        localStorage.setItem('fcri_user', JSON.stringify({ email: credentials.email }));
      }
      return res;
    },

    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // Clear local storage regardless of network result
      } finally {
        localStorage.removeItem('fcri_auth_token');
        localStorage.removeItem('fcri_user');
      }
    },

    getUser: () => {
      const raw = localStorage.getItem('fcri_user');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    isAuthenticated: () => {
      return Boolean(localStorage.getItem('fcri_auth_token') || localStorage.getItem('fcri_user'));
    }
  },

  // Dashboard Overview Metrics
  dashboard: {
    getStats: async () => {
      // GET /api/dashboard/stats
      return await request('/dashboard/stats');
    }
  },

  // Cases Management
  cases: {
    list: async () => {
      // GET /api/cases
      return await request('/cases');
    },

    get: async (id) => {
      // GET /api/cases/:id
      return await request(`/cases/${id}`);
    },

    create: async (caseData) => {
      // POST /api/cases
      return await request('/cases', {
        method: 'POST',
        body: JSON.stringify(caseData),
      });
    },

    update: async (id, updateData) => {
      // PUT /api/cases/:id
      return await request(`/cases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    }
  },

  // Evidence Management
  evidence: {
    upload: async (caseId, files) => {
      // POST /api/cases/:caseId/evidence
      const formData = new FormData();
      if (Array.isArray(files)) {
        files.forEach((file) => formData.append('files', file));
      } else {
        formData.append('files', files);
      }
      return await request(`/cases/${caseId}/evidence`, {
        method: 'POST',
        body: formData,
      });
    },

    list: async (caseId) => {
      // GET /api/cases/:caseId/evidence
      return await request(`/cases/${caseId}/evidence`);
    }
  },

  // AI-Assisted Investigation
  investigations: {
    get: async (caseId) => {
      // GET /api/investigations/:caseId
      return await request(`/investigations/${caseId}`);
    },

    start: async (caseId) => {
      // POST /api/investigations/start
      return await request('/investigations/start', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId }),
      });
    },

    chat: async (caseId, message, files = []) => {
      // POST /api/investigations/chat
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('case_id', caseId);
        formData.append('message', message);
        files.forEach((file) => {
          formData.append('files', file);
        });
        return await request('/investigations/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        return await request('/investigations/chat', {
          method: 'POST',
          body: JSON.stringify({ case_id: caseId, message }),
        });
      }
    }
  },

  // Reports
  reports: {
    get: async (caseId) => {
      // GET /api/reports/:caseId
      return await request(`/reports/${caseId}`);
    },

    generate: async (caseId) => {
      // POST /api/reports/:caseId/generate
      return await request(`/reports/${caseId}/generate`, {
        method: 'POST',
      });
    }
  },

  // Server health check
  health: {
    check: async () => {
      return await request('/health');
    },
    root: async () => {
      // GET /api -> { "status": "ok" }
      return await request('');
    }
  }
};

export default api;
