import { useState, useEffect } from 'react';
import {
	Heart,
	Lightbulb,
	Search,
	Rocket,
	ArrowRight,
	Wand2,
	AlertTriangle,
	RefreshCw,
	TrendingUp
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import aiInsightsService from '../../services/aiInsightsService';
import AIChat from '../../components/AIChat/AIChat';
import './AIInsights.css';

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
		<div className="bg-white rounded-lg shadow-lg p-8 animate-pulse">
			<div className="h-6 bg-gray-200 rounded w-40 mb-6 mx-auto"></div>
			<div className="h-20 bg-gray-200 rounded mb-6"></div>
			<div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
		</div>
	);

	// Financial Health Card Component
	const FinancialHealthCard = ({ healthData }) => {
		if (loading) return <LoadingCard />;

		if (!healthData) {
			return (
				<div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500 transform transition-all duration-300 hover:shadow-xl">
					<Heart size={64} className="text-gray-300 mb-6 mx-auto animate-pulse" />
					<h3 className="text-xl font-semibold text-gray-800 mb-4">Financial Health Score</h3>
					<p className="text-gray-500">No data available yet</p>
					<p className="text-sm text-gray-400 mt-2">Add expenses to see your health score</p>
				</div>
			);
		}

		const getHealthColor = (score) => {
			if (score >= 80) return 'text-green-600';
			if (score >= 60) return 'text-yellow-600';
			return 'text-red-600';
		};

		const getHealthBgColor = (score) => {
			if (score >= 80) return 'from-green-400 to-green-600';
			if (score >= 60) return 'from-yellow-400 to-yellow-600';
			return 'from-red-400 to-red-600';
		};

		return (
			<div className="bg-white rounded-lg shadow-lg p-8 text-center insight-card">
				<h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
					<Heart size={24} className="text-red-500 mr-3 float" />
					Financial Health Score
				</h3>

				<div className="relative mb-6">
					<div className={`text-7xl font-bold mb-4 bg-gradient-to-r ${getHealthBgColor(healthData.score)} bg-clip-text text-transparent`}>
						{healthData.score || '--'}
					</div>

					<div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
						<div
							className={`h-4 rounded-full health-progress bg-gradient-to-r ${getHealthBgColor(healthData.score)}`}
							style={{ width: `${healthData.score || 0}%` }}
						></div>
					</div>

					<span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getHealthColor(healthData.score)} bg-opacity-10 ${healthData.score >= 80 ? 'bg-green-100' : healthData.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
						{healthData.status || 'Unknown'}
					</span>
				</div>

				{healthData.summary && (
					<p className="text-gray-600 leading-relaxed">
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
			<div className="bg-white rounded-lg shadow-lg p-8 insight-card">
				<h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
					<Lightbulb size={24} className="text-yellow-500 mr-3 float" />
					Key Insights
				</h3>

				{insights && insights.length > 0 ? (
					<div className="space-y-4">
						{insights.map((insight, index) => (
							<div
								key={index}
								className="group p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500 transform transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
							>
								<div className="flex items-start space-x-4">
									<span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
										{index + 1}
									</span>
									<p className="text-gray-700 leading-relaxed flex-1 group-hover:text-gray-800 transition-colors">
										{insight}
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center text-gray-500 py-12">
						<div className="animate-pulse">
							<Search size={64} className="text-gray-300 mb-6 mx-auto" />
						</div>
						<h4 className="text-lg font-medium text-gray-600 mb-2">No insights available yet</h4>
						<p className="text-sm text-gray-400">Add more financial data to get personalized insights</p>
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
				case 'high': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
				case 'medium': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200';
				case 'low': return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200';
				default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200';
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
			<div className="bg-white rounded-lg shadow-lg p-8 insight-card">
				<h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
					<Rocket size={24} className="text-green-500 mr-3 float" />
					AI Recommendations
				</h3>

				{recommendations && recommendations.length > 0 ? (
					<div className="space-y-6">
						{recommendations.map((rec, index) => (
							<div
								key={index}
								className="group p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
							>
								<h4 className="font-semibold text-gray-800 mb-3 flex items-center text-lg">
									<ArrowRight size={18} className="text-green-500 mr-3 group-hover:translate-x-1 transition-transform" />
									{rec.title || 'Smart Recommendation'}
								</h4>
								<p className="text-gray-700 mb-4 leading-relaxed">
									{rec.description || 'AI-powered suggestion to optimize your finances'}
								</p>
								<div className="flex justify-between items-center">
									<span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getImpactColor(rec.impact)}`}>
										<span className="mr-2">{getImpactIcon(rec.impact)}</span>
										{rec.impact || 'Medium'} Impact
									</span>
									{rec.savings_potential && (
										<span className="text-green-600 font-bold text-lg">
											💰 {rec.savings_potential}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center text-gray-500 py-12">
						<div className="animate-bounce">
							<Wand2 size={64} className="text-gray-300 mb-6 mx-auto" />
						</div>
						<h4 className="text-lg font-medium text-gray-600 mb-2">No recommendations yet</h4>
						<p className="text-sm text-gray-400">AI will provide personalized recommendations based on your spending patterns</p>
					</div>
				)}
			</div>
		);
	};

	if (error) {
		return (
			<MainLayout>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertTriangle size={48} className="text-red-500 mb-4 mx-auto" />
					<h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load AI Insights</h2>
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={handleRefresh}
						className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
					>
						<RefreshCw size={16} className="mr-2" />
						Try Again
					</button>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
				<div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
					{/* Header */}
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
							<TrendingUp size={32} className="text-blue-500 mr-4" />
							AI Financial Insights
						</h1>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							Powered by artificial intelligence to help you make smarter financial decisions
						</p>

						<div className="flex items-center justify-center space-x-4 mt-6">
							{/* AI Service Status */}
							<div className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm ${aiServiceStatus === 'enabled'
								? 'bg-green-100 text-green-800 border border-green-200'
								: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
								}`}>
								🤖 {aiServiceStatus === 'enabled' ? 'AI Active' : 'Fallback Mode'}
							</div>

							<button
								onClick={handleRefresh}
								disabled={loading}
								className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-full transition-all duration-300 flex items-center shadow-md hover:shadow-lg transform hover:scale-105"
							>
								<RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
								Refresh Insights
							</button>
						</div>
					</div>

					{/* Show insufficient data message if needed */}
					{dashboardData?.financialAnalysis && !dashboardData.financialAnalysis.success && (
						<div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
							<AlertTriangle size={64} className="text-yellow-500 mb-6 mx-auto animate-pulse" />
							<h3 className="text-2xl font-semibold text-yellow-800 mb-4">
								{dashboardData.financialAnalysis.error || 'Getting Started'}
							</h3>
							<p className="text-yellow-700 mb-6 text-lg">
								{dashboardData.financialAnalysis.message || 'Add some financial data to unlock AI-powered insights.'}
							</p>
							{dashboardData.financialAnalysis.suggestions && (
								<div className="bg-white bg-opacity-50 rounded-lg p-4 max-w-md mx-auto">
									<ul className="text-yellow-700 space-y-2">
										{dashboardData.financialAnalysis.suggestions.map((suggestion, index) => (
											<li key={index} className="flex items-center">
												<span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
												{suggestion}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}

					{/* Main Content Grid */}
					<div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 fade-in">
						{/* Health Score - Full width on mobile, 1 column on desktop */}
						<div className="xl:col-span-1">
							<FinancialHealthCard
								healthData={dashboardData?.financialAnalysis?.success ?
									dashboardData?.financialAnalysis?.insights?.financial_health :
									null}
							/>
						</div>

						{/* Key Insights and Recommendations - 2 columns on desktop */}
						<div className="xl:col-span-2 space-y-8">
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
				</div>
			</div>

			{/* AI Chat Component */}
			<AIChat />
		</MainLayout>
	);
};

export default AIInsights;