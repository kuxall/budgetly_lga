/**
 * Validation utilities for form inputs and data
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
	if (!email || typeof email !== 'string') return false;
	return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and errors
 */
export const validatePassword = (password) => {
	const errors = [];

	if (!password) {
		errors.push('Password is required');
		return { isValid: false, errors };
	}

	if (password.length < 8) {
		errors.push('Password must be at least 8 characters long');
	}

	if (!/[a-z]/.test(password)) {
		errors.push('Password must contain at least one lowercase letter');
	}

	if (!/[A-Z]/.test(password)) {
		errors.push('Password must contain at least one uppercase letter');
	}

	if (!/\d/.test(password)) {
		errors.push('Password must contain at least one number');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
};

/**
 * Validate expense amount
 * @param {number|string} amount - Amount to validate
 * @returns {object} - Validation result
 */
export const validateAmount = (amount) => {
	const numAmount = parseFloat(amount);

	if (isNaN(numAmount)) {
		return { isValid: false, error: 'Amount must be a valid number' };
	}

	if (numAmount <= 0) {
		return { isValid: false, error: 'Amount must be greater than 0' };
	}

	if (numAmount > 1000000) {
		return { isValid: false, error: 'Amount cannot exceed $1,000,000' };
	}

	// Check for more than 2 decimal places
	if (amount.toString().includes('.') && amount.toString().split('.')[1].length > 2) {
		return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
	}

	return { isValid: true };
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {object} - Validation result
 */
export const validateRequired = (value, fieldName = 'Field') => {
	if (value === null || value === undefined || value === '') {
		return { isValid: false, error: `${fieldName} is required` };
	}

	if (typeof value === 'string' && value.trim() === '') {
		return { isValid: false, error: `${fieldName} cannot be empty` };
	}

	return { isValid: true };
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {object} - Validation result
 */
export const validateStringLength = (value, minLength = 0, maxLength = Infinity, fieldName = 'Field') => {
	if (typeof value !== 'string') {
		return { isValid: false, error: `${fieldName} must be a string` };
	}

	if (value.length < minLength) {
		return { isValid: false, error: `${fieldName} must be at least ${minLength} characters long` };
	}

	if (value.length > maxLength) {
		return { isValid: false, error: `${fieldName} cannot exceed ${maxLength} characters` };
	}

	return { isValid: true };
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @param {boolean} allowFuture - Whether future dates are allowed
 * @returns {object} - Validation result
 */
export const validateDate = (date, allowFuture = true) => {
	let dateObj;

	if (typeof date === 'string') {
		dateObj = new Date(date);
	} else if (date instanceof Date) {
		dateObj = date;
	} else {
		return { isValid: false, error: 'Invalid date format' };
	}

	if (isNaN(dateObj.getTime())) {
		return { isValid: false, error: 'Invalid date' };
	}

	if (!allowFuture && dateObj > new Date()) {
		return { isValid: false, error: 'Date cannot be in the future' };
	}

	// Check if date is too far in the past (more than 10 years)
	const tenYearsAgo = new Date();
	tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

	if (dateObj < tenYearsAgo) {
		return { isValid: false, error: 'Date cannot be more than 10 years ago' };
	}

	return { isValid: true };
};

/**
 * Validate expense category
 * @param {string} category - Category to validate
 * @returns {object} - Validation result
 */
export const validateCategory = (category) => {
	const validCategories = [
		'Groceries',
		'Transportation',
		'Entertainment',
		'Utilities',
		'Healthcare',
		'Shopping',
		'Dining',
		'Other'
	];

	if (!validCategories.includes(category)) {
		return { isValid: false, error: 'Invalid category selected' };
	}

	return { isValid: true };
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
export const validateFile = (file, options = {}) => {
	const {
		maxSizeMB = 50,
		allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
	} = options;

	if (!file) {
		return { isValid: false, error: 'No file selected' };
	}

	// Check file size
	const maxSizeBytes = maxSizeMB * 1024 * 1024;
	if (file.size > maxSizeBytes) {
		return { isValid: false, error: `File size cannot exceed ${maxSizeMB}MB` };
	}

	// Check file type
	if (!allowedTypes.includes(file.type)) {
		return { isValid: false, error: 'Invalid file type. Please upload JPG, PNG, or PDF files only.' };
	}

	return { isValid: true };
};

/**
 * Validate form data using multiple validators
 * @param {object} data - Form data to validate
 * @param {object} validators - Validation rules
 * @returns {object} - Validation result with field-specific errors
 */
export const validateForm = (data, validators) => {
	const errors = {};
	let isValid = true;

	Object.keys(validators).forEach(field => {
		const value = data[field];
		const fieldValidators = validators[field];

		for (const validator of fieldValidators) {
			const result = validator(value);
			if (!result.isValid) {
				errors[field] = result.error;
				isValid = false;
				break; // Stop at first error for this field
			}
		}
	});

	return { isValid, errors };
};

// Export validation rules for common forms
export const expenseValidationRules = {
	description: [
		(value) => validateRequired(value, 'Description'),
		(value) => validateStringLength(value, 1, 200, 'Description')
	],
	amount: [
		(value) => validateRequired(value, 'Amount'),
		(value) => validateAmount(value)
	],
	category: [
		(value) => validateRequired(value, 'Category'),
		(value) => validateCategory(value)
	],
	date: [
		(value) => validateRequired(value, 'Date'),
		(value) => validateDate(value, false)
	]
};

export const userRegistrationRules = {
	email: [
		(value) => validateRequired(value, 'Email'),
		(value) => isValidEmail(value) ? { isValid: true } : { isValid: false, error: 'Invalid email format' }
	],
	password: [
		(value) => validateRequired(value, 'Password'),
		(value) => validatePassword(value)
	],
	first_name: [
		(value) => validateRequired(value, 'First name'),
		(value) => validateStringLength(value, 1, 50, 'First name')
	],
	last_name: [
		(value) => validateRequired(value, 'Last name'),
		(value) => validateStringLength(value, 1, 50, 'Last name')
	]
};