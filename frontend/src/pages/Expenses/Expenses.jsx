import { useState, useEffect } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { Calendar, DollarSign, Upload, Receipt, Plus } from "lucide-react";
import toast from 'react-hot-toast';
import MainLayout from "../../components/layout/MainLayout";
import ReceiptUpload from "../../components/ui/ReceiptUpload";
import { useBudgetStore } from "../../store/budgetStore";

const Expenses = () => {
	const {
		expenses,
		isLoading,
		isSubmitting,
		fetchExpenses,
		createExpense,
	} = useExpenseStore();

	const { budgets, fetchBudgets } = useBudgetStore();

	const [formData, setFormData] = useState({
		description: "",
		amount: "",
		category: "Food & Dining",
		date: new Date().toISOString().split("T")[0],
		payment_method: "credit_card",
		notes: "",
	});

	const [showReceiptUpload, setShowReceiptUpload] = useState(false);
	const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);

	useEffect(() => {
		fetchExpenses();
		fetchBudgets();
	}, [fetchExpenses, fetchBudgets]);

	const handleExpenseCreated = () => {
		// Refresh expenses list when a new expense is created from receipt
		fetchExpenses();
	};

	const handleReceiptProcessed = (result) => {
		// Could show a success message or update UI
		console.log('Receipt processed:', result);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.description || !formData.amount) {
			toast.error("Please fill in description and amount");
			return;
		}

		const amount = parseFloat(formData.amount);
		if (isNaN(amount) || amount <= 0) {
			toast.error("Please enter a valid amount greater than 0");
			return;
		}

		try {
			await createExpense({
				...formData,
				amount: amount,
			});

			// Reset form
			setFormData({
				description: "",
				amount: "",
				category: "Food & Dining",
				date: new Date().toISOString().split("T")[0],
				payment_method: "credit_card",
				notes: "",
			});
		} catch (err) {
			toast.error("Failed to create expense. Please try again.");
		}
	};

	const handleChange = async (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return "Invalid Date";
		}
		return date.toLocaleDateString();
	};

	const formatExpenseDescription = (expense) => {
		return expense.description || 'No description';
	};

	const getSuggestion = async (description) => {
		if (isGettingSuggestion) return;

		setIsGettingSuggestion(true);
		try {
			// Simple category suggestion based on keywords
			const keywords = {
				"Food & Dining": ["food", "restaurant", "coffee", "lunch", "dinner", "grocery"],
				"Transportation": ["gas", "fuel", "uber", "taxi", "bus", "train"],
				"Shopping": ["store", "mall", "amazon", "clothes", "shopping"],
				"Entertainment": ["movie", "game", "concert", "netflix", "spotify"],
				"Utilities": ["electric", "water", "internet", "phone", "bill"],
				"Healthcare": ["doctor", "pharmacy", "hospital", "medicine"],
			};

			const lowerDesc = description.toLowerCase();
			let suggestedCategory = "Other";

			for (const [category, words] of Object.entries(keywords)) {
				if (words.some(word => lowerDesc.includes(word))) {
					suggestedCategory = category;
					break;
				}
			}

			if (suggestedCategory !== "Other") {
				setFormData((prev) => ({
					...prev,
					category: suggestedCategory,
				}));
			}
		} catch (error) {
			console.error("Failed to get category suggestion:", error);
		} finally {
			setIsGettingSuggestion(false);
		}
	};

	// Delete functionality disabled for now - focusing on creation and tracking

	return (
		<MainLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 flex items-center">
							<DollarSign className="h-8 w-8 mr-3 text-green-600" />
							Expenses
						</h1>
						<p className="text-gray-600 mt-1">Track and manage your expenses</p>
					</div>
					<button
						onClick={() => setShowReceiptUpload(true)}
						className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
					>
						<Upload className="h-4 w-4 mr-2" />
						Upload Receipt
					</button>
				</div>

				{/* Add New Expense Form */}
				<div className="bg-white shadow rounded-lg border">
					<div className="px-6 py-4 border-b border-gray-200">
						<div className="flex items-center">
							<div className="p-2 bg-blue-100 rounded-lg mr-3">
								<Plus className="h-5 w-5 text-blue-600" />
							</div>
							<h3 className="text-lg font-medium text-gray-900">Add New Expense</h3>
						</div>
					</div>
					<div className="p-6">
						<form onSubmit={handleSubmit}>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Description *
									</label>
									<input
										type="text"
										name="description"
										value={formData.description}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
										placeholder="Enter expense description"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Amount *
									</label>
									<input
										type="number"
										name="amount"
										value={formData.amount}
										onChange={handleChange}
										step="0.01"
										min="0"
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
										placeholder="0.00"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Category
									</label>
									<select
										name="category"
										value={formData.category}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Date
									</label>
									<input
										type="date"
										name="date"
										value={formData.date}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Payment Method
									</label>
									<select
										name="payment_method"
										value={formData.payment_method}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="credit_card">Credit Card</option>
										<option value="debit_card">Debit Card</option>
										<option value="cash">Cash</option>
										<option value="bank_transfer">Bank Transfer</option>
										<option value="digital_wallet">Digital Wallet</option>
										<option value="other">Other</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Notes
									</label>
									<input
										type="text"
										name="notes"
										value={formData.notes}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
										placeholder="Optional notes"
									/>
								</div>
							</div>
							<div className="mt-6">
								<button
									type="submit"
									disabled={isSubmitting}
									className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{isSubmitting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Adding...
										</>
									) : (
										<>
											<Plus className="h-4 w-4 mr-2" />
											Add Expense
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Receipt Upload Info */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-start">
						<Receipt className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
						<div>
							<h4 className="text-sm font-medium text-blue-800">AI-Powered Receipt Processing</h4>
							<p className="text-sm text-blue-700 mt-1">
								Upload receipt images and our AI will automatically extract merchant, amount, date, and category.
								High-confidence results create expenses automatically, others require quick review.
							</p>
						</div>
					</div>
				</div>

				{/* Expenses List */}
				<div className="bg-white shadow rounded-lg border">
					<div className="px-6 py-4 border-b border-gray-200">
						<div className="flex items-center">
							<div className="p-2 bg-green-100 rounded-lg mr-3">
								<DollarSign className="h-5 w-5 text-green-600" />
							</div>
							<h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
						</div>
					</div>
					<div className="p-6">
						{isLoading ? (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
								<p className="mt-2 text-gray-500">Loading expenses...</p>
							</div>
						) : expenses.length === 0 ? (
							<div className="text-center py-8">
								<DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
								<p className="text-gray-500">No expenses recorded yet.</p>
								<p className="text-sm text-gray-400 mt-1">Add your first expense using the form above.</p>
							</div>
						) : (
							<div className="space-y-3">
								{expenses.map((expense) => (
									<div
										key={expense.id}
										className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center space-x-3">
													<div className="flex-shrink-0">
														<div className="p-2 bg-green-100 rounded-full">
															<DollarSign className="h-4 w-4 text-green-600" />
														</div>
													</div>
													<div>
														<h5 className="text-sm font-medium text-gray-900">
															{formatExpenseDescription(expense)}
														</h5>
														<div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
															<span className="flex items-center">
																<Calendar className="h-3 w-3 mr-1" />
																{formatDate(expense.date)}
															</span>
															<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
																{expense.category}
															</span>
															<span className="capitalize">
																{expense.payment_method?.replace("_", " ")}
															</span>
														</div>
														{expense.notes && (
															<p className="text-xs text-gray-600 mt-1">
																{expense.notes}
															</p>
														)}
													</div>
												</div>
											</div>
											<div className="flex items-center space-x-3">
												<span className="text-lg font-semibold text-gray-900">
													{formatCurrency(expense.amount)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Receipt Upload Modal */}
				{showReceiptUpload && (
					<ReceiptUpload
						onClose={() => setShowReceiptUpload(false)}
						onExpenseCreated={handleExpenseCreated}
						onReceiptProcessed={handleReceiptProcessed}
					/>
				)}
			</div>
		</MainLayout>
	);
};

export default Expenses;