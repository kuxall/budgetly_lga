/**
 * Helper utilities for standardizing expense descriptions
 * Automatically extracts merchant names for consistent tracking
 */

/**
 * Extract clean merchant name from user input
 * Automatically converts long descriptions to just merchant name
 * 
 * Examples:
 * - "Grocery shopping at Walmart" -> "Walmart"
 * - "lunch from McDonald's" -> "McDonald's"
 * - "Starbucks - morning coffee" -> "Starbucks"
 * - "walmart groceries" -> "Walmart"
 */
export const extractMerchantName = (input) => {
	if (!input || typeof input !== 'string') {
		return '';
	}

	let merchant = input.trim();

	// Pattern 1: "Something at Merchant" -> "Merchant"
	const atMatch = merchant.match(/\s+at\s+([A-Za-z0-9\s'&.-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
	if (atMatch && atMatch[1]) {
		merchant = atMatch[1].trim();
	}
	// Pattern 2: "Something from Merchant" -> "Merchant"
	else {
		const fromMatch = merchant.match(/\s+from\s+([A-Za-z0-9\s'&.-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
		if (fromMatch && fromMatch[1]) {
			merchant = fromMatch[1].trim();
		}
		// Pattern 3: "Merchant - Something" or "Merchant: Something" -> "Merchant"
		else {
			const prefixMatch = merchant.match(/^([A-Za-z0-9\s'&.-]+?)(?:\s*[-:]\s+)/);
			if (prefixMatch && prefixMatch[1]) {
				merchant = prefixMatch[1].trim();
			}
		}
	}

	// Remove generic words from the beginning
	merchant = merchant.replace(/^(grocery|groceries|lunch|dinner|breakfast|brunch|coffee|food|shopping|purchase|payment|bill|expense)\s+/i, '');

	// Remove "at" or "from" if still present
	merchant = merchant.replace(/\s+(at|from)\s+/gi, ' ').trim();

	// Limit to first 2-3 words (merchant names are usually short)
	const words = merchant.split(/\s+/);
	if (words.length > 3) {
		merchant = words.slice(0, 3).join(' ');
	}

	// Capitalize properly (Title Case)
	merchant = merchant
		.split(' ')
		.map(word => {
			// Keep acronyms uppercase
			if (word.length <= 3 && word === word.toUpperCase()) {
				return word;
			}
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');

	return merchant;
};

/**
 * Auto-format description before saving
 * This is the main function to use when creating/updating expenses
 */
export const formatDescriptionForSave = (description) => {
	const merchant = extractMerchantName(description);
	return merchant || description.trim();
};

export default {
	extractMerchantName,
	formatDescriptionForSave
};
