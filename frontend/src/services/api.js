const API_BASE_URL = 'http://localhost:8001/api/v1';

class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

let authToken = null;

const getAuthHeaders = () => {
	console.log('Getting auth headers, token exists:', !!authToken);
	if (authToken) {
		return {
			'Authorization': `Bearer ${authToken}`,
			'Content-Type': 'application/json',
		};
	}
	return {
		'Content-Type': 'application/json',
	};
};

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

	resetPassword: async (token, newPassword) => {
		const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, new_password: newPassword }),
		});
		return handleResponse(response);
	},


}

	changePassword: async (currentPassword, newPassword) => {
		const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({
				currentPassword,
				newPassword
			}),
		});
		return handleResponse(response);
	}
