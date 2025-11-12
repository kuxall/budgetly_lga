import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
	TrendingUp,
	TrendingDown,
	Target,
	Plus,
	DollarSign,
	AlertTriangle,
	ArrowUpRight,
	ArrowDownRight,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useExpenseStore } from "../store/expenseStore";
import { useIncomeStore } from "../store/incomeStore";
import { useBudgetStore } from "../store/budgetStore";

const Dashboard = () => {
	const { user } = useAuthStore();
	const { expenses, fetchExpenses } = useExpenseStore();
	const { income, fetchIncome, fetchMonthlyAverageIncome } = useIncomeStore();
	const { budgets, fetchBudgets, getBudgetProgress, fetchBudgetHealthScore } = useBudgetStore();

	const [monthlyIncomeData, setMonthlyIncomeData] = useState(null);
	const [budgetHealth, setBudgetHealth] = useState(null);

	useEffect(() => {
		fetchExpenses();
		fetchIncome();
		fetchBudgets();
		loadIncomeData();
	}, [fetchExpenses, fetchIncome, fetchBudgets]);

	const loadIncomeData = async () => {
		try {
			const [incomeData, healthData] = await Promise.all([
				fetchMonthlyAverageIncome(),
				fetchBudgetHealthScore()
			]);
			setMonthlyIncomeData(incomeData);
			setBudgetHealth(healthData);
		} catch (error) {
			console.error('Error loading income data:', error);
		}
	};


	// Calculate current month totals
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	const monthlyExpenses = expenses
		.filter(expense => {
			const expenseDate = new Date(expense.date);
			return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
		})
		.reduce((total, expense) => total + expense.amount, 0);

	const monthlyIncome = income
		.filter(inc => {
			const incomeDate = new Date(inc.date);
			return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
		})
		.reduce((total, inc) => total + inc.amount, 0);

	const netIncome = monthlyIncome - monthlyExpenses;


	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	return (
		<div className="space-y-6">
			{/* Welcome Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Welcome back, {user?.first_name || 'User'}!
					</h1>
				</div>
			</div>


			{/* Financial Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Monthly Income */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Monthly Income</p>
							<p className="text-2xl font-bold text-success-600">{formatCurrency(monthlyIncome)}</p>
						</div>
						<div className="p-3 bg-success-100 rounded-full">
							<ArrowUpRight className="h-6 w-6 text-success-600" />
						</div>
					</div>
				</motion.div>

				{/* Monthly Expenses */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
							<p className="text-2xl font-bold text-danger-600">{formatCurrency(monthlyExpenses)}</p>
						</div>
						<div className="p-3 bg-danger-100 rounded-full">
							<ArrowDownRight className="h-6 w-6 text-danger-600" />
						</div>
					</div>
				</motion.div>

				{/* Net Income */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Net Income</p>
							<p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
								{formatCurrency(netIncome)}
							</p>
						</div>
						<div className={`p-3 rounded-full ${netIncome >= 0 ? 'bg-success-100' : 'bg-danger-100'}`}>
							{netIncome >= 0 ?
								<TrendingUp className="h-6 w-6 text-success-600" /> :
								<TrendingDown className="h-6 w-6 text-danger-600" />
							}
						</div>
					</div>
				</motion.div>
			</div>

			{/* Budget Health Score */}
			{budgetHealth && monthlyIncome > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-lg shadow-sm border p-6"
				>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-gray-900">Budget Health</h2>
						<Link to="/budgets" className="text-primary-600 text-sm hover:underline">
							View Details
						</Link>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Health Score */}
						<div className="text-center">
							<div className={`text-4xl font-bold mb-2 ${budgetHealth.score >= 80 ? 'text-success-600' :
								budgetHealth.score >= 60 ? 'text-warning-600' :
									'text-danger-600'
								}`}>
								{budgetHealth.score}
							</div>
							<div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${budgetHealth.score >= 80 ? 'bg-success-100 text-success-700' :
								budgetHealth.score >= 60 ? 'bg-warning-100 text-warning-700' :
									'bg-danger-100 text-danger-700'
								}`}>
								{budgetHealth.status}
							</div>
						</div>

						{/* Strengths */}
						{budgetHealth.strengths && budgetHealth.strengths.length > 0 && (
							<div className="col-span-2">
								<h4 className="text-sm font-semibold text-gray-700 mb-2">Key Insights</h4>
								<ul className="space-y-1">
									{budgetHealth.strengths.slice(0, 2).map((strength, index) => (
										<li key={index} className="text-sm text-gray-600 flex items-start">
											<span className="text-success-500 mr-2">✓</span>
											{strength}
										</li>
									))}
									{budgetHealth.issues && budgetHealth.issues.slice(0, 1).map((issue, index) => (
										<li key={index} className="text-sm text-gray-600 flex items-start">
											<span className="text-warning-500 mr-2">!</span>
											{issue}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</motion.div>
			)}

			{/* Quick Actions */}
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<Link to="/expenses">
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full p-4 bg-danger-50 hover:bg-danger-100 rounded-lg border border-danger-200 transition-colors group"
						>
							<div className="flex flex-col items-center space-y-2">
								<div className="p-2 bg-danger-100 group-hover:bg-danger-200 rounded-full">
									<Plus className="h-5 w-5 text-danger-600" />
								</div>
								<span className="text-sm font-medium text-danger-700">Add Expense</span>
							</div>
						</motion.button>
					</Link>

					<Link to="/income">
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full p-4 bg-success-50 hover:bg-success-100 rounded-lg border border-success-200 transition-colors group"
						>
							<div className="flex flex-col items-center space-y-2">
								<div className="p-2 bg-success-100 group-hover:bg-success-200 rounded-full">
									<DollarSign className="h-5 w-5 text-success-600" />
								</div>
								<span className="text-sm font-medium text-success-700">Add Income</span>
							</div>
						</motion.button>
					</Link>

					<Link to="/budget">
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full p-4 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors group"
						>
							<div className="flex flex-col items-center space-y-2">
								<div className="p-2 bg-primary-100 group-hover:bg-primary-200 rounded-full">
									<Target className="h-5 w-5 text-primary-600" />
								</div>
								<span className="text-sm font-medium text-primary-700">Set Budget</span>
							</div>
						</motion.button>
					</Link>


				</div>
			</div>

			{/* Recent Activity */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Expenses */}
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
						<Link to="/expenses" className="text-primary-600 text-sm hover:underline">View all</Link>
					</div>
					<div className="space-y-3">
						{expenses.slice(0, 3).map((expense) => (
							<div key={expense.id} className="flex items-center justify-between py-2">
								<div>
									<p className="text-sm font-medium text-gray-900">{expense.description}</p>
									<p className="text-xs text-gray-500">{expense.category}</p>
								</div>
								<span className="text-sm font-semibold text-danger-600">-{formatCurrency(expense.amount)}</span>
							</div>
						))}
						{expenses.length === 0 && (
							<p className="text-gray-500 text-sm text-center py-4">No expenses yet</p>
						)}
					</div>
				</div>

				{/* Budget Status */}
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">Budget Status</h3>
						<Link to="/budget" className="text-primary-600 text-sm hover:underline">View all</Link>
					</div>
					<div className="space-y-4">
						{budgets.slice(0, 3).map((budget) => {
							const progress = getBudgetProgress(budget.id, expenses);
							const percentage = (progress.spent / budget.amount) * 100;
							const isOverBudget = percentage > 100;
							const overspent = progress.spent - budget.amount;



							return (
								<div key={budget.id} className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-gray-900">{budget.category}</span>
										<div className="text-right">
											{isOverBudget ? (
												<div>
													<span className="text-xs font-medium text-danger-600">
														Over by {formatCurrency(overspent)}
													</span>
													<div className="text-xs text-gray-500">
														{formatCurrency(progress.spent)} / {formatCurrency(budget.amount)}
													</div>
												</div>
											) : (
												<div>
													<span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
													<div className="text-xs text-gray-400">
														{formatCurrency(progress.remaining)} left
													</div>
												</div>
											)}
										</div>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
										<div
											className={`h-2 rounded-full transition-all duration-300 ${percentage >= 100 ? 'bg-danger-500' :
												percentage >= 90 ? 'bg-warning-500' :
													percentage >= 75 ? 'bg-warning-400' : 'bg-success-500'
												}`}
											style={{ width: `${Math.min(percentage, 100)}%` }}
										></div>
										{isOverBudget && (
											<div className="absolute inset-0 bg-danger-500 opacity-20 animate-pulse"></div>
										)}
									</div>
									{isOverBudget && (
										<div className="flex items-center text-xs text-danger-600">
											<AlertTriangle className="h-3 w-3 mr-1" />
											<span>Budget exceeded</span>
										</div>
									)}
								</div>
							);
						})}
						{budgets.length === 0 && (
							<p className="text-gray-500 text-sm text-center py-4">No budgets set</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;