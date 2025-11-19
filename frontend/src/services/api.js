import { fetchWithRetry, RetryPresets } from './retry';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

// Enable retry for GET requests by default
const shouldUseRetry = (method = 'GET') => {
	return ['GET', 'HEAD'].includes(method.toUpperCase());
};

let authToken = null;

// Initialize token from localStorage on module load
const initializeToken = () => {
	try {
		const token = localStorage.getItem('auth_token');
		if (token) {
			authToken = token;
		}
	} catch (error) {
		// Ignore localStorage errors
	}
};

initializeToken();

const getAuthHeaders = () => {
	// Fallback to localStorage if token not set in memory
	if (!authToken) {
		try {
			authToken = localStorage.getItem('auth_token');
		} catch (error) {
			// Ignore localStorage errors
		}
	}

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
	authToken = token;
	if (token) {
		try {
			localStorage.setItem('auth_token', token);
		} catch (error) {
			// Ignore localStorage errors
		}
	} else {
		try {
			localStorage.removeItem('auth_token');
		} catch (error) {
			// Ignore localStorage errors
		}
	}
};

export const clearAuthToken = () => {
	authToken = null;
	try {
		localStorage.removeItem('auth_token');
	} catch (error) {
		// Ignore localStorage errors
	}
};

const handleResponse = async (response) => {
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
		throw new ApiError(errorData.detail || 'An error occurred', response.status);
	}
	return response.json();
};

// Helper to merge options with signal
const mergeOptions = (options, signal) => {
	if (signal) {
		return { ...options, signal };
	}
	return options;
};

// Wrapper for fetch with retry logic
const fetchWithRetryWrapper = async (url, options = {}) => {
	const method = options.method || 'GET';

	// Use retry for safe methods (GET, HEAD)
	if (shouldUseRetry(method)) {
		return fetchWithRetry(url, options, RetryPresets.standard);
	}

	// No retry for unsafe methods (POST, PUT, DELETE)
	return fetch(url, options);
};


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
	}
};

// Income API
export const incomeApi = {
	getIncome: async () => {
		const response = await fetch(`${API_BASE_URL}/income`, {
			method: 'GET',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	createIncome: async (income) => {
		const response = await fetch(`${API_BASE_URL}/income`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify(income),
		});
		return handleResponse(response);
	},

	updateIncome: async (id, income) => {
		const response = await fetch(`${API_BASE_URL}/income/${id}`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(income),
		});
		return handleResponse(response);
	},

	deleteIncome: async (incomeId) => {
		const response = await fetch(`${API_BASE_URL}/income/${incomeId}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	}
};

// Expense API
export const expenseApi = {
	getExpenses: async (page = 1, pageSize = 1000, signal = null) => {
		const response = await fetchWithRetryWrapper(
			`${API_BASE_URL}/expenses?page=${page}&page_size=${pageSize}`,
			mergeOptions({
				method: 'GET',
				headers: getAuthHeaders(),
			}, signal)
		);
		return handleResponse(response);
	},

	createExpense: async (expense) => {
		const response = await fetch(`${API_BASE_URL}/expenses`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify(expense),
		});
		return handleResponse(response);
	},

	updateExpense: async (id, expense) => {
		const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(expense),
		});
		return handleResponse(response);
	},

	deleteExpense: async (id) => {
		const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},
};

// Budget API
export const budgetApi = {
	getBudgets: async () => {
		const response = await fetch(`${API_BASE_URL}/budgets`, {
			method: 'GET',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	createBudget: async (budget) => {
		const response = await fetch(`${API_BASE_URL}/budgets`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify(budget),
		});
		return handleResponse(response);
	},

	getBudget: async (id) => {
		const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	updateBudget: async (id, budget) => {
		const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: JSON.stringify(budget),
		});
		return handleResponse(response);
	},

	deleteBudget: async (id) => {
		const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},

	getBudgetAlerts: async () => {
		const response = await fetch(`${API_BASE_URL}/budgets/alerts`, {
			method: 'GET',
			headers: getAuthHeaders(),
		});
		return handleResponse(response);
	},
};

// Categories API
export const categoriesApi = {
	suggestCategory: async (description, amount) => {
		const response = await fetch(`${API_BASE_URL}/categories/suggest`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify({ description, amount }),
		});
		return handleResponse(response);
	},
};
