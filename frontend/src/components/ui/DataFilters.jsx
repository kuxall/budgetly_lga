import { useState, useEffect } from "react";
import { Filter, X, Calendar, DollarSign, Tag, CreditCard } from "lucide-react";

const DataFilters = ({
	data = [],
	onFilterChange,
	filterConfig = {},
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [filters, setFilters] = useState({
		dateRange: { start: "", end: "" },
		category: "",
		paymentMethod: "",
		amountRange: { min: "", max: "" },
		search: "",
		merchant: "",
		source: "", // For income
		confidenceRange: { min: "", max: "" }, // For receipts
	});

	const [activeFiltersCount, setActiveFiltersCount] = useState(0);

	// Default filter configuration
	const defaultConfig = {
		showDateRange: true,
		showCategory: true,
		showPaymentMethod: true,
		showAmountRange: true,
		showSearch: true,
		showMerchant: false,
		showSource: false, // For income pages
		showConfidence: false, // For receipts
		categories: [
			"Food & Dining",
			"Transportation",
			"Shopping",
			"Entertainment",
			"Utilities",
			"Healthcare",
			"Education",
			"Other",
		],
		paymentMethods: [
			{ value: "credit_card", label: "Credit Card" },
			{ value: "debit_card", label: "Debit Card" },
			{ value: "cash", label: "Cash" },
			{ value: "bank_transfer", label: "Bank Transfer" },
			{ value: "digital_wallet", label: "Digital Wallet" },
			{ value: "other", label: "Other" },
		],
	};

	const config = { ...defaultConfig, ...filterConfig };

	// Count active filters
	useEffect(() => {
		let count = 0;
		if (filters.dateRange.start || filters.dateRange.end) count++;
		if (filters.category) count++;
		if (filters.paymentMethod) count++;
		if (filters.amountRange.min || filters.amountRange.max) count++;
		if (filters.search) count++;
		if (filters.merchant) count++;
		if (filters.source) count++;
		if (filters.confidenceRange.min || filters.confidenceRange.max) count++;
		setActiveFiltersCount(count);
	}, [filters]);

	// Apply filters to data
	useEffect(() => {
		let filteredData = [...data];

		// Date range filter
		if (filters.dateRange.start || filters.dateRange.end) {
			filteredData = filteredData.filter((item) => {
				const itemDate = new Date(item.date);
				const startDate = filters.dateRange.start
					? new Date(filters.dateRange.start)
					: null;
				const endDate = filters.dateRange.end
					? new Date(filters.dateRange.end)
					: null;

				if (startDate && itemDate < startDate) return false;
				if (endDate && itemDate > endDate) return false;
				return true;
			});
		}

		// Category filter
		if (filters.category) {
			filteredData = filteredData.filter(
				(item) => item.category === filters.category
			);
		}

		// Payment method filter
		if (filters.paymentMethod) {
			filteredData = filteredData.filter(
				(item) => item.payment_method === filters.paymentMethod
			);
		}

		// Amount range filter
		if (filters.amountRange.min || filters.amountRange.max) {
			filteredData = filteredData.filter((item) => {
				const amount = parseFloat(item.amount);
				const min = filters.amountRange.min
					? parseFloat(filters.amountRange.min)
					: 0;
				const max = filters.amountRange.max
					? parseFloat(filters.amountRange.max)
					: Infinity;

				return amount >= min && amount <= max;
			});
		}

		// Search filter (description, notes, merchant)
		if (filters.search) {
			const searchTerm = filters.search.toLowerCase();
			filteredData = filteredData.filter((item) => {
				const description = (item.description || "").toLowerCase();
				const notes = (item.notes || "").toLowerCase();
				const merchant = (item.merchant || "").toLowerCase();
				const source = (item.source || "").toLowerCase();

				return (
					description.includes(searchTerm) ||
					notes.includes(searchTerm) ||
					merchant.includes(searchTerm) ||
					source.includes(searchTerm)
				);
			});
		}

		// Merchant filter
		if (filters.merchant) {
			filteredData = filteredData.filter((item) =>
				(item.merchant || "").toLowerCase().includes(filters.merchant.toLowerCase())
			);
		}

		// Source filter (for income)
		if (filters.source) {
			filteredData = filteredData.filter((item) =>
				(item.source || "").toLowerCase().includes(filters.source.toLowerCase())
			);
		}

		// Confidence range filter (for receipts)
		if (filters.confidenceRange.min || filters.confidenceRange.max) {
			filteredData = filteredData.filter((item) => {
				const confidence = item.extracted_data?.confidence || item.confidence || 0;
				const confidencePercent = confidence * 100; // Convert to percentage
				const min = filters.confidenceRange.min
					? parseFloat(filters.confidenceRange.min)
					: 0;
				const max = filters.confidenceRange.max
					? parseFloat(filters.confidenceRange.max)
					: 100;

				return confidencePercent >= min && confidencePercent <= max;
			});
		}

		onFilterChange(filteredData, filters);
	}, [data, filters]); // Removed onFilterChange from dependencies

	const handleFilterChange = (filterType, value) => {
		setFilters((prev) => ({
			...prev,
			[filterType]: value,
		}));
	};

	const clearAllFilters = () => {
		setFilters({
			dateRange: { start: "", end: "" },
			category: "",
			paymentMethod: "",
			amountRange: { min: "", max: "" },
			search: "",
			merchant: "",
			source: "",
			confidenceRange: { min: "", max: "" },
		});
	};

	const clearFilter = (filterType) => {
		if (filterType === "dateRange") {
			handleFilterChange("dateRange", { start: "", end: "" });
		} else if (filterType === "amountRange") {
			handleFilterChange("amountRange", { min: "", max: "" });
		} else if (filterType === "confidenceRange") {
			handleFilterChange("confidenceRange", { min: "", max: "" });
		} else {
			handleFilterChange(filterType, "");
		}
	};

	return (
		<div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
			{/* Filter Toggle Button */}
			<div className="px-4 py-3 border-b border-gray-200">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center justify-between w-full text-left"
				>
					<div className="flex items-center space-x-2">
						<Filter className="h-4 w-4 text-gray-500" />
						<span className="text-sm font-medium text-gray-700">Filters</span>
						{activeFiltersCount > 0 && (
							<span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
								{activeFiltersCount}
							</span>
						)}
					</div>
					<div className="flex items-center space-x-2">
						{activeFiltersCount > 0 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									clearAllFilters();
								}}
								className="text-xs text-gray-500 hover:text-gray-700"
							>
								Clear all
							</button>
						)}
						<span className="text-gray-400">
							{isOpen ? "−" : "+"}
						</span>
					</div>
				</button>
			</div>

			{/* Filter Controls */}
			{isOpen && (
				<div className="p-4 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Search */}
						{config.showSearch && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Search
								</label>
								<div className="relative">
									<input
										type="text"
										value={filters.search}
										onChange={(e) => handleFilterChange("search", e.target.value)}
										placeholder="Search descriptions, notes..."
										className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									{filters.search && (
										<button
											onClick={() => clearFilter("search")}
											className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* Date Range */}
						{config.showDateRange && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									<Calendar className="h-3 w-3 inline mr-1" />
									Date Range
								</label>
								<div className="flex space-x-2">
									<input
										type="date"
										value={filters.dateRange.start}
										onChange={(e) =>
											handleFilterChange("dateRange", {
												...filters.dateRange,
												start: e.target.value,
											})
										}
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<input
										type="date"
										value={filters.dateRange.end}
										onChange={(e) =>
											handleFilterChange("dateRange", {
												...filters.dateRange,
												end: e.target.value,
											})
										}
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								{(filters.dateRange.start || filters.dateRange.end) && (
									<button
										onClick={() => clearFilter("dateRange")}
										className="text-xs text-blue-600 hover:text-blue-800 mt-1"
									>
										Clear dates
									</button>
								)}
							</div>
						)}

						{/* Category */}
						{config.showCategory && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									<Tag className="h-3 w-3 inline mr-1" />
									Category
								</label>
								<div className="relative">
									<select
										value={filters.category}
										onChange={(e) => handleFilterChange("category", e.target.value)}
										className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="">All Categories</option>
										{config.categories.map((category) => (
											<option key={category} value={category}>
												{category}
											</option>
										))}
									</select>
									{filters.category && (
										<button
											onClick={() => clearFilter("category")}
											className="absolute right-8 top-2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* Payment Method */}
						{config.showPaymentMethod && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									<CreditCard className="h-3 w-3 inline mr-1" />
									Payment Method
								</label>
								<div className="relative">
									<select
										value={filters.paymentMethod}
										onChange={(e) =>
											handleFilterChange("paymentMethod", e.target.value)
										}
										className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="">All Methods</option>
										{config.paymentMethods.map((method) => (
											<option key={method.value} value={method.value}>
												{method.label}
											</option>
										))}
									</select>
									{filters.paymentMethod && (
										<button
											onClick={() => clearFilter("paymentMethod")}
											className="absolute right-8 top-2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* Amount Range */}
						{config.showAmountRange && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									<DollarSign className="h-3 w-3 inline mr-1" />
									Amount Range
								</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={filters.amountRange.min}
										onChange={(e) =>
											handleFilterChange("amountRange", {
												...filters.amountRange,
												min: e.target.value,
											})
										}
										placeholder="Min"
										step="0.01"
										min="0"
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<input
										type="number"
										value={filters.amountRange.max}
										onChange={(e) =>
											handleFilterChange("amountRange", {
												...filters.amountRange,
												max: e.target.value,
											})
										}
										placeholder="Max"
										step="0.01"
										min="0"
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								{(filters.amountRange.min || filters.amountRange.max) && (
									<button
										onClick={() => clearFilter("amountRange")}
										className="text-xs text-blue-600 hover:text-blue-800 mt-1"
									>
										Clear range
									</button>
								)}
							</div>
						)}

						{/* Merchant */}
						{config.showMerchant && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Merchant
								</label>
								<div className="relative">
									<input
										type="text"
										value={filters.merchant}
										onChange={(e) => handleFilterChange("merchant", e.target.value)}
										placeholder="Filter by merchant..."
										className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									{filters.merchant && (
										<button
											onClick={() => clearFilter("merchant")}
											className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* Source (for income) */}
						{config.showSource && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Income Source
								</label>
								<div className="relative">
									<input
										type="text"
										value={filters.source}
										onChange={(e) => handleFilterChange("source", e.target.value)}
										placeholder="Filter by source..."
										className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									{filters.source && (
										<button
											onClick={() => clearFilter("source")}
											className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						)}

						{/* Confidence Range (for receipts) */}
						{config.showConfidence && (
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									<span className="flex items-center">
										🎯 Confidence %
										<span className="ml-1 text-xs text-gray-500">(AI accuracy)</span>
									</span>
								</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={filters.confidenceRange.min}
										onChange={(e) =>
											handleFilterChange("confidenceRange", {
												...filters.confidenceRange,
												min: e.target.value,
											})
										}
										placeholder="Min %"
										min="0"
										max="100"
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<input
										type="number"
										value={filters.confidenceRange.max}
										onChange={(e) =>
											handleFilterChange("confidenceRange", {
												...filters.confidenceRange,
												max: e.target.value,
											})
										}
										placeholder="Max %"
										min="0"
										max="100"
										className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								{(filters.confidenceRange.min || filters.confidenceRange.max) && (
									<button
										onClick={() => clearFilter("confidenceRange")}
										className="text-xs text-blue-600 hover:text-blue-800 mt-1"
									>
										Clear confidence
									</button>
								)}
								<div className="text-xs text-gray-500 mt-1">
									<div className="flex justify-between">
										<span>Low: 0-50%</span>
										<span>Good: 50-80%</span>
										<span>High: 80-100%</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Active Filters Summary */}
					{activeFiltersCount > 0 && (
						<div className="pt-3 border-t border-gray-200">
							<div className="flex flex-wrap gap-2">
								{filters.dateRange.start && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										From: {filters.dateRange.start}
										<button
											onClick={() =>
												handleFilterChange("dateRange", {
													...filters.dateRange,
													start: "",
												})
											}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{filters.dateRange.end && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										To: {filters.dateRange.end}
										<button
											onClick={() =>
												handleFilterChange("dateRange", {
													...filters.dateRange,
													end: "",
												})
											}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{filters.category && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										{filters.category}
										<button
											onClick={() => clearFilter("category")}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{filters.paymentMethod && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										{config.paymentMethods.find(m => m.value === filters.paymentMethod)?.label}
										<button
											onClick={() => clearFilter("paymentMethod")}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{(filters.amountRange.min || filters.amountRange.max) && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										${filters.amountRange.min || "0"} - ${filters.amountRange.max || "∞"}
										<button
											onClick={() => clearFilter("amountRange")}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
								{(filters.confidenceRange.min || filters.confidenceRange.max) && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
										{filters.confidenceRange.min || "0"}% - {filters.confidenceRange.max || "100"}% confidence
										<button
											onClick={() => clearFilter("confidenceRange")}
											className="ml-1 text-blue-600 hover:text-blue-800"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default DataFilters;