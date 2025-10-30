import React, { useState, useEffect } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { useBudgetStore } from "../../store/budgetStore";
import {
	Calendar,
	DollarSign,
	Sparkles,
	Upload,
	Receipt,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import ReceiptUpload from "../../components/ui/ReceiptUpload";

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

	const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
	const [showReceiptUpload, setShowReceiptUpload] = useState(false);

	useEffect(() => {
		fetchExpenses();
		fetchBudgets();
	}, [fetchExpenses, fetchBudgets]);

	const handleExpenseCreated = (expense) => {
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
			alert("Please fill in description and amount");
			return;
		}

		try {
			await createExpense({
				...formData,
				amount: parseFloat(formData.amount),
			}, budgets);

			// Reset form
			setFormData({
				description: "",
				amount: "",
				category: "Food & Dining",
				date: new Date().toISOString().split("T")[0],
				payment_method: "credit_card",
				notes: "",
			});
		} catch (error) {
			console.error("Failed to create expense:", error);
		}
	};

	const handleChange = async (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});

		// Auto-suggest category when description changes
		if (name === "description" && value.length > 3) {
			await getSuggestion(value);
		}
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
				<div className="border-b border-gray-200 pb-5">
					<h3 className="text-lg font-medium leading-6 text-gray-900">
						Expenses
					</h3>
					<p className="mt-2 max-w-4xl text-sm text-gray-500">
						Track and manage your expenses with smart categorization.
					</p>
				</div>

				{/* Receipt Upload Section */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h4 className="text-lg font-medium text-gray-900">
									Upload Receipt
								</h4>
								<p className="text-sm text-gray-500 mt-1">
									Let AI extract expense data from your receipts automatically
								</p>
							</div>
							<button
								onClick={() => setShowReceiptUpload(true)}
								className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
							>
								<Upload className="h-4 w-4 mr-2" />
								Upload Receipt
							</button>
						</div>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-start">
								<Receipt className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
								<div>
									<h5 className="text-sm font-medium text-blue-800">AI-Powered Processing</h5>
									<p className="text-sm text-blue-700 mt-1">
										Upload receipt images and our AI will automatically extract merchant, amount, date, and category.
										High-confidence results create expenses automatically, others require quick review.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Manual Expense Form */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h4 className="text-lg font-medium text-gray-900 mb-4">
							Add Expense Manually
						</h4>
						<form onSubmit={handleSubmit}>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Description *
									</label>
									<input
										type="text"
										name="description"
										value={formData.description}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="Enter expense description"
										required
									/>
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
										<div className="flex items-center space-x-2">
											<span>Category</span>
											{isGettingSuggestion && (
												<Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
											)}
										</div>
									</label>
									<select
										name="category"
										value={formData.category}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
										Date
									</label>
									<input
										type="date"
										name="date"
										value={formData.date}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">
										Payment Method
									</label>
									<select
										name="payment_method"
										value={formData.payment_method}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
									<label className="block text-sm font-medium text-gray-700">
										Notes
									</label>
									<input
										type="text"
										name="notes"
										value={formData.notes}
										onChange={handleChange}
										className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="Optional notes"
									/>
								</div>
							</div>
							<div className="mt-4">
								<button
									type="submit"
									disabled={isSubmitting}
									className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Adding..." : "Add Expense"}
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Expense History */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h4 className="text-lg font-medium text-gray-900 mb-4">
							Recent Expenses
						</h4>

						{isLoading ? (
							<div className="text-center py-4">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
								<p className="mt-2 text-gray-500">Loading expenses...</p>
							</div>
						) : expenses.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								No expenses recorded yet.
							</p>
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
														<DollarSign className="h-5 w-5 text-red-500" />
													</div>
													<div>
														<h5 className="text-sm font-medium text-gray-900">
															{expense.description}
														</h5>
														<div className="flex items-center space-x-4 text-xs text-gray-500">
															<span>{expense.category}</span>
															<span className="flex items-center">
																<Calendar className="h-3 w-3 mr-1" />
																{new Date(expense.date).toLocaleDateString()}
															</span>
															<span className="capitalize">{expense.payment_method?.replace('_', ' ')}</span>
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
												<span className="text-lg font-semibold text-red-600">
													-${expense.amount.toFixed(2)}
												</span>
												{/* <button
													onClick={() => handleDelete(expense.id)}
													className="text-red-600 hover:text-red-800 p-1"
													title="Delete expense"
												>
													<Trash2 className="h-4 w-4" />
												</button> */}
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