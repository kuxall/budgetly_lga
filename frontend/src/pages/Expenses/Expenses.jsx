import React, { useState, useEffect } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { categoriesApi } from "../../services/api";
import {
	Trash2,
	Edit,
	Calendar,
	DollarSign,
	Camera,
	Sparkles,
} from "lucide-react";
import ReceiptUpload from "../../components/ReceiptUpload";

const Expenses = () => {
	const {
		expenses,
		isLoading,
		isSubmitting,
		fetchExpenses,
		createExpense,
		deleteExpense,
	} = useExpenseStore();

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
	}, [fetchExpenses]);

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
		if (name === "description" && value.length > 3 && formData.amount) {
			await getSuggestion(value, formData.amount);
		}
	};

	const getSuggestion = async (description, amount) => {
		if (isGettingSuggestion) return;

		setIsGettingSuggestion(true);
		try {
			const suggestion = await categoriesApi.suggestCategory(
				description,
				amount
			);
			if (suggestion.category && suggestion.confidence > 0.7) {
				setFormData((prev) => ({
					...prev,
					category: suggestion.category,
				}));
			}
		} catch (error) {
			console.error("Failed to get category suggestion:", error);
		} finally {
			setIsGettingSuggestion(false);
		}
	};

	const handleDelete = async (id) => {
		if (window.confirm("Are you sure you want to delete this expense?")) {
			try {
				await deleteExpense(id);
			} catch (error) {
				console.error("Failed to delete expense:", error);
			}
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString();
	};

	const formatExpenseDescription = (expense) => {
		const { description, category, merchant } = expense;

		// Debug logging to see what data we have
		console.log("Expense data:", { description, category, merchant, expense });

		// If we have a merchant field and description is generic, create a better description
		if (
			merchant &&
			merchant !== description &&
			!merchant.includes("STORE") &&
			!merchant.match(/^\d+$/)
		) {
			switch (category.toLowerCase()) {
				case "food & dining":
					return `Purchase at ${merchant}`;
				case "transportation":
					if (merchant.toLowerCase().includes("uber")) {
						return "Uber ride";
					} else if (merchant.toLowerCase().includes("lyft")) {
						return "Lyft ride";
					} else {
						return `Transportation via ${merchant}`;
					}
				case "shopping":
					return `Shopping at ${merchant}`;
				default:
					return `Purchase at ${merchant}`;
			}
		}

		// Handle AI-generated descriptions
		if (
			description &&
			(description.includes(" items at ") || description.includes(" item at "))
		) {
			const parts = description.split(" at ");
			if (parts.length === 2) {
				const store = parts[1].trim();
				const lowerStore = store.toLowerCase();

				// Handle specific services first
				if (lowerStore.includes("uber")) {
					return lowerStore.includes("eats")
						? "Food delivery from Uber Eats"
						: "Uber ride";
				} else if (lowerStore.includes("lyft")) {
					return "Lyft ride";
				}

				// Handle generic store IDs
				if (store.includes("STORE") || store.match(/^\d+$/)) {
					switch (category?.toLowerCase()) {
						case "food & dining":
							return "Grocery shopping";
						case "transportation":
							return "Transportation expense";
						case "shopping":
							return "Shopping purchase";
						default:
							return "Purchase";
					}
				}

				// Use actual store name
				const actualStore =
					merchant && !merchant.includes("STORE") && !merchant.match(/^\d+$/)
						? merchant
						: store;

				switch (category?.toLowerCase()) {
					case "food & dining":
						return `Grocery shopping at ${actualStore}`;
					case "transportation":
						return `Transportation via ${actualStore}`;
					case "shopping":
						return `Shopping at ${actualStore}`;
					default:
						return `Purchase at ${actualStore}`;
				}
			}
		}

		return description || "Expense";
	};

	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 pb-5">
				<h3 className="text-lg font-medium leading-6 text-gray-900">
					Expenses
				</h3>
				<p className="mt-2 max-w-4xl text-sm text-gray-500">
					Track and manage your expenses with smart categorization.
				</p>
			</div>

			{/* Add New Expense Form */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-medium text-gray-900">
							Add New Expense
						</h4>
						<button
							onClick={() => setShowReceiptUpload(true)}
							className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
						>
							<Camera className="h-4 w-4" />
							<span>Scan Receipt</span>
						</button>
					</div>
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

			{/* Expenses List */}
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
													<DollarSign className="h-5 w-5 text-green-500" />
												</div>
												<div>
													<h5 className="text-sm font-medium text-gray-900">
														{formatExpenseDescription(expense)}
													</h5>
													<div className="flex items-center space-x-4 text-xs text-gray-500">
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
											<button
												onClick={() => handleDelete(expense.id)}
												className="text-red-600 hover:text-red-800 p-1"
												title="Delete expense"
											>
												<Trash2 className="h-4 w-4" />
											</button>
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
					onExpenseCreated={(expense) => {
						setShowReceiptUpload(false);
						fetchExpenses(); // Refresh the list
					}}
				/>
			)}
		</div>
	);
};

export default Expenses;
