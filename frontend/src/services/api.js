const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

// eslint-disable-next-line no-unused-vars
let authToken = null;



export const setAuthToken = (token) => {
	console.log('Setting auth token:', token ? 'Token set' : 'Token cleared');
	authToken = token;
};

const handleResponse = async (response) => {
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
		throw new ApiError(errorData.detail || 'An error occurred', response.status);
	}
	return response.json();
};

// Auth API
export const authApi = {
	login: async (email, password) => {
		const response = await fetch(`${API_BASE_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		return handleResponse(response);
	},

	register: async (email, password, first_name, last_name) => {
		const response = await fetch(`${API_BASE_URL}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, first_name, last_name }),
		});
		return handleResponse(response);
	},

	forgotPassword: async (email) => {
		const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		});
		return handleResponse(response);
	},

	resetPassword: async (token, new_password) => {
		const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, new_password }),
		});
		return handleResponse(response);
	},

	getProfile: async () => {
		const response = await fetch(`${API_BASE_URL}/auth/profile`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`,
			},
		});
		return handleResponse(response);
	},

	googleOAuthToken: async (idToken) => {
		const response = await fetch(`${API_BASE_URL}/auth/oauth/google/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id_token: idToken }),
		});
		return handleResponse(response);
	},

	googleOAuthLogin: async () => {
		const response = await fetch(`${API_BASE_URL}/auth/oauth/google`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		});
		return handleResponse(response);
	},
};
