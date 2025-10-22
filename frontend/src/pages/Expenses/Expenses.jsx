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

const Expenses = () => {
	const {
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

			
		</div>
	);
};

export default Expenses;
