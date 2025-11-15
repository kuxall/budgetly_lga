/**
 * Simple in-memory cache for API responses
 */
class ApiCache {
	constructor() {
		this.cache = new Map();
		this.timestamps = new Map();
		this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
	}

	/**
	 * Generate cache key from URL and params
	 */
	generateKey(url, params = {}) {
		const sortedParams = Object.keys(params)
			.sort()
			.map(key => `${key}=${params[key]}`)
			.join('&');
		return `${url}?${sortedParams}`;
	}

	/**
	 * Get cached value if not expired
	 */
	get(key) {
		if (!this.cache.has(key)) {
			return null;
		}

		const timestamp = this.timestamps.get(key);
		const now = Date.now();

		// Check if expired
		if (now - timestamp > this.defaultTTL) {
			this.cache.delete(key);
			this.timestamps.delete(key);
			return null;
		}

		return this.cache.get(key);
	}

	/**
	 * Set cache value
	 */
	set(key, value, ttl = null) {
		this.cache.set(key, value);
		this.timestamps.set(key, Date.now());

		// Auto-cleanup after TTL
		if (ttl || this.defaultTTL) {
			setTimeout(() => {
				this.cache.delete(key);
				this.timestamps.delete(key);
			}, ttl || this.defaultTTL);
		}
	}

	/**
	 * Check if key exists and is not expired
	 */
	has(key) {
		return this.get(key) !== null;
	}

	/**
	 * Clear specific key
	 */
	delete(key) {
		this.cache.delete(key);
		this.timestamps.delete(key);
	}

	/**
	 * Clear all cache
	 */
	clear() {
		this.cache.clear();
		this.timestamps.clear();
	}

	/**
	 * Clear cache by pattern
	 */
	clearPattern(pattern) {
		const regex = new RegExp(pattern);
		const keysToDelete = [];

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => {
			this.cache.delete(key);
			this.timestamps.delete(key);
		});
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}
}

// Global cache instance
export const apiCache = new ApiCache();

/**
 * Cached fetch wrapper
 */
export const cachedFetch = async (url, options = {}, cacheOptions = {}) => {
	const {
		ttl = 5 * 60 * 1000, // 5 minutes
		forceRefresh = false,
		cacheKey = null,
	} = cacheOptions;

	const key = cacheKey || url;

	// Return cached value if exists and not forcing refresh
	if (!forceRefresh) {
		const cached = apiCache.get(key);
		if (cached !== null) {
			return cached;
		}
	}

	// Fetch fresh data
	try {
		const response = await fetch(url, options);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Cache the response
		apiCache.set(key, data, ttl);

		return data;
	} catch (error) {
		// If fetch fails and we have cached data, return it
		const cached = apiCache.get(key);
		if (cached !== null) {
			console.warn('Using stale cache due to fetch error:', error);
			return cached;
		}
		throw error;
	}
};

/**
 * Hook for using cached API calls
 */
export const useCachedApi = () => {
	const clearCache = (pattern = null) => {
		if (pattern) {
			apiCache.clearPattern(pattern);
		} else {
			apiCache.clear();
		}
	};

	const invalidateCache = (key) => {
		apiCache.delete(key);
	};

	return {
		cachedFetch,
		clearCache,
		invalidateCache,
		cacheStats: apiCache.getStats(),
	};
};

export default apiCache;
