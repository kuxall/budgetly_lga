/**
 * Retry logic for failed API requests
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 10000) => {
	const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
	// Add jitter to prevent thundering herd
	const jitter = Math.random() * 0.3 * delay;
	return delay + jitter;
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
	// Network errors
	if (error.name === 'TypeError' && error.message.includes('fetch')) {
		return true;
	}

	// Timeout errors
	if (error.name === 'AbortError') {
		return false; // Don't retry cancelled requests
	}

	// HTTP status codes that should be retried
	if (error.status) {
		const retryableStatuses = [408, 429, 500, 502, 503, 504];
		return retryableStatuses.includes(error.status);
	}

	return false;
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async (
	fn,
	options = {}
) => {
	const {
		maxRetries = 3,
		baseDelay = 1000,
		maxDelay = 10000,
		onRetry = null,
		shouldRetry = isRetryableError,
	} = options;

	let lastError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if it's the last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Check if error should be retried
			if (!shouldRetry(error)) {
				throw error;
			}

			// Calculate delay
			const delay = getBackoffDelay(attempt, baseDelay, maxDelay);

			// Call retry callback if provided
			if (onRetry) {
				onRetry(attempt + 1, delay, error);
			}

			// Wait before retrying
			await sleep(delay);
		}
	}

	throw lastError;
};

/**
 * Fetch with retry logic
 */
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
	return retryWithBackoff(
		() => fetch(url, options),
		{
			...retryOptions,
			onRetry: (attempt, delay, error) => {
				console.log(`Retry attempt ${attempt} after ${Math.round(delay)}ms due to:`, error.message);
				if (retryOptions.onRetry) {
					retryOptions.onRetry(attempt, delay, error);
				}
			},
		}
	);
};

/**
 * React hook for retry logic
 */
export const useRetry = () => {
	const retry = async (fn, options = {}) => {
		return retryWithBackoff(fn, options);
	};

	return { retry, retryWithBackoff, fetchWithRetry };
};

/**
 * Retry configuration presets
 */
export const RetryPresets = {
	// Quick retry for fast operations
	quick: {
		maxRetries: 2,
		baseDelay: 500,
		maxDelay: 2000,
	},
	// Standard retry for normal operations
	standard: {
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 10000,
	},
	// Aggressive retry for critical operations
	aggressive: {
		maxRetries: 5,
		baseDelay: 1000,
		maxDelay: 30000,
	},
	// No retry
	none: {
		maxRetries: 0,
	},
};

export default retryWithBackoff;
