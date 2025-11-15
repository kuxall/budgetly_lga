import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for API calls with automatic cancellation on unmount
 */
export const useApi = () => {
	const abortControllersRef = useRef([]);

	// Cleanup function to abort all pending requests
	useEffect(() => {
		return () => {
			abortControllersRef.current.forEach(controller => {
				controller.abort();
			});
			abortControllersRef.current = [];
		};
	}, []);

	/**
	 * Make an API call with automatic cancellation support
	 */
	const apiCall = useCallback(async (fetchFn, options = {}) => {
		const controller = new AbortController();
		abortControllersRef.current.push(controller);

		try {
			const result = await fetchFn({
				...options,
				signal: controller.signal
			});

			// Remove controller from list after successful completion
			abortControllersRef.current = abortControllersRef.current.filter(
				c => c !== controller
			);

			return result;
		} catch (error) {
			// Remove controller from list
			abortControllersRef.current = abortControllersRef.current.filter(
				c => c !== controller
			);

			// Don't throw error if request was cancelled
			if (error.name === 'AbortError' || error.message?.includes('aborted')) {
				return null;
			}

			throw error;
		}
	}, []);

	/**
	 * Cancel all pending requests manually
	 */
	const cancelAll = useCallback(() => {
		abortControllersRef.current.forEach(controller => {
			controller.abort();
		});
		abortControllersRef.current = [];
	}, []);

	return { apiCall, cancelAll };
};

/**
 * Hook for a single cancellable API call
 */
export const useCancellableRequest = () => {
	const abortControllerRef = useRef(null);

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const execute = useCallback(async (fetchFn) => {
		// Cancel previous request if exists
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new controller
		abortControllerRef.current = new AbortController();

		try {
			const result = await fetchFn(abortControllerRef.current.signal);
			abortControllerRef.current = null;
			return result;
		} catch (error) {
			abortControllerRef.current = null;

			// Don't throw error if request was cancelled
			if (error.name === 'AbortError' || error.message?.includes('aborted')) {
				return null;
			}

			throw error;
		}
	}, []);

	const cancel = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	return { execute, cancel };
};
