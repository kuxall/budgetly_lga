import { useState, useEffect } from "react";
import { useBudgetStore } from "../../store/budgetStore";
import { useExpenseStore } from "../../store/expenseStore";
import { Trash2, Target, AlertTriangle, Edit2, Save, X, TrendingUp } from "lucide-react";
import DataFilters from "../../components/ui/DataFilters";
import IncomeBudgetDashboard from "../../components/Budget/IncomeBudgetDashboard";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import toast from "react-hot-toast";

const Budgets = () => {
	const {
		budgets,
		isLoading,
		isSubmitting,
		fetchBudgets,
		createBudget,
		updateBudget,
		deleteBudget,
		fetchCategoryBudgetSuggestion,
	} = useBudgetStore();

	const { getExpensesByCategory } = useExpenseStore();

	const [formData, setFormData] = useState({
		category: "Food & Dining",
		amount: "",
		period: "monthly",
	});

	const [editingBudget, setEditingBudget] = useState(null);
	const [editFormData, setEditFormData] = useState({});
	const [filteredBudgets, setFilteredBudgets] = useState([]);
	const [showIncomeDashboard, setShowIncomeDashboard] = useState(true);
	const [loadingSuggestion, setLoadingSuggestion] = useState(false);

	const { isOpen, config, isLoading: confirmLoading, confirm, handleClose } = useConfirm();

	useEffect(() => {
		fetchBudgets();
	}, [fetchBudgets]);

	// Initialize filtered budgets when budgets change
	useEffect(() => {
		setFilteredBudgets(budgets);
	}, [budgets]);

	const handleFilterChange = (filtered) => {
		setFilteredBudgets(filtered);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate form data
		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error("Please enter a valid budget amount greater than 0");
			return;
		}

		if (!formData.category) {
			toast.error("Please select a category");
			return;
		}

		// Check if budget already exists for this category and period
		const existingBudget = budgets.find(
			(budget) =>
				budget.category === formData.category &&
				budget.period === formData.period
		);

		if (existingBudget) {
			if (
				!window.confirm(
					`A ${formData.period} budget for ${formData.category} already exists. Do you want to replace it?`
				)
			) {
				return;
			}
			// Delete existing budget first
			try {
				await deleteBudget(existingBudget.id);
			} catch (error) {
				toast.error("Failed to replace existing budget. Please try again.");
				return;
			}
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
			});
		} catch (error) {
			toast.error("Failed to create budget. Please try again.");
		}
	};

	const handleChange = async (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});

		// Auto-suggest budget amount when category changes
		if (name === 'category' && value) {
			setLoadingSuggestion(true);
			try {
				const suggestion = await fetchCategoryBudgetSuggestion(value);
				if (suggestion.success && suggestion.suggested_amount) {
					setFormData(prev => ({
						...prev,
						amount: suggestion.suggested_amount.toFixed(2)
					}));
				}
			} catch (error) {
				console.error('Error fetching budget suggestion:', error);
			} finally {
				setLoadingSuggestion(false);
			}
		}
	};

	const handleEdit = (budget) => {
		setEditingBudget(budget.id);
		setEditFormData({
			category: budget.category,
			amount: budget.amount.toString(),
			period: budget.period,
		});
	};

	const handleCancelEdit = () => {
		setEditingBudget(null);
		setEditFormData({});
	};

	const handleSaveEdit = async () => {
		if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
			toast.error("Please enter a valid budget amount greater than 0");
			return;
		}

		try {
			await updateBudget(editingBudget, {
				...editFormData,
				amount: parseFloat(editFormData.amount),
			});
			setEditingBudget(null);
			setEditFormData({});
		} catch (error) {
			toast.error("Failed to update budget. Please try again.");
		}
	};

	const handleEditChange = (e) => {
		setEditFormData({
			...editFormData,
			[e.target.name]: e.target.value,
		});
	};

	const handleDelete = async (id) => {
		const confirmed = await confirm({
			title: "Delete Budget",
			message: "Are you sure you want to delete this budget? This action cannot be undone.",
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger"
		});

		if (confirmed) {
			try {
				await deleteBudget(id);
				// Toast is shown in the store
			} catch (error) {
				// Error toast is shown in the store
			}
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	const expensesByCategory = getExpensesByCategory();

	const getBudgetProgress = (budget) => {
		const spent = expensesByCategory[budget.category] || 0;
		const percentage = (spent / budget.amount) * 100;
		return { spent, percentage: Math.min(percentage, 100) };
	};

	const getBudgetStatus = (percentage) => {
		if (percentage >= 100)
			return {
				color: "red",
				status: "Over Budget",
				iconClass: "text-danger-500",
				textClass: "text-danger-600",
				bgClass: "bg-danger-500",
			};
		if (percentage >= 80)
			return {
				color: "yellow",
				status: "Warning",
				iconClass: "text-warning-500",
				textClass: "text-warning-600",
				bgClass: "bg-warning-500",
			};
		return {
			color: "green",
			status: "On Track",
			iconClass: "text-success-500",
			textClass: "text-success-600",
			bgClass: "bg-success-500",
		};
	};

	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 pb-5">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium leading-6 text-gray-900">Budgets</h3>
						<p className="mt-2 max-w-4xl text-sm text-gray-500">
							Set and monitor your spending limits by category.
						</p>
					</div>
					<button
						onClick={() => setShowIncomeDashboard(!showIncomeDashboard)}
						className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
					>
						<TrendingUp className="h-4 w-4" />
						<span>{showIncomeDashboard ? 'Hide' : 'Show'} Income Analysis</span>
					</button>
				</div>
			</div>

			{/* Income-Aware Budget Dashboard */}
			{showIncomeDashboard && (
				<IncomeBudgetDashboard />
			)}

			{/* Create Budget Form */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h4 className="text-lg font-medium text-gray-900 mb-4">
						Create Budget
					</h4>
					<form onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Category
								</label>
								<select
									name="category"
									value={formData.category}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
									Budget Amount
									{loadingSuggestion && (
										<span className="ml-2 text-xs text-primary-600">
											(Loading suggestion...)
										</span>
									)}
								</label>
								<input
									type="number"
									name="amount"
									value={formData.amount}
									onChange={handleChange}
									step="0.01"
									min="0.01"
									max="999999.99"
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
									placeholder="0.00"
									required
								/>
								{formData.amount && !loadingSuggestion && (
									<p className="mt-1 text-xs text-gray-500">
										💡 Suggested based on your income
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Period
								</label>
								<select
									name="period"
									value={formData.period}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
								>
									<option value="monthly">Monthly</option>
									<option value="weekly">Weekly</option>
									<option value="yearly">Yearly</option>
								</select>
							</div>
							<div className="flex items-end">
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Creating..." : "Create Budget"}
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>

			{/* Filters */}
			<DataFilters
				data={budgets}
				onFilterChange={handleFilterChange}
				filterConfig={{
					showCategory: true,
					showAmountRange: true,
					showSearch: true,
					showDateRange: false,
					showPaymentMethod: false,
					showMerchant: false,
					showSource: false,
				}}
			/>

			{/* Active Budgets */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-medium text-gray-900">
							Active Budgets
						</h4>
						<div className="text-sm text-gray-500">
							Showing {filteredBudgets.length} of {budgets.length} budgets
						</div>
					</div>

					{isLoading ? (
						<div className="text-center py-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
							<p className="mt-2 text-gray-500">Loading budgets...</p>
						</div>
					) : budgets.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							No budgets created yet.
						</p>
					) : filteredBudgets.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-gray-500">No budgets match your current filters.</p>
							<p className="text-sm text-gray-400 mt-2">
								Try adjusting your filter criteria to see more results.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredBudgets.map((budget) => {
								const { spent, percentage } = getBudgetProgress(budget);
								const { status, iconClass, textClass, bgClass } =
									getBudgetStatus(percentage);

								return (
									<div
										key={budget.id}
										className="border border-gray-200 rounded-lg p-4"
									>
										{editingBudget === budget.id ? (
											// Edit Mode
											<div className="space-y-4">
												<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
													<div>
														<label className="block text-sm font-medium text-gray-700">
															Category
														</label>
														<select
															name="category"
															value={editFormData.category}
															onChange={handleEditChange}
															className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
														>
															<option value="Food & Dining">
																Food & Dining
															</option>
															<option value="Transportation">
																Transportation
															</option>
															<option value="Shopping">Shopping</option>
															<option value="Entertainment">
																Entertainment
															</option>
															<option value="Utilities">Utilities</option>
															<option value="Healthcare">Healthcare</option>
															<option value="Education">Education</option>
															<option value="Other">Other</option>
														</select>
													</div>
													<div>
														<label className="block text-sm font-medium text-gray-700">
															Budget Amount
														</label>
														<input
															type="number"
															name="amount"
															value={editFormData.amount}
															onChange={handleEditChange}
															step="0.01"
															min="0.01"
															max="999999.99"
															className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
															value={editFormData.period}
															onChange={handleEditChange}
															className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
														>
															<option value="monthly">Monthly</option>
															<option value="weekly">Weekly</option>
															<option value="yearly">Yearly</option>
														</select>
													</div>
												</div>
												<div className="flex justify-end space-x-2">
													<button
														onClick={handleCancelEdit}
														className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
													>
														<X className="h-4 w-4 inline mr-1" />
														Cancel
													</button>
													<button
														onClick={handleSaveEdit}
														disabled={isSubmitting}
														className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
													>
														<Save className="h-4 w-4 inline mr-1" />
														{isSubmitting ? "Saving..." : "Save"}
													</button>
												</div>
											</div>
										) : (
											// View Mode
											<>
												<div className="flex items-center justify-between mb-3">
													<div className="flex items-center space-x-3">
														<div className="flex-shrink-0">
															<Target className={`h-5 w-5 ${iconClass}`} />
														</div>
														<div>
															<h5 className="text-sm font-medium text-gray-900">
																{budget.category}
															</h5>
															<p className="text-xs text-gray-500 capitalize">
																{budget.period} budget
															</p>
														</div>
													</div>
													<div className="flex items-center space-x-3">
														<div className="text-right">
															<p className="text-sm font-semibold text-gray-900">
																{formatCurrency(spent)} /{" "}
																{formatCurrency(budget.amount)}
															</p>
															<div className="flex items-center space-x-1">
																{percentage >= 80 && (
																	<AlertTriangle
																		className={`h-3 w-3 ${iconClass}`}
																	/>
																)}
																<span
																	className={`text-xs ${textClass} font-medium`}
																>
																	{status}
																</span>
															</div>
														</div>
														<div className="flex space-x-1">
															<button
																onClick={() => handleEdit(budget)}
																className="text-primary-600 hover:text-primary-800 p-1"
																title="Edit budget"
															>
																<Edit2 className="h-4 w-4" />
															</button>
															<button
																onClick={() => handleDelete(budget.id)}
																className="text-danger-600 hover:text-danger-800 p-1"
																title="Delete budget"
															>
																<Trash2 className="h-4 w-4" />
															</button>
														</div>
													</div>
												</div>

												{/* Progress Bar */}
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className={`${bgClass} h-2 rounded-full transition-all duration-300`}
														style={{ width: `${percentage}%` }}
													></div>
												</div>

												<div className="mt-2 flex justify-between text-xs text-gray-500">
													<span>{percentage.toFixed(1)}% used</span>
													<span>
														{formatCurrency(budget.amount - spent)} remaining
													</span>
												</div>
											</>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Confirm Dialog */}
			<ConfirmDialog
				isOpen={isOpen}
				onClose={handleClose}
				onConfirm={config.onConfirm}
				title={config.title}
				message={config.message}
				confirmText={config.confirmText}
				cancelText={config.cancelText}
				type={config.type}
				isLoading={confirmLoading}
			/>
		</div>
	);
};

export default Budgets;
