import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Target,
	AlertCircle,
	CheckCircle,
	Lightbulb,
	PieChart,
	Activity
} from 'lucide-react';
import { useBudgetStore } from '../../store/budgetStore';
import { useIncomeStore } from '../../store/incomeStore';

const IncomeBudgetDashboard = () => {
	const { fetchIncomeBudgetAnalysis, fetchBudgetHealthScore } = useBudgetStore();
	const { fetchMonthlyAverageIncome } = useIncomeStore();

	const [analysis, setAnalysis] = useState(null);
	const [healthScore, setHealthScore] = useState(null);
	const [monthlyIncome, setMonthlyIncome] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			const [analysisData, healthData, incomeData] = await Promise.all([
				fetchIncomeBudgetAnalysis(),
				fetchBudgetHealthScore(),
				fetchMonthlyAverageIncome()
			]);

			console.log('Analysis Data:', analysisData);
			console.log('Health Data:', healthData);
			console.log('Income Data:', incomeData);

			setAnalysis(analysisData);
			setHealthScore(healthData);
			setMonthlyIncome(incomeData);
		} catch (error) {
			console.error('Error loading income budget data:', error);
		} finally {
			setLoading(false);
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-CA', {
			style: 'currency',
			currency: 'CAD',
		}).format(amount);
	};

	const getHealthColor = (score) => {
		if (score >= 80) return 'text-success-600';
		if (score >= 60) return 'text-warning-600';
		return 'text-danger-600';
	};

	const getHealthBgColor = (score) => {
		if (score >= 80) return 'bg-success-100';
		if (score >= 60) return 'bg-warning-100';
		return 'bg-danger-100';
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
				<p className="ml-3 text-gray-600">Loading income analysis...</p>
			</div>
		);
	}

	// Check if we have valid data
	const hasValidData = analysis?.success &&
		healthScore?.success &&
		analysis?.available_to_budget?.monthly_income > 0;

	if (!hasValidData) {
		return (
			<div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
				<div className="flex items-start">
					<AlertCircle className="h-6 w-6 text-warning-500 mr-3 flex-shrink-0" />
					<div>
						<h3 className="text-lg font-semibold text-warning-800 mb-2">
							No Income Data Available
						</h3>
						<p className="text-sm text-warning-700">
							Add income records to see personalized budget recommendations and analysis.
						</p>
						{analysis && !analysis.success && (
							<p className="text-xs text-warning-600 mt-2">
								Debug: {JSON.stringify(analysis)}
							</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	const { available_to_budget } = analysis;

	return (
		<div className="space-y-6">
			{/* Budget Health Score */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-white rounded-lg shadow-sm border p-6"
			>
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900 flex items-center">
						<Activity className="h-5 w-5 text-primary-600 mr-2" />
						Budget Health Score
					</h3>
					<button
						onClick={loadData}
						className="text-sm text-primary-600 hover:text-primary-700"
					>
						Refresh
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Score Display */}
					<div className="text-center">
						<div className={`text-6xl font-bold mb-2 ${getHealthColor(healthScore.score)}`}>
							{healthScore.score}
						</div>
						<div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getHealthBgColor(healthScore.score)} ${getHealthColor(healthScore.score)}`}>
							{healthScore.status}
						</div>

						{/* Progress Bar */}
						<div className="mt-4 w-full bg-gray-200 rounded-full h-3">
							<div
								className={`h-3 rounded-full transition-all ${healthScore.score >= 80 ? 'bg-success-500' : healthScore.score >= 60 ? 'bg-warning-500' : 'bg-danger-500'}`}
								style={{ width: `${healthScore.score}%` }}
							></div>
						</div>
					</div>

					{/* Issues and Strengths */}
					<div className="space-y-3">
						{healthScore.strengths && healthScore.strengths.length > 0 && (
							<div>
								<h4 className="text-sm font-semibold text-success-700 mb-2 flex items-center">
									<CheckCircle className="h-4 w-4 mr-1" />
									Strengths
								</h4>
								<ul className="space-y-1">
									{healthScore.strengths.map((strength, index) => (
										<li key={index} className="text-sm text-gray-700 flex items-start">
											<span className="text-success-500 mr-2">✓</span>
											{strength}
										</li>
									))}
								</ul>
							</div>
						)}

						{healthScore.issues && healthScore.issues.length > 0 && (
							<div>
								<h4 className="text-sm font-semibold text-danger-700 mb-2 flex items-center">
									<AlertCircle className="h-4 w-4 mr-1" />
									Areas to Improve
								</h4>
								<ul className="space-y-1">
									{healthScore.issues.map((issue, index) => (
										<li key={index} className="text-sm text-gray-700 flex items-start">
											<span className="text-danger-500 mr-2">!</span>
											{issue}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</motion.div>

			{/* Financial Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Monthly Income */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white rounded-lg shadow-sm border p-4"
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-600">Monthly Income</span>
						<DollarSign className="h-5 w-5 text-success-500" />
					</div>
					<div className="text-2xl font-bold text-gray-900">
						{formatCurrency(available_to_budget.monthly_income)}
					</div>
					{monthlyIncome && (
						<div className="mt-1 text-xs text-gray-500">
							Avg: {formatCurrency(monthlyIncome.average_monthly_income)}
						</div>
					)}
				</motion.div>

				{/* Total Budgeted */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-white rounded-lg shadow-sm border p-4"
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-600">Total Budgeted</span>
						<Target className="h-5 w-5 text-primary-500" />
					</div>
					<div className="text-2xl font-bold text-gray-900">
						{formatCurrency(available_to_budget.total_budgeted)}
					</div>
					<div className="mt-1 text-xs text-gray-500">
						{available_to_budget.budget_utilization.toFixed(1)}% of income
					</div>
				</motion.div>

				{/* Total Spent */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-white rounded-lg shadow-sm border p-4"
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-600">Total Spent</span>
						<TrendingDown className="h-5 w-5 text-danger-500" />
					</div>
					<div className="text-2xl font-bold text-gray-900">
						{formatCurrency(available_to_budget.total_spent)}
					</div>
					<div className="mt-1 text-xs text-gray-500">
						{available_to_budget.spending_rate.toFixed(1)}% of income
					</div>
				</motion.div>

				{/* Savings Potential */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-lg shadow-sm border p-4"
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-gray-600">Savings</span>
						<TrendingUp className={`h-5 w-5 ${available_to_budget.savings_potential >= 0 ? 'text-success-500' : 'text-danger-500'}`} />
					</div>
					<div className={`text-2xl font-bold ${available_to_budget.savings_potential >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
						{formatCurrency(available_to_budget.savings_potential)}
					</div>
					<div className="mt-1 text-xs text-gray-500">
						{available_to_budget.monthly_income > 0
							? `${(available_to_budget.savings_potential / available_to_budget.monthly_income * 100).toFixed(1)}% savings rate`
							: 'No income data'
						}
					</div>
				</motion.div>
			</div>

			{/* Budget Recommendations */}
			{analysis.recommendations && analysis.recommendations.recommendations && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Lightbulb className="h-5 w-5 text-warning-500 mr-2" />
						Budget Recommendations ({analysis.recommendations.rule})
					</h3>

					<div className="mb-4 p-4 bg-primary-50 rounded-lg">
						<div className="grid grid-cols-3 gap-4 text-center">
							<div>
								<div className="text-sm font-medium text-gray-600">Needs (50%)</div>
								<div className="text-xl font-bold text-primary-600">
									{formatCurrency(analysis.recommendations.needs_allocation)}
								</div>
							</div>
							<div>
								<div className="text-sm font-medium text-gray-600">Wants (30%)</div>
								<div className="text-xl font-bold text-primary-600">
									{formatCurrency(analysis.recommendations.wants_allocation)}
								</div>
							</div>
							<div>
								<div className="text-sm font-medium text-gray-600">Savings (20%)</div>
								<div className="text-xl font-bold text-success-600">
									{formatCurrency(analysis.recommendations.savings_allocation)}
								</div>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{analysis.recommendations.recommendations.map((rec, index) => (
							<div
								key={index}
								className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
							>
								<div className="flex items-center justify-between mb-2">
									<h4 className="font-semibold text-gray-900">{rec.category}</h4>
									<span className={`text-xs px-2 py-1 rounded-full ${rec.priority === 'high' ? 'bg-danger-100 text-danger-700' :
										rec.priority === 'medium' ? 'bg-warning-100 text-warning-700' :
											'bg-gray-100 text-gray-700'
										}`}>
										{rec.priority}
									</span>
								</div>
								<div className="text-2xl font-bold text-primary-600 mb-1">
									{formatCurrency(rec.suggested_amount)}
								</div>
								<div className="text-xs text-gray-500">
									{rec.percentage_of_income}% of income • {rec.type}
								</div>
							</div>
						))}
					</div>
				</motion.div>
			)}

			{/* Spending vs Income Trend */}
			{analysis.spending_analysis && analysis.spending_analysis.monthly_breakdown && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<PieChart className="h-5 w-5 text-primary-600 mr-2" />
						Spending vs Income Trend
					</h3>

					<div className="space-y-3">
						{analysis.spending_analysis.monthly_breakdown.slice(0, 6).map((month, index) => (
							<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
								<div className="flex-1">
									<div className="text-sm font-medium text-gray-900">{month.month}</div>
									<div className="text-xs text-gray-500">
										Income: {formatCurrency(month.income)} | Expenses: {formatCurrency(month.expenses)}
									</div>
								</div>
								<div className="text-right">
									<div className={`text-sm font-semibold ${month.savings >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
										{formatCurrency(month.savings)}
									</div>
									<div className="text-xs text-gray-500">
										{month.savings_rate.toFixed(1)}% savings
									</div>
								</div>
							</div>
						))}
					</div>

					{analysis.spending_analysis.trend && (
						<div className="mt-4 p-3 bg-primary-50 rounded-lg">
							<div className="text-sm text-primary-700">
								<strong>Trend:</strong> Your savings rate is{' '}
								<span className="font-semibold">
									{analysis.spending_analysis.trend}
								</span>
								{' '}(Avg: {analysis.spending_analysis.average_savings_rate.toFixed(1)}%)
							</div>
						</div>
					)}
				</motion.div>
			)}
		</div>
	);
};

export default IncomeBudgetDashboard;
