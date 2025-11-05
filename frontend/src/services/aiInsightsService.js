/**
 * AI Financial Insights Service for Budgetly
 * Uses the same authentication system as other services
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api/v1';

// Use the same auth token system as the main API service
let authToken = null;

export const setAIInsightsAuthToken = (token) => {
	authToken = token;
};

const getAuthHeaders = () => {
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

class AIInsightsService {
	constructor(baseURL = API_BASE_URL) {
		this.baseURL = baseURL;
	}

	// Helper method for authenticated API calls
	async apiCall(endpoint, options = {}) {
		const headers = {
			...getAuthHeaders(),
			...options.headers
		};

		const response = await fetch(`${this.baseURL}${endpoint}`, {
			...options,
			headers
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Authentication required');
			}
			throw new Error(`API call failed: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	// Get comprehensive AI financial analysis
	async getFinancialAnalysis() {
		try {
			const result = await this.apiCall('/insights/financial-analysis');

			if (result.success) {
				return {
					success: true,
					insights: result.insights,
					metrics: result.metrics,
					aiServiceStatus: result.ai_service_status,
					modelUsed: result.model_used,
					generatedAt: result.generated_at
				};
			} else {
				return {
					success: false,
					error: result.error,
					message: result.message,
					suggestions: result.suggestions
				};
			}
		} catch (error) {
			console.error('Error fetching financial analysis:', error);
			throw error;
		}
	}

	// Get spending summary with budget analysis
	async getSpendingSummary() {
		try {
			const result = await this.apiCall('/insights/spending-summary');
			return result;
		} catch (error) {
			console.error('Error getting spending summary:', error);
			throw error;
		}
	}

	// Get detailed category analysis
	async getCategoryAnalysis() {
		try {
			const result = await this.apiCall('/insights/category-analysis');
			return result;
		} catch (error) {
			console.error('Error getting category analysis:', error);
			throw error;
		}
	}

	// Get spending trends over time
	async getSpendingTrends(months = 6) {
		try {
			const result = await this.apiCall(`/insights/trends?months=${months}`);
			return result;
		} catch (error) {
			console.error('Error getting spending trends:', error);
			throw error;
		}
	}

	// Get AI insights service configuration
	async getInsightsConfig() {
		try {
			const result = await this.apiCall('/insights/config');
			return result;
		} catch (error) {
			console.error('Error getting insights config:', error);
			throw error;
		}
	}

	// Chat with SavI financial advisor
	async chatWithAI(message, chatHistory = []) {
		try {
			const result = await this.apiCall('/ai/chat', {
				method: 'POST',
				body: JSON.stringify({
					message: message,
					chat_history: chatHistory
				})
			});
			return result;
		} catch (error) {
			console.error('Error chatting with AI:', error);
			throw error;
		}
	}

	// Get financial tips
	async getFinancialTips(category = null) {
		try {
			const endpoint = category ? `/ai/tips?category=${category}` : '/ai/tips';
			const result = await this.apiCall(endpoint);
			return result;
		} catch (error) {
			console.error('Error getting financial tips:', error);
			throw error;
		}
	}

	// Get all dashboard data in parallel
	async getDashboardData() {
		try {
			const [analysis, summary, categories, trends, config] = await Promise.all([
				this.getFinancialAnalysis().catch(e => ({ error: e.message })),
				this.getSpendingSummary().catch(e => ({ error: e.message })),
				this.getCategoryAnalysis().catch(e => ({ error: e.message })),
				this.getSpendingTrends().catch(e => ({ error: e.message })),
				this.getInsightsConfig().catch(e => ({ error: e.message }))
			]);

			return {
				financialAnalysis: analysis,
				spendingSummary: summary,
				categoryAnalysis: categories,
				spendingTrends: trends,
				config: config,
				fetchedAt: new Date().toISOString()
			};
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			throw error;
		}
	}
}

// Create singleton instance
const aiInsightsService = new AIInsightsService();

export default aiInsightsService;