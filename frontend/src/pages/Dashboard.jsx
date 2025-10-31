import { useEffect } from "react";
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
import MainLayout from "../components/layout/MainLayout";

const Dashboard = () => {
	const { user } = useAuthStore();
	const { expenses, fetchExpenses } = useExpenseStore();
	const { income, fetchIncome } = useIncomeStore();
	const { budgets, fetchBudgets, getBudgetProgress } = useBudgetStore();

	useEffect(() => {
		fetchExpenses();
		fetchIncome();
		fetchBudgets();
	}, [fetchExpenses, fetchIncome, fetchBudgets]);

	// Debug logging for data
	console.log('Dashboard Data Debug:', {
		expensesCount: expenses.length,
		budgetsCount: budgets.length,
		expenses: expenses.map(e => ({
			id: e.id,
			category: e.category,
			amount: e.amount,
			date: e.date,
			description: e.description
		})),
		budgets: budgets.map(b => ({
			id: b.id,
			category: b.category,
			amount: b.amount,
			period: b.period
		}))
	});

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

	// Get budget alerts
	const budgetAlerts = budgets
		.map(budget => {
			const progress = getBudgetProgress(budget.id, expenses);
			const percentage = (progress.spent / budget.amount) * 100;
			return { ...budget, progress, percentage };
		})
		.filter(budget => budget.percentage >= 90)
		.sort((a, b) => b.percentage - a.percentage);

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	return (
		<MainLayout>
			<div className="space-y-6">
				{/* Welcome Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Welcome back, {user?.first_name || 'User'}!
						</h1>
					</div>
				</div>

				{/* Budget Alerts */}
				{/* {budgetAlerts.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-red-50 border border-red-200 rounded-lg p-4"
					>
						<div className="flex items-center space-x-2 text-red-800 mb-2">
							<AlertTriangle className="h-5 w-5" />
							<h3 className="font-medium">Budget Alert</h3>
						</div>
						<div className="space-y-1">
							{budgetAlerts.slice(0, 2).map(budget => (
								<p key={budget.id} className="text-red-700 text-sm">
									<span className="font-medium">{budget.category}</span>: {budget.percentage >= 100 ? 'Exceeded' : `${budget.percentage.toFixed(0)}% used`}
								</p>
							))}
							{budgetAlerts.length > 2 && (
								<Link to="/budget" className="text-red-600 text-sm hover:underline">
									View all {budgetAlerts.length} alerts →
								</Link>
							)}
						</div>
					</motion.div>
				)} */}

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
								<p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-full">
								<ArrowUpRight className="h-6 w-6 text-green-600" />
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
								<p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</p>
							</div>
							<div className="p-3 bg-red-100 rounded-full">
								<ArrowDownRight className="h-6 w-6 text-red-600" />
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
								<p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
									{formatCurrency(netIncome)}
								</p>
							</div>
							<div className={`p-3 rounded-full ${netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
								{netIncome >= 0 ?
									<TrendingUp className="h-6 w-6 text-green-600" /> :
									<TrendingDown className="h-6 w-6 text-red-600" />
								}
							</div>
						</div>
					</motion.div>
				</div>

				{/* Quick Actions */}
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						<Link to="/expenses">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors group"
							>
								<div className="flex flex-col items-center space-y-2">
									<div className="p-2 bg-red-100 group-hover:bg-red-200 rounded-full">
										<Plus className="h-5 w-5 text-red-600" />
									</div>
									<span className="text-sm font-medium text-red-700">Add Expense</span>
								</div>
							</motion.button>
						</Link>

						<Link to="/income">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors group"
							>
								<div className="flex flex-col items-center space-y-2">
									<div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-full">
										<DollarSign className="h-5 w-5 text-green-600" />
									</div>
									<span className="text-sm font-medium text-green-700">Add Income</span>
								</div>
							</motion.button>
						</Link>

						<Link to="/budget">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
							>
								<div className="flex flex-col items-center space-y-2">
									<div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-full">
										<Target className="h-5 w-5 text-blue-600" />
									</div>
									<span className="text-sm font-medium text-blue-700">Set Budget</span>
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
							<Link to="/expenses" className="text-blue-600 text-sm hover:underline">View all</Link>
						</div>
						<div className="space-y-3">
							{expenses.slice(0, 3).map((expense) => (
								<div key={expense.id} className="flex items-center justify-between py-2">
									<div>
										<p className="text-sm font-medium text-gray-900">{expense.description}</p>
										<p className="text-xs text-gray-500">{expense.category}</p>
									</div>
									<span className="text-sm font-semibold text-red-600">-{formatCurrency(expense.amount)}</span>
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
							<Link to="/budget" className="text-blue-600 text-sm hover:underline">View all</Link>
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
														<span className="text-xs font-medium text-red-600">
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
												className={`h-2 rounded-full transition-all duration-300 ${percentage >= 100 ? 'bg-red-500' :
													percentage >= 90 ? 'bg-orange-500' :
														percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
													}`}
												style={{ width: `${Math.min(percentage, 100)}%` }}
											></div>
											{isOverBudget && (
												<div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse"></div>
											)}
										</div>
										{isOverBudget && (
											<div className="flex items-center text-xs text-red-600">
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
		</MainLayout>
	);
};

export default Dashboard;