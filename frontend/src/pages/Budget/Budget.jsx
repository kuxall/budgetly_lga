import { useState, useEffect } from "react";
import { useBudgetStore } from "../../store/budgetStore";
import { useExpenseStore } from "../../store/expenseStore";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";

const Budget = () => {
	const {
		budgets,
		isLoading,
		isSubmitting,
		fetchBudgets,
		createBudget,
		getTotalBudget,
		getBudgetProgress,
	} = useBudgetStore();

	const { expenses, fetchExpenses } = useExpenseStore();

	const [formData, setFormData] = useState({
		category: "Food & Dining",
		amount: "",
		period: "monthly",
		description: "",
	});

	useEffect(() => {
		fetchBudgets();
		fetchExpenses();
	}, [fetchBudgets, fetchExpenses]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.category || !formData.amount) {
			alert("Please fill in category and amount");
			return;
		}

		try {
			await createBudget({
				...formData,
				amount: parseFloat(formData.amount),
			});

			// Reset form
			setFormData({
				category: "Food & Dining",
				amount: "",
				period: "monthly",
				description: "",
			});
		} catch (error) {
			console.error("Failed to create budget:", error);
		}
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	// Delete functionality disabled for now - focusing on creation and tracking

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	const getProgressColor = (percentage) => {
		if (percentage >= 90) return "bg-red-500";
		if (percentage >= 75) return "bg-yellow-500";
		return "bg-green-500";
	};

	const getProgressIcon = (percentage) => {
		if (percentage >= 100) return <AlertTriangle className="h-4 w-4 text-red-500" />;
		if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
		if (percentage >= 75) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
		return <CheckCircle className="h-4 w-4 text-green-500" />;
	};

	const getBudgetMessage = (percentage, spent, budgetAmount) => {
		if (percentage >= 100) {
			const overspent = spent - budgetAmount;
			return {
				type: 'error',
				message: `Budget exceeded by ${formatCurrency(overspent)}!`,
				icon: <AlertTriangle className="h-4 w-4" />
			};
		}
		if (percentage >= 90) {
			const remaining = budgetAmount - spent;
			return {
				type: 'warning',
				message: `Only ${formatCurrency(remaining)} left in budget!`,
				icon: <AlertTriangle className="h-4 w-4" />
			};
		}
		if (percentage >= 75) {
			return {
				type: 'caution',
				message: `You've used 75% of your budget. Consider monitoring spending.`,
				icon: <TrendingUp className="h-4 w-4" />
			};
		}
		return {
			type: 'success',
			message: `Budget on track! Keep up the good work.`,
			icon: <CheckCircle className="h-4 w-4" />
		};
	};

	const totalBudget = getTotalBudget();

	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="border-b border-gray-200 pb-5">
					<h3 className="text-lg font-medium leading-6 text-gray-900">Budget</h3>
					<p className="mt-2 max-w-4xl text-sm text-gray-500">
						Set and track your spending limits by category.
					</p>
				</div>

				{/* Budget Alerts */}
				{/* {budgets.length > 0 && (() => {
					const exceededBudgets = budgets.filter(budget => {
						const progress = getBudgetProgress(budget.id, expenses);
						return (progress.spent / budget.amount) * 100 >= 100;
					});

					const warningBudgets = budgets.filter(budget => {
						const progress = getBudgetProgress(budget.id, expenses);
						const percentage = (progress.spent / budget.amount) * 100;
						return percentage >= 90 && percentage < 100;
					});

					return (exceededBudgets.length > 0 || warningBudgets.length > 0) && (
						<div className="space-y-3">
							{exceededBudgets.length > 0 && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-4">
									<div className="flex items-center space-x-2 text-red-800 mb-2">
										<AlertTriangle className="h-5 w-5" />
										<h4 className="font-medium">Budget Exceeded!</h4>
									</div>
									<p className="text-red-700 text-sm">
										{exceededBudgets.length} budget{exceededBudgets.length > 1 ? 's have' : ' has'} been exceeded: {' '}
										{exceededBudgets.map(b => b.category).join(', ')}
									</p>
								</div>
							)}

							{warningBudgets.length > 0 && (
								<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
									<div className="flex items-center space-x-2 text-orange-800 mb-2">
										<AlertTriangle className="h-5 w-5" />
										<h4 className="font-medium">Budget Warning!</h4>
									</div>
									<p className="text-orange-700 text-sm">
										{warningBudgets.length} budget{warningBudgets.length > 1 ? 's are' : ' is'} nearly exceeded: {' '}
										{warningBudgets.map(b => b.category).join(', ')}
									</p>
								</div>
							)}
						</div>
					);
				})()} */}

				{/* Total Budget Summary */}
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
					<div className="flex items-center">
						<Target className="h-8 w-8 mr-3" />
						<div>
							<h4 className="text-lg font-medium">Total Monthly Budget</h4>
							<p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
						</div>
					</div>
				</div>

				{/* Add Budget Form */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h4 className="text-lg font-medium text-gray-900 mb-4">Create Budget</h4>
						<form onSubmit={handleSubmit}>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Category *
									</label>
									<select
										name="category"
										value={formData.category}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										required
									>
										<option value="Food & Dining">Food & Dining</option>
										<option value="Transportation">Transportation</option>
										<option value="Shopping">Shopping</option>
										<option value="Entertainment">Entertainment</option>
										<option value="Utilities">Utilities</option>
										<option value="Healthcare">Healthcare</option>
										<option value="Education">Education</option>
										<option value="Other">Other</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Amount *
									</label>
									<input
										type="number"
										name="amount"
										value={formData.amount}
										onChange={handleChange}
										step="0.01"
										min="0"
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="0.00"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Period
									</label>
									<select
										name="period"
										value={formData.period}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
										<option value="yearly">Yearly</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Description
									</label>
									<input
										type="text"
										name="description"
										value={formData.description}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="Optional description"
									/>
								</div>
							</div>
							<div className="mt-4">
								<button
									type="submit"
									disabled={isSubmitting}
									className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Creating..." : "Create Budget"}
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Budget List */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h4 className="text-lg font-medium text-gray-900 mb-4">
							Budget Overview
						</h4>

						{isLoading ? (
							<div className="text-center py-4">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
								<p className="mt-2 text-gray-500">Loading budgets...</p>
							</div>
						) : budgets.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								No budgets created yet.
							</p>
						) : (
							<div className="space-y-4">
								{budgets.map((budget) => {
									const progress = getBudgetProgress(budget.id, expenses);
									const percentage = (progress.spent / budget.amount) * 100;
									const isOverBudget = percentage > 100;
									const budgetMessage = getBudgetMessage(percentage, progress.spent, budget.amount);

									return (
										<div
											key={budget.id}
											className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-center justify-between mb-3">
												<div className="flex items-center space-x-3">
													{getProgressIcon(percentage)}
													<div>
														<h5 className="text-sm font-medium text-gray-900">
															{budget.category}
														</h5>
														<p className="text-xs text-gray-500 capitalize">
															{budget.period} • {formatCurrency(budget.amount)}
														</p>
														{budget.description && (
															<p className="text-xs text-gray-600 mt-1">
																{budget.description}
															</p>
														)}
													</div>
												</div>
												<div className="flex items-center space-x-3">
													<div className="text-right">
														{isOverBudget ? (
															<div>
																<p className="text-sm font-medium text-red-600">
																	Over by {formatCurrency(progress.spent - budget.amount)}
																</p>
																<p className="text-xs text-gray-500">
																	{formatCurrency(progress.spent)} / {formatCurrency(budget.amount)}
																</p>
															</div>
														) : (
															<div>
																<p className="text-sm font-medium text-gray-900">
																	{formatCurrency(progress.spent)} / {formatCurrency(budget.amount)}
																</p>
																<p className="text-xs text-gray-500">
																	{percentage.toFixed(1)}% used
																</p>
															</div>
														)}
													</div>
													{/* <button
														onClick={() => handleDelete(budget.id)}
														className="text-red-600 hover:text-red-800 p-1"
														title="Delete budget"
													>
														<Trash2 className="h-4 w-4" />
													</button> */}
												</div>
											</div>

											{/* Progress Bar */}
											<div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
												<div
													className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
													style={{ width: `${Math.min(percentage, 100)}%` }}
												></div>
												{isOverBudget && (
													<div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse"></div>
												)}
											</div>

											{/* Budget Status Message */}
											<div className={`mt-2 flex items-center space-x-2 text-xs font-medium ${budgetMessage.type === 'error' ? 'text-red-600' :
												budgetMessage.type === 'warning' ? 'text-orange-600' :
													budgetMessage.type === 'caution' ? 'text-yellow-600' :
														'text-green-600'
												}`}>
												{budgetMessage.icon}
												<span>{budgetMessage.message}</span>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Budget;