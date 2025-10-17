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

// Settings API
export const settingsApi = {
	getSettings: async () => {
		const response = await fetch(`${API_BASE_URL}/settings`, {
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	updateProfile: async (profileData) => {
		const response = await fetch(`${API_BASE_URL}/settings/profile`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(profileData),
		});
		return handleResponse(response);
	},

	updatePreferences: async (preferences) => {
		const response = await fetch(`${API_BASE_URL}/settings/preferences`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(preferences),
		});
		return handleResponse(response);
	},

	updateNotifications: async (notifications) => {
		const response = await fetch(`${API_BASE_URL}/settings/notifications`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(notifications),
		});
		return handleResponse(response);
	},

	updateReceiptSettings: async (receiptSettings) => {
		const response = await fetch(`${API_BASE_URL}/settings/receipts`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(receiptSettings),
		});
		return handleResponse(response);
	},

	updateSecuritySettings: async (securitySettings) => {
		const response = await fetch(`${API_BASE_URL}/settings/security`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(securitySettings),
		});
		return handleResponse(response);
	},

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
	},

	getStatistics: async () => {
		const response = await fetch(`${API_BASE_URL}/settings/statistics`, {
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	exportData: async () => {
		const response = await fetch(`${API_BASE_URL}/settings/export-data`, {
			method: 'POST',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	deleteAccount: async () => {
		const response = await fetch(`${API_BASE_URL}/settings/delete-account`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},
};

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

// Google OAuth methods
googleOAuthLogin: async () => {
	const response = await fetch(`${API_BASE_URL}/auth/oauth/google`, {
		headers: { 'Content-Type': 'application/json' },
	});
	return handleResponse(response);
},

	googleOAuthCallback: async (code) => {
		const response = await fetch(`${API_BASE_URL}/auth/oauth/google/callback?code=${code}`, {
			headers: { 'Content-Type': 'application/json' },
		});
		return handleResponse(response);
	},

		googleTokenLogin: async (idToken, userData = null) => {
			const payload = {};
			if (idToken) {
				payload.id_token = idToken;
			}
			if (userData) {
				payload.user_data = userData;
			}

			const response = await fetch(`${API_BASE_URL}/auth/oauth/google/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			return handleResponse(response);
		},

			googleLogin: async (credentials) => {
				const response = await fetch(`${API_BASE_URL}/auth/oauth/google/token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(credentials),
				});
				return handleResponse(response);
			}

