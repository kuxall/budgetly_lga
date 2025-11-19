/**
 * Smart expense grouping utilities
 * Groups expenses by merchant/vendor extracted from descriptions
 * Uses pattern matching instead of hardcoded merchant lists
 */

/**
 * Extract merchant/vendor name from description
 * Handles patterns like:
 * - "Grocery at Walmart" -> "Walmart"
 * - "Lunch at McDonald's" -> "McDonald's"
 * - "Coffee from Starbucks" -> "Starbucks"
 * - "Walmart - Groceries" -> "Walmart"
 */
export const extractMerchant = (description) => {
	if (!description || typeof description !== 'string') {
		return null;
	}

	const desc = description.trim();

	// Pattern 1: "Something at Merchant" (most common)
	const atPattern = /\s+at\s+([A-Z][A-Za-z0-9\s'&.-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i;
	const atMatch = desc.match(atPattern);
	if (atMatch && atMatch[1]) {
		const merchant = atMatch[1].trim();
		if (isValidMerchantName(merchant)) {
			return merchant;
		}
	}

	// Pattern 2: "Something from Merchant"
	const fromPattern = /\s+from\s+([A-Z][A-Za-z0-9\s'&.-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i;
	const fromMatch = desc.match(fromPattern);
	if (fromMatch && fromMatch[1]) {
		const merchant = fromMatch[1].trim();
		if (isValidMerchantName(merchant)) {
			return merchant;
		}
	}

	// Pattern 3: "Merchant - Something" or "Merchant: Something"
	// Only if it starts with a capital letter (likely a proper noun)
	const prefixPattern = /^([A-Z][A-Za-z0-9\s'&.-]+?)(?:\s*[-:]\s+)/;
	const prefixMatch = desc.match(prefixPattern);
	if (prefixMatch && prefixMatch[1]) {
		const merchant = prefixMatch[1].trim();
		if (isValidMerchantName(merchant)) {
			return merchant;
		}
	}

	// Pattern 4: "Merchant (Something)" - merchant name before parenthesis
	const parenPattern = /^([A-Z][A-Za-z0-9\s'&.-]+?)\s*\(/;
	const parenMatch = desc.match(parenPattern);
	if (parenMatch && parenMatch[1]) {
		const merchant = parenMatch[1].trim();
		if (isValidMerchantName(merchant)) {
			return merchant;
		}
	}

	// If no pattern matches, return null (will use category grouping)
	return null;
};

/**
 * Check if extracted text is a valid merchant name
 */
const isValidMerchantName = (text) => {
	if (!text || text.length < 2) return false;

	// Too long to be a merchant name
	if (text.length > 50) return false;

	// Check if it's a generic word
	if (isGenericWord(text)) return false;

	// Should contain at least one letter
	if (!/[a-zA-Z]/.test(text)) return false;

	// Should not be all lowercase (likely not a proper noun)
	if (text === text.toLowerCase() && text.length > 3) return false;

	return true;
};

/**
 * Check if a word is too generic to be a merchant name
 */
const isGenericWord = (word) => {
	const lowerWord = word.toLowerCase().trim();

	const genericWords = [
		// Actions
		'grocery', 'groceries', 'lunch', 'dinner', 'breakfast', 'brunch',
		'coffee', 'food', 'shopping', 'purchase', 'payment', 'bought',
		'bill', 'expense', 'cost', 'paid', 'spending', 'transaction',

		// Time/frequency
		'today', 'yesterday', 'weekly', 'monthly', 'daily',

		// Generic places
		'store', 'shop', 'market', 'restaurant', 'cafe', 'bar',

		// Common words
		'the', 'and', 'for', 'with', 'online', 'delivery'
	];

	return genericWords.includes(lowerWord);
};

/**
 * Normalize merchant name for better grouping
 */
export const normalizeMerchant = (merchant) => {
	if (!merchant) return null;

	// Remove common suffixes
	let normalized = merchant
		.replace(/\s+(Inc|LLC|Ltd|Corp|Corporation|Co)\.?$/i, '')
		.replace(/\s+Store$/i, '')
		.replace(/\s+Market$/i, '')
		.trim();

	// Capitalize properly
	normalized = normalized
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

	return normalized;
};

/**
 * Group expenses by merchant or category
 */
export const groupExpensesByMerchant = (expenses) => {
	const groups = {};

	expenses.forEach(expense => {
		// Try to extract merchant
		let merchant = extractMerchant(expense.description);

		if (merchant) {
			// Normalize merchant name
			merchant = normalizeMerchant(merchant);
		} else {
			// Fall back to category if no merchant found
			merchant = expense.category || 'Other';
		}

		if (!groups[merchant]) {
			groups[merchant] = {
				name: merchant,
				amount: 0,
				count: 0,
				expenses: []
			};
		}

		groups[merchant].amount += expense.amount;
		groups[merchant].count += 1;
		groups[merchant].expenses.push(expense);
	});

	return groups;
};

/**
 * Get top spending merchants/categories
 */
export const getTopSpending = (expenses, limit = 5) => {
	const groups = groupExpensesByMerchant(expenses);

	return Object.values(groups)
		.sort((a, b) => b.amount - a.amount)
		.slice(0, limit)
		.map(group => ({
			name: group.name,
			amount: group.amount,
			count: group.count
		}));
};

/**
 * Get spending by category with merchant breakdown
 */
export const getCategoryWithMerchants = (expenses) => {
	const categories = {};

	expenses.forEach(expense => {
		const category = expense.category || 'Other';
		const merchant = normalizeMerchant(extractMerchant(expense.description)) || 'Other';

		if (!categories[category]) {
			categories[category] = {
				total: 0,
				merchants: {}
			};
		}

		categories[category].total += expense.amount;

		if (!categories[category].merchants[merchant]) {
			categories[category].merchants[merchant] = 0;
		}

		categories[category].merchants[merchant] += expense.amount;
	});

	return categories;
};

export default {
	extractMerchant,
	normalizeMerchant,
	groupExpensesByMerchant,
	getTopSpending,
	getCategoryWithMerchants
};
