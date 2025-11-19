import { useState, useEffect } from 'react';
import {
	Heart,
	Lightbulb,
	Search,
	Rocket,
	ArrowRight,
	Wand2,
	AlertTriangle,
	RefreshCw
} from 'lucide-react';
import aiInsightsService from '../../services/aiInsightsService';
import AIChat from '../../components/AIChat/AIChat';

const AIInsights = () => {
	const [dashboardData, setDashboardData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [aiServiceStatus, setAiServiceStatus] = useState('unknown');

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);

			const data = await aiInsightsService.getDashboardData();
			setDashboardData(data);

			// Set AI service status
			if (data.config && data.config.ai_service) {
				setAiServiceStatus(data.config.ai_service.enabled ? 'enabled' : 'fallback');
			}

		} catch (err) {
			console.error('Error loading dashboard data:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = () => {
		loadDashboardData();
	};

	// Loading Component
	const LoadingCard = () => (
		<div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
			<div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
			<div className="h-16 bg-gray-200 rounded mb-4"></div>
			<div className="h-4 bg-gray-200 rounded w-24"></div>
		</div>
	);

	// Financial Health Card Component
	const FinancialHealthCard = ({ healthData }) => {
		if (loading) return <LoadingCard />;

		if (!healthData) {
			return (
				<div className="bg-white rounded-lg shadow-sm border p-6 text-center">
					<Heart size={48} className="text-gray-300 mb-4 mx-auto" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">Financial Health Score</h3>
					<p className="text-sm text-gray-500">No data available yet</p>
					<p className="text-xs text-gray-400 mt-1">Add expenses to see your health score</p>
				</div>
			);
		}

		const getHealthColor = (score) => {
			if (score >= 80) return 'text-success-600';
			if (score >= 60) return 'text-warning-600';
			return 'text-danger-600';
		};

		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
					<Heart size={20} className="text-danger-500 mr-2" />
					Financial Health Score
				</h3>

				<div className="text-center mb-4">
					<div className={`text-5xl font-bold mb-3 ${getHealthColor(healthData.score)}`}>
						{healthData.score || '--'}
					</div>

					<div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
						<div
							className={`h-3 rounded-full transition-all ${healthData.score >= 80 ? 'bg-success-500' : healthData.score >= 60 ? 'bg-warning-500' : 'bg-danger-500'}`}
							style={{ width: `${healthData.score || 0}%` }}
						></div>
					</div>

					<span className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${healthData.score >= 80 ? 'bg-success-100 text-success-800' : healthData.score >= 60 ? 'bg-warning-100 text-warning-800' : 'bg-danger-100 text-danger-800'}`}>
						{healthData.status || 'Unknown'}
					</span>
				</div>

				{healthData.summary && (
					<p className="text-sm text-gray-600 text-center">
						{healthData.summary}
					</p>
				)}
			</div>
		);
	};

	// Key Insights Component
	const KeyInsights = ({ insights }) => {
		if (loading) return <LoadingCard />;

		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
					<Lightbulb size={20} className="text-warning-500 mr-2" />
					Key Insights
				</h3>

				{insights && insights.length > 0 ? (
					<div className="space-y-3">
						{insights.map((insight, index) => (
							<div
								key={index}
								className="p-3 bg-primary-50 rounded-lg border-l-4 border-primary-500"
							>
								<div className="flex items-start space-x-3">
									<span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
										{index + 1}
									</span>
									<p className="text-sm text-gray-700 flex-1">
										{insight}
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center text-gray-500 py-8">
						<Search size={48} className="text-gray-300 mb-3 mx-auto" />
						<p className="text-sm font-medium text-gray-600 mb-1">No insights available yet</p>
						<p className="text-xs text-gray-400">Add more financial data to get personalized insights</p>
					</div>
				)}
			</div>
		);
	};

	// Recommendations Component
	const Recommendations = ({ recommendations }) => {
		if (loading) return <LoadingCard />;

		const getImpactColor = (impact) => {
			switch (impact?.toLowerCase()) {
				case 'high': return 'bg-success-100 text-success-800';
				case 'medium': return 'bg-warning-100 text-warning-800';
				case 'low': return 'bg-primary-100 text-primary-800';
				default: return 'bg-gray-100 text-gray-800';
			}
		};

		const getImpactIcon = (impact) => {
			switch (impact?.toLowerCase()) {
				case 'high': return '🚀';
				case 'medium': return '⚡';
				case 'low': return '💡';
				default: return '📊';
			}
		};

		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
					<Rocket size={20} className="text-success-500 mr-2" />
					AI Recommendations
				</h3>

				{recommendations && recommendations.length > 0 ? (
					<div className="space-y-4">
						{recommendations.map((rec, index) => (
							<div
								key={index}
								className="p-4 bg-success-50 rounded-lg border-l-4 border-success-500"
							>
								<h4 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
									<ArrowRight size={16} className="text-success-500 mr-2" />
									{rec.title || 'Smart Recommendation'}
								</h4>
								<p className="text-sm text-gray-700 mb-3">
									{rec.description || 'AI-powered suggestion to optimize your finances'}
								</p>
								<div className="flex justify-between items-center">
									<span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${getImpactColor(rec.impact)}`}>
										<span className="mr-1">{getImpactIcon(rec.impact)}</span>
										{rec.impact || 'Medium'} Impact
									</span>
									{rec.savings_potential && (
										<span className="text-success-600 font-semibold text-sm">
											{rec.savings_potential}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center text-gray-500 py-8">
						<Wand2 size={48} className="text-gray-300 mb-3 mx-auto" />
						<p className="text-sm font-medium text-gray-600 mb-1">No recommendations yet</p>
						<p className="text-xs text-gray-400">AI will provide personalized recommendations based on your spending patterns</p>
					</div>
				)}
			</div>
		);
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-gray-900">AI Financial Insights</h1>
				</div>
				<div className="bg-danger-50 border border-danger-200 rounded-lg p-6">
					<div className="flex items-start">
						<AlertTriangle size={24} className="text-danger-500 mr-3 flex-shrink-0 mt-1" />
						<div>
							<h2 className="text-lg font-semibold text-danger-800 mb-2">Unable to Load AI Insights</h2>
							<p className="text-sm text-danger-600 mb-3">{error}</p>
							<button
								onClick={handleRefresh}
								className="bg-danger-600 hover:bg-danger-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center"
							>
								<RefreshCw size={16} className="mr-2" />
								Try Again
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">AI Financial Insights</h1>
					<p className="text-sm text-gray-600 mt-1">
						AI-powered analysis to help you make smarter financial decisions
					</p>
				</div>
				<div className="flex items-center space-x-3">
					{/* AI Service Status */}
					<div className={`px-3 py-1 rounded-md text-xs font-medium ${aiServiceStatus === 'enabled'
						? 'bg-success-100 text-success-800'
						: 'bg-warning-100 text-warning-800'
						}`}>
						{aiServiceStatus === 'enabled' ? 'AI Active' : 'Fallback Mode'}
					</div>

					<button
						onClick={handleRefresh}
						disabled={loading}
						className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
					>
						<RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Show insufficient data message if needed */}
			{dashboardData?.financialAnalysis && !dashboardData.financialAnalysis.success && (
				<div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
					<div className="flex items-start">
						<AlertTriangle size={24} className="text-warning-500 mr-3 flex-shrink-0 mt-1" />
						<div>
							<h3 className="text-lg font-semibold text-warning-800 mb-2">
								{dashboardData.financialAnalysis.error || 'Getting Started'}
							</h3>
							<p className="text-sm text-warning-700 mb-3">
								{dashboardData.financialAnalysis.message || 'Add some financial data to unlock AI-powered insights.'}
							</p>
							{dashboardData.financialAnalysis.suggestions && (
								<ul className="text-warning-700 space-y-1 text-sm">
									{dashboardData.financialAnalysis.suggestions.map((suggestion, index) => (
										<li key={index} className="flex items-center">
											<span className="w-1.5 h-1.5 bg-warning-500 rounded-full mr-2"></span>
											{suggestion}
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				{/* Health Score */}
				<div className="xl:col-span-1">
					<FinancialHealthCard
						healthData={dashboardData?.financialAnalysis?.success ?
							dashboardData?.financialAnalysis?.insights?.financial_health :
							null}
					/>
				</div>

				{/* Key Insights and Recommendations */}
				<div className="xl:col-span-2 space-y-6">
					<KeyInsights
						insights={dashboardData?.financialAnalysis?.success ?
							dashboardData?.financialAnalysis?.insights?.key_insights :
							null}
					/>
					<Recommendations
						recommendations={dashboardData?.financialAnalysis?.success ?
							dashboardData?.financialAnalysis?.insights?.recommendations :
							null}
					/>
				</div>
			</div>

			{/* AI Chat Component */}
			<AIChat />
		</div>
	);
};

export default AIInsights;