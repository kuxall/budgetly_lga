const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

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
	getExpenses: async () => {
		const response = await fetch(`${API_BASE_URL}/expenses`, {
			method: 'GET',
			headers: getAuthHeaders(),
		});
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
