import React, { useState, useEffect } from "react";
import { useIncomeStore } from "../../store/incomeStore";
import { Trash2, DollarSign, Calendar } from "lucide-react";

const Income = () => {
	const {
		income,
		isLoading,
		isSubmitting,
		fetchIncome,
		createIncome,
		deleteIncome,
		getTotalIncome,
	} = useIncomeStore();

	const [formData, setFormData] = useState({
		source: "",
		amount: "",
		date: new Date().toISOString().split("T")[0],
		description: "",
	});

	useEffect(() => {
		fetchIncome();
	}, [fetchIncome]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.source || !formData.amount) {
			alert("Please fill in source and amount");
			return;
		}

		try {
			await createIncome({
				...formData,
				amount: parseFloat(formData.amount),
			});

			// Reset form
			setFormData({
				source: "",
				amount: "",
				date: new Date().toISOString().split("T")[0],
				description: "",
			});
		} catch (error) {
			console.error("Failed to create income:", error);
		}
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleDelete = async (id) => {
		if (window.confirm("Are you sure you want to delete this income record?")) {
			try {
				await deleteIncome(id);
			} catch (error) {
				console.error("Failed to delete income:", error);
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

	const totalIncome = getTotalIncome();

	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 pb-5">
				<h3 className="text-lg font-medium leading-6 text-gray-900">Income</h3>
				<p className="mt-2 max-w-4xl text-sm text-gray-500">
					Track your income sources and manage your earnings.
				</p>
			</div>

			{/* Total Income Summary */}
			<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
				<div className="flex items-center">
					<DollarSign className="h-8 w-8 mr-3" />
					<div>
						<h4 className="text-lg font-medium">Total Income</h4>
						<p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
					</div>
				</div>
			</div>

			{/* Add Income Form */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h4 className="text-lg font-medium text-gray-900 mb-4">Add Income</h4>
					<form onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Source *
								</label>
								<input
									type="text"
									name="source"
									value={formData.source}
									onChange={handleChange}
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
									placeholder="e.g., Salary, Freelance"
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
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
									placeholder="0.00"
									required
								/>
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
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
								/>
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
									className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
									placeholder="Optional description"
								/>
							</div>
						</div>
						<div className="mt-4">
							<button
								type="submit"
								disabled={isSubmitting}
								className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? "Adding..." : "Add Income"}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Income History */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h4 className="text-lg font-medium text-gray-900 mb-4">
						Income History
					</h4>

					{isLoading ? (
						<div className="text-center py-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
							<p className="mt-2 text-gray-500">Loading income...</p>
						</div>
					) : income.length === 0 ? (
						<p className="text-gray-500 text-center py-8">
							No income records yet.
						</p>
					) : (
						<div className="space-y-3">
							{income.map((incomeItem) => (
								<div
									key={incomeItem.id}
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
														{incomeItem.source}
													</h5>
													<div className="flex items-center space-x-4 text-xs text-gray-500">
														<span className="flex items-center">
															<Calendar className="h-3 w-3 mr-1" />
															{formatDate(incomeItem.date)}
														</span>
													</div>
													{incomeItem.description && (
														<p className="text-xs text-gray-600 mt-1">
															{incomeItem.description}
														</p>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-3">
											<span className="text-lg font-semibold text-green-600">
												+{formatCurrency(incomeItem.amount)}
											</span>
											<button
												onClick={() => handleDelete(incomeItem.id)}
												className="text-red-600 hover:text-red-800 p-1"
												title="Delete income"
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
		</div>
	);
};

export default Income;
