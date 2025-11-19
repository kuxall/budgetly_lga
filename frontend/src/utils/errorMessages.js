/**
 * User-friendly error messages for common API errors
 */

export const getErrorMessage = (error) => {
	// Handle ApiError with status
	if (error.status) {
		return getStatusErrorMessage(error.status, error.message);
	}

	// Handle network errors
	if (error.message?.includes('fetch') || error.message?.includes('Network')) {
		return 'Unable to connect to the server. Please check your internet connection.';
	}

	// Handle timeout errors
	if (error.name === 'AbortError' || error.message?.includes('timeout')) {
		return 'Request timed out. Please try again.';
	}

	// Default to error message or generic message
	return error.message || 'An unexpected error occurred. Please try again.';
};

const getStatusErrorMessage = (status, defaultMessage) => {
	const messages = {
		// 4xx Client Errors
		400: 'Invalid request. Please check your input and try again.',
		401: 'Your session has expired. Please log in again.',
		403: 'You don\'t have permission to perform this action.',
		404: 'The requested resource was not found.',
		409: 'This action conflicts with existing data.',
		422: 'The data provided is invalid. Please check and try again.',
		429: 'Too many requests. Please wait a moment and try again.',

		// 5xx Server Errors
		500: 'Server error. Our team has been notified. Please try again later.',
		502: 'Service temporarily unavailable. Please try again in a moment.',
		503: 'Service is under maintenance. Please try again later.',
		504: 'Request timed out. Please try again.',
	};

	return messages[status] || defaultMessage || `Error ${status}: Something went wrong.`;
};

/**
 * Get user-friendly error message for specific operations
 */
export const getOperationErrorMessage = (operation, error) => {
	const baseMessage = getErrorMessage(error);

	const operationMessages = {
		// Auth operations
		login: 'Unable to log in. Please check your credentials.',
		register: 'Unable to create account. The email may already be in use.',
		logout: 'Unable to log out. Please try again.',
		'forgot-password': 'Unable to send password reset email. Please try again.',
		'reset-password': 'Unable to reset password. The link may have expired.',

		// Expense operations
		'create-expense': 'Unable to create expense. Please check your input.',
		'update-expense': 'Unable to update expense. Please try again.',
		'delete-expense': 'Unable to delete expense. Please try again.',
		'fetch-expenses': 'Unable to load expenses. Please refresh the page.',

		// Income operations
		'create-income': 'Unable to create income record. Please check your input.',
		'update-income': 'Unable to update income record. Please try again.',
		'delete-income': 'Unable to delete income record. Please try again.',
		'fetch-income': 'Unable to load income records. Please refresh the page.',

		// Budget operations
		'create-budget': 'Unable to create budget. Please check your input.',
		'update-budget': 'Unable to update budget. Please try again.',
		'delete-budget': 'Unable to delete budget. Please try again.',
		'fetch-budgets': 'Unable to load budgets. Please refresh the page.',

		// Receipt operations
		'upload-receipt': 'Unable to upload receipt. Please check the file and try again.',
		'process-receipt': 'Unable to process receipt. The image may be unclear.',
		'fetch-receipts': 'Unable to load receipts. Please refresh the page.',

		// Settings operations
		'update-profile': 'Unable to update profile. Please check your input.',
		'change-password': 'Unable to change password. Please check your current password.',
		'export-data': 'Unable to export data. Please try again.',
		'delete-account': 'Unable to delete account. Please try again.',
	};

	const specificMessage = operationMessages[operation];

	// If we have a specific message and the error is generic, use the specific one
	if (specificMessage && (baseMessage.includes('unexpected error') || baseMessage.includes('Something went wrong'))) {
		return specificMessage;
	}

	return baseMessage;
};

/**
 * Get validation error messages
 */
export const getValidationMessage = (field, error) => {
	const fieldMessages = {
		email: 'Please enter a valid email address.',
		password: 'Password must be at least 6 characters long.',
		amount: 'Please enter a valid amount greater than 0.',
		date: 'Please select a valid date.',
		category: 'Please select a category.',
		description: 'Please enter a description.',
		source: 'Please enter an income source.',
	};

	return fieldMessages[field] || `Invalid ${field}. Please check your input.`;
};

/**
 * Format error for display
 */
export const formatError = (error, operation = null) => {
	if (operation) {
		return getOperationErrorMessage(operation, error);
	}
	return getErrorMessage(error);
};

export default {
	getErrorMessage,
	getOperationErrorMessage,
	getValidationMessage,
	formatError,
};
