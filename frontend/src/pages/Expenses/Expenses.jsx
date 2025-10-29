import React, { useState, useEffect } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { Trash2, Calendar, DollarSign, Camera, Sparkles } from "lucide-react";
import { useGlobalToast } from "../../contexts/ToastContext";

const Expenses = () => {
	const {
		expenses,
		isLoading,
		isSubmitting,
		fetchExpenses,
		createExpense,
	} = useExpenseStore();

	const [formData, setFormData] = useState({
		description: "",
		amount: "",
		category: "Food & Dining",
		date: new Date().toISOString().split("T")[0],
		payment_method: "credit_card",
		notes: "",
	});

	const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
	const { success, error } = useGlobalToast();

	useEffect(() => {
		fetchExpenses();
	}, [fetchExpenses]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.description || !formData.amount) {
			error("Please fill in description and amount");
			return;
		}

		const amount = parseFloat(formData.amount);
		if (isNaN(amount) || amount <= 0) {
			error("Please enter a valid amount greater than 0");
			return;
		}

		try {
			await createExpense({
				...formData,
				amount: amount,
			});

			success(`Expense "${formData.description}" added successfully!`);

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
			error("Failed to create expense. Please try again.");
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
		const { description, category, merchant } = expense;

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
			{/* Modern Header */}
			<div className="page-header-green">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center">
							<DollarSign className="h-8 w-8 mr-3" />
							Expenses
						</h1>
					</div>
				</div>
			</div>

			{/* Modern Add New Expense Form */}
			<div className="card">
				<div className="card-header">
					<div className="card-icon bg-blue-100">
						<Sparkles className="h-5 w-5 text-blue-600" />
					</div>
					<h4 className="card-title">Add New Expense</h4>
				</div>
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<label className="label">
								Description *
							</label>
							<input
								type="text"
								name="description"
								value={formData.description}
								onChange={handleChange}
								className="input"
								placeholder="Enter expense description"
								required
							/>
						</div>
						<div>
							<label className="label">
								Amount *
							</label>
							<input
								type="number"
								name="amount"
								value={formData.amount}
								onChange={handleChange}
								step="0.01"
								min="0"
								className="input"
								placeholder="0.00"
								required
							/>
						</div>
						<div>
							<label className="label">
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
								className="input"
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
							<label className="label">
								Date
							</label>
							<input
								type="date"
								name="date"
								value={formData.date}
								onChange={handleChange}
								className="input"
							/>
						</div>
						<div>
							<label className="label">
								Payment Method
							</label>
							<select
								name="payment_method"
								value={formData.payment_method}
								onChange={handleChange}
								className="input"
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
							<label className="label">
								Notes
							</label>
							<input
								type="text"
								name="notes"
								value={formData.notes}
								onChange={handleChange}
								className="input"
								placeholder="Optional notes"
							/>
						</div>
					</div>
					<div className="mt-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className="btn-primary"
						>
							{isSubmitting ? "Adding..." : "Add Expense"}
						</button>
					</div>
				</form>
			</div>

			{/* Expenses List */}
			<div className="card">
				<div className="card-header">
					<div className="card-icon bg-green-100">
						<DollarSign className="h-5 w-5 text-green-600" />
					</div>
					<h4 className="card-title">Recent Expenses</h4>
				</div>

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
						{(expenses || []).map((expense) => (
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
										
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>



		</div>
	);
};

export default Expenses;