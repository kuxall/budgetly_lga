import { useState, useEffect, useMemo } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { useIncomeStore } from "../../store/incomeStore";
import { useBudgetStore } from "../../store/budgetStore";
import toast from "react-hot-toast";
import { getTopSpending } from "../../utils/expenseGrouping";
import {
	Download,
	FileText,
	Calendar,
	Filter,
	TrendingUp,
	TrendingDown,
	AlertTriangle,
	Eye,
	Receipt,
	Target,
	BarChart3,
	PieChart,
	Activity,
} from "lucide-react";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
	ArcElement,
	LineElement,
	PointElement,
	Filler,
} from "chart.js";
import { Bar, Pie, Line, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
	ArcElement,
	LineElement,
	PointElement,
	Filler
);

const Reports = () => {
	const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpenseStore();
	const { income, fetchIncome, isLoading: incomeLoading } = useIncomeStore();
	const { budgets, fetchBudgets, isLoading: budgetsLoading } = useBudgetStore();

	const [timeRange, setTimeRange] = useState("thismonth");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [isExporting, setIsExporting] = useState(false);
	const [activeTab, setActiveTab] = useState("advanced");

	useEffect(() => {
		fetchExpenses();
		fetchIncome();
		fetchBudgets();
	}, [fetchExpenses, fetchIncome, fetchBudgets]);

	const isLoading = expensesLoading || incomeLoading || budgetsLoading;

	// Filter data based on time range
	const getFilteredData = () => {
		const now = new Date();
		let startDate = new Date();

		switch (timeRange) {
			case "today":
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				break;
			case "yesterday":
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
				break;
			case "last7days":
				startDate.setDate(now.getDate() - 7);
				break;
			case "last30days":
				startDate.setDate(now.getDate() - 30);
				break;
			case "thismonth":
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
				break;
			case "lastmonth":
				startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				break;
			case "thisyear":
				startDate = new Date(now.getFullYear(), 0, 1);
				break;
			case "alltime":
				startDate = new Date(2000, 0, 1);
				break;
			default:
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		}

		const filteredExpenses = (expenses || []).filter((expense) => {
			const expenseDate = new Date(expense.date);
			if (isNaN(expenseDate.getTime())) return false;
			const matchesTime = timeRange === "alltime" || expenseDate >= startDate;
			const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
			return matchesTime && matchesCategory;
		});

		const filteredIncome = (income || []).filter((inc) => {
			const incomeDate = new Date(inc.date);
			if (isNaN(incomeDate.getTime())) return false;
			return timeRange === "alltime" || incomeDate >= startDate;
		});

		return { filteredExpenses, filteredIncome, startDate };
	};

	const { filteredExpenses, filteredIncome } = getFilteredData();

	// Calculate summary statistics
	const summary = useMemo(() => {
		const totalIncome = filteredIncome.reduce((sum, inc) => sum + inc.amount, 0);
		const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
		const netBalance = totalIncome - totalExpense;

		// Top 3 categories
		const categoryTotals = filteredExpenses.reduce((acc, exp) => {
			acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
			return acc;
		}, {});

		const topCategories = Object.entries(categoryTotals)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([category, amount]) => ({ category, amount }));

		return { totalIncome, totalExpense, netBalance, topCategories };
	}, [filteredIncome, filteredExpenses]);

	// Budget analysis
	const budgetAnalysis = useMemo(() => {
		return budgets.map((budget) => {
			const spent = filteredExpenses
				.filter((exp) => exp.category === budget.category)
				.reduce((sum, exp) => sum + exp.amount, 0);
			const remaining = budget.amount - spent;
			const percentage = (spent / budget.amount) * 100;

			return {
				...budget,
				spent,
				remaining,
				percentage,
				status: percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "good",
			};
		});
	}, [budgets, filteredExpenses]);

	const categories = [...new Set((expenses || []).map((exp) => exp.category).filter(Boolean))];

	// Chart data for Advanced Reports
	const chartData = useMemo(() => {
		const colors = [
			"#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
			"#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6B7280",
		];

		// Category breakdown
		const categoryTotals = filteredExpenses.reduce((acc, exp) => {
			acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
			return acc;
		}, {});

		const categoryData = Object.entries(categoryTotals)
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount);

		// Monthly trends
		const monthlyTrends = filteredExpenses.reduce((acc, exp) => {
			const month = new Date(exp.date).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
			});
			acc[month] = (acc[month] || 0) + exp.amount;
			return acc;
		}, {});

		const monthlyData = Object.entries(monthlyTrends)
			.map(([month, amount]) => ({ month, amount }))
			.sort((a, b) => new Date(a.month) - new Date(b.month));

		// Top spending - smart grouping by merchant/vendor
		const topSpending = getTopSpending(filteredExpenses, 5);

		// Payment methods
		const paymentMethods = filteredExpenses.reduce((acc, exp) => {
			const method = exp.payment_method || "other";
			acc[method] = (acc[method] || 0) + exp.amount;
			return acc;
		}, {});

		// Category Pie Chart
		const categoryChartData = {
			labels: categoryData.map((item) => item.category),
			datasets: [
				{
					data: categoryData.map((item) => item.amount),
					backgroundColor: colors.slice(0, categoryData.length),
					borderColor: "#ffffff",
					borderWidth: 2,
					hoverOffset: 8,
				},
			],
		};

		// Monthly Line Chart
		const monthlyChartData = {
			labels: monthlyData.map((item) => item.month),
			datasets: [
				{
					label: "Monthly Spending",
					data: monthlyData.map((item) => item.amount),
					borderColor: "#3B82F6",
					backgroundColor: "rgba(59, 130, 246, 0.1)",
					borderWidth: 3,
					fill: true,
					tension: 0.4,
					pointBackgroundColor: "#3B82F6",
					pointBorderColor: "#ffffff",
					pointBorderWidth: 2,
					pointRadius: 6,
					pointHoverRadius: 8,
				},
			],
		};

		// Top Descriptions Bar Chart
		const merchantChartData = {
			labels: topSpending.map((item) => item.name),
			datasets: [
				{
					label: "Amount Spent",
					data: topSpending.map((item) => item.amount),
					backgroundColor: "rgba(139, 92, 246, 0.8)",
					borderColor: "#8B5CF6",
					borderWidth: 2,
					borderRadius: 8,
				},
			],
		};

		// Payment Methods Doughnut Chart
		const paymentMethodData = {
			labels: Object.keys(paymentMethods).map((method) =>
				method.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
			),
			datasets: [
				{
					data: Object.values(paymentMethods),
					backgroundColor: ["#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16"],
					borderColor: "#ffffff",
					borderWidth: 3,
					cutout: "60%",
				},
			],
		};

		return {
			categoryChartData,
			monthlyChartData,
			merchantChartData,
			paymentMethodData,
			categoryData,
			monthlyData,
			topSpending,
		};
	}, [filteredExpenses]);

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-CA", {
			style: "currency",
			currency: "CAD",
		}).format(amount);
	};

	const getTimeRangeLabel = () => {
		const labels = {
			today: "Today",
			yesterday: "Yesterday",
			last7days: "Last 7 Days",
			last30days: "Last 30 Days",
			thismonth: "This Month",
			lastmonth: "Last Month",
			thisyear: "This Year",
			alltime: "All Time",
		};
		return labels[timeRange] || "This Month";
	};

	// Export functions
	const exportToCSV = () => {
		setIsExporting(true);
		try {
			const csvContent = [
				["FINANCIAL REPORT - " + getTimeRangeLabel()],
				["Generated on: " + new Date().toLocaleDateString()],
				[],
				["SUMMARY"],
				["Total Income", summary.totalIncome],
				["Total Expense", summary.totalExpense],
				["Net Balance", summary.netBalance],
				[],
				["INCOME REPORT"],
				["Date", "Source", "Description", "Amount", "Payment Mode"],
				...filteredIncome.map((inc) => [
					inc.date,
					inc.source,
					inc.description || "",
					inc.amount,
					"Bank Transfer",
				]),
				[],
				["EXPENSE REPORT"],
				["Date", "Category", "Description", "Amount", "Payment Mode"],
				...filteredExpenses.map((exp) => [
					exp.date,
					exp.category,
					exp.description,
					exp.amount,
					exp.payment_method || "other",
				]),
				[],
				["BUDGET REPORT"],
				["Category", "Budget Limit", "Spent", "Remaining", "% Used"],
				...budgetAnalysis.map((b) => [
					b.category,
					b.amount,
					b.spent,
					b.remaining,
					b.percentage.toFixed(1) + "%",
				]),
			]
				.map((row) => row.join(","))
				.join("\n");

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `budgetly-report-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);

			toast.success("CSV report downloaded successfully!");
		} catch (error) {
			console.error("CSV export error:", error);
			toast.error("Failed to export CSV");
		} finally {
			setIsExporting(false);
		}
	};

	const exportToPDF = () => {
		setIsExporting(true);
		try {
			const printWindow = window.open("", "_blank");
			if (!printWindow) {
				toast.error("Please allow popups to export PDF");
				setIsExporting(false);
				return;
			}

			const reportDate = new Date().toLocaleDateString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<title>Budgetly Financial Report - ${getTimeRangeLabel()}</title>
	<meta charset="UTF-8">
	<style>
		/* A4 Page Setup - 210mm x 297mm */
		@page {
			size: A4 portrait;
			margin: 2cm 1.5cm;
		}
		
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		html, body {
			width: 210mm;
			height: 297mm;
		}
		
		body {
			font-family: Arial, sans-serif;
			color: #000;
			line-height: 1.5;
			font-size: 10pt;
			background: white;
			max-width: 210mm;
			margin: 0 auto;
			padding: 1.5cm;
		}
		
		/* Company Header - Clean & Aligned */
		.company-header {
			border-bottom: 2px solid #000;
			padding-bottom: 15px;
			margin-bottom: 25px;
		}
		
		.company-name {
			font-size: 20pt;
			font-weight: bold;
			color: #000;
			margin-bottom: 5px;
		}
		
		.company-info {
			font-size: 9pt;
			color: #333;
			line-height: 1.6;
		}
		
		.company-info div {
			margin: 2px 0;
		}
		
		/* Report Title */
		.report-title {
			font-size: 16pt;
			font-weight: bold;
			margin: 20px 0 10px 0;
			text-align: center;
		}
		
		.report-meta {
			text-align: center;
			font-size: 9pt;
			color: #666;
			margin-bottom: 20px;
		}
		
		/* Summary Section */
		.summary-section {
			margin-bottom: 20px;
			page-break-inside: avoid;
		}
		
		.summary-row {
			display: flex;
			justify-content: space-between;
			padding: 8px 0;
			border-bottom: 1px solid #ddd;
		}
		
		.summary-row:last-child {
			border-bottom: 2px solid #000;
			font-weight: bold;
		}
		
		.summary-label {
			font-weight: bold;
		}
		
		.summary-value {
			text-align: right;
		}
		
		/* Section */
		.section {
			margin: 25px 0;
			page-break-inside: avoid;
		}
		
		.section-title {
			font-size: 12pt;
			font-weight: bold;
			margin: 20px 0 10px 0;
			padding-bottom: 5px;
			border-bottom: 2px solid #000;
		}
		
		/* Tables */
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 10px 0;
			font-size: 9pt;
		}
		
		thead {
			background: #f5f5f5;
		}
		
		th {
			padding: 8px;
			text-align: left;
			font-weight: bold;
			border: 1px solid #ddd;
		}
		
		td {
			padding: 8px;
			border: 1px solid #ddd;
		}
		
		tbody tr:nth-child(even) {
			background: #fafafa;
		}
		
		tfoot {
			background: #f5f5f5;
			font-weight: bold;
		}
		
		tfoot td {
			padding: 10px 8px;
			border: 1px solid #ddd;
		}
		
		.text-right { text-align: right; }
		.text-center { text-align: center; }
		
		/* Footer */
		.report-footer {
			margin-top: 30px;
			padding-top: 15px;
			border-top: 2px solid #000;
			font-size: 9pt;
			text-align: center;
		}
		
		/* Print - A4 Optimization */
		@media print {
			html, body {
				width: 210mm;
				height: 297mm;
			}
			
			body {
				margin: 0;
				padding: 1.5cm;
			}
			
			.section {
				page-break-inside: avoid;
			}
			
			table {
				page-break-inside: avoid;
			}
			
			.company-header {
				page-break-after: avoid;
			}
			
			.report-footer {
				page-break-before: avoid;
			}
			
			/* Ensure colors print */
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
		}
		
		/* Page Break Control */
		.page-break {
			page-break-before: always;
		}
		
		.no-break {
			page-break-inside: avoid;
		}
	</style>
</head>
<body>
	<!-- Company Header -->
	<div class="company-header">
		<div class="company-name">BUDGETLY</div>
		<div class="company-info">
			<div><strong>Lumen Grove Analytics</strong></div>
			<div>Email: kuxall0@gmail.com</div>
			<div>AI-Powered Financial Management Platform</div>
		</div>
	</div>

	<!-- Report Title -->
	<div class="report-title">Financial Report - ${getTimeRangeLabel()}</div>
	<div class="report-meta">
		Generated on ${reportDate}
		${selectedCategory !== "all" ? ` | Category: ${selectedCategory}` : ""}
	</div>

	<!-- Summary -->
	<div class="summary-section">
		<div class="summary-row">
			<div class="summary-label">Total Income:</div>
			<div class="summary-value">${formatCurrency(summary.totalIncome)}</div>
		</div>
		<div class="summary-row">
			<div class="summary-label">Total Expense:</div>
			<div class="summary-value">${formatCurrency(summary.totalExpense)}</div>
		</div>
		<div class="summary-row">
			<div class="summary-label">Net Balance:</div>
			<div class="summary-value">${formatCurrency(summary.netBalance)}</div>
		</div>
	</div>

	<!-- Income Report -->
	<div class="section">
		<div class="section-title">Income Report</div>
		${filteredIncome.length === 0 ? `
			<p style="text-align: center; color: #666; padding: 20px;">No income records found for this period.</p>
		` : `
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Source</th>
						<th>Description</th>
						<th class="text-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					${filteredIncome.map(inc => `
						<tr>
							<td>${new Date(inc.date).toLocaleDateString()}</td>
							<td>${inc.source}</td>
							<td>${inc.description || "-"}</td>
							<td class="text-right">${formatCurrency(inc.amount)}</td>
						</tr>
					`).join("")}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="3">TOTAL INCOME</td>
						<td class="text-right">${formatCurrency(summary.totalIncome)}</td>
					</tr>
				</tfoot>
			</table>
		`}
	</div>

	<!-- Expense Report -->
	<div class="section">
		<div class="section-title">Expense Report</div>
		${filteredExpenses.length === 0 ? `
			<p style="text-align: center; color: #666; padding: 20px;">No expense records found for this period.</p>
		` : `
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Category</th>
						<th>Description</th>
						<th>Payment Mode</th>
						<th class="text-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					${filteredExpenses.map(exp => `
						<tr>
							<td>${new Date(exp.date).toLocaleDateString()}</td>
							<td>${exp.category}</td>
							<td>${exp.description}</td>
							<td style="text-transform: capitalize;">${(exp.payment_method || "other").replace("_", " ")}</td>
							<td class="text-right">${formatCurrency(exp.amount)}</td>
						</tr>
					`).join("")}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="4">TOTAL EXPENSE</td>
						<td class="text-right">${formatCurrency(summary.totalExpense)}</td>
					</tr>
				</tfoot>
			</table>
		`}
	</div>

	<!-- Budget Report -->
	${budgetAnalysis.length > 0 ? `
	<div class="section">
		<div class="section-title">Budget Report</div>
		<table>
			<thead>
				<tr>
					<th>Category</th>
					<th class="text-right">Budget Limit</th>
					<th class="text-right">Spent</th>
					<th class="text-right">Remaining</th>
					<th class="text-right">% Used</th>
					<th class="text-center">Status</th>
				</tr>
			</thead>
			<tbody>
				${budgetAnalysis.map(budget => `
					<tr>
						<td>${budget.category}</td>
						<td class="text-right">${formatCurrency(budget.amount)}</td>
						<td class="text-right">${formatCurrency(budget.spent)}</td>
						<td class="text-right">
							${formatCurrency(Math.abs(budget.remaining))}${budget.remaining < 0 ? " over" : ""}
						</td>
						<td class="text-right">${budget.percentage.toFixed(1)}%</td>
						<td class="text-center">
							${budget.status === "over" ? "OVER BUDGET" : ""}
							${budget.status === "warning" ? "WARNING" : ""}
							${budget.status === "good" ? "ON TRACK" : ""}
						</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>
	` : ""}

	<!-- Footer -->
	<div class="report-footer">
		<div><strong>BUDGETLY</strong> by Lumen Grove Analytics</div>
		<div>AI-Powered Financial Management Platform</div>
		<div style="margin-top: 10px;">
			Report Generated: ${new Date().toLocaleString()}<br>
			© ${new Date().getFullYear()} Lumen Grove Analytics. All rights reserved.
		</div>
	</div>
</body>
</html>
			`;

			printWindow.document.write(htmlContent);
			printWindow.document.close();

			setTimeout(() => {
				printWindow.focus();
				printWindow.print();
				setTimeout(() => {
					try {
						printWindow.close();
					} catch (e) {
						// Ignore if user closed manually
					}
				}, 1000);
			}, 500);

			toast.success("PDF report opened. Use your browser's print dialog to save as PDF.");
		} catch (error) {
			console.error("PDF export error:", error);
			toast.error("Failed to generate PDF report");
		} finally {
			setIsExporting(false);
		}
	};



	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
				<p className="ml-3 text-gray-600">Loading reports...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="border-b border-gray-200 pb-5">
				<h3 className="text-lg font-medium leading-6 text-gray-900">Financial Reports</h3>
				<p className="mt-2 max-w-4xl text-sm text-gray-500">
					Comprehensive financial reports with income, expenses, and budget analysis.
				</p>
			</div>

			{/* Filters and Export */}
			<div className="bg-white shadow rounded-lg border border-gray-200">
				<div className="px-6 py-4">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center space-x-2">
							<Calendar className="h-4 w-4 text-primary-600" />
							<label className="text-sm font-medium text-gray-700">Period:</label>
							<select
								value={timeRange}
								onChange={(e) => setTimeRange(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
							>
								<option value="today">Today</option>
								<option value="yesterday">Yesterday</option>
								<option value="last7days">Last 7 Days</option>
								<option value="last30days">Last 30 Days</option>
								<option value="thismonth">This Month</option>
								<option value="lastmonth">Last Month</option>
								<option value="thisyear">This Year</option>
								<option value="alltime">All Time</option>
							</select>
						</div>

						<div className="flex items-center space-x-2">
							<Filter className="h-4 w-4 text-purple-600" />
							<label className="text-sm font-medium text-gray-700">Category:</label>
							<select
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
							>
								<option value="all">All Categories</option>
								{categories.map((cat) => (
									<option key={cat} value={cat}>
										{cat}
									</option>
								))}
							</select>
						</div>

						<div className="ml-auto flex space-x-2">
							<button
								onClick={exportToCSV}
								disabled={isExporting}
								className="flex items-center space-x-2 px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 disabled:opacity-50"
							>
								<Download className="h-4 w-4" />
								<span>Export CSV</span>
							</button>
							<button
								onClick={exportToPDF}
								className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
							>
								<FileText className="h-4 w-4" />
								<span>Export PDF</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="bg-white shadow rounded-lg border border-gray-200">
				<div className="border-b border-gray-200">
					<nav className="flex space-x-8 px-6" aria-label="Tabs">
						{[
							{ id: "advanced", label: "Advanced Reports", icon: BarChart3 },
							{ id: "income", label: "Income Report", icon: TrendingUp },
							{ id: "expense", label: "Expense Report", icon: TrendingDown },
							{ id: "budget", label: "Budget Report", icon: Target },
						].map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
										? "border-primary-500 text-primary-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
								>
									<Icon className="h-4 w-4" />
									<span>{tab.label}</span>
								</button>
							);
						})}
					</nav>
				</div>

				<div className="p-6">
					{/* Income Report Tab */}
					{activeTab === "income" && (
						<div>
							<h5 className="text-lg font-semibold mb-4">Income Report</h5>
							{filteredIncome.length === 0 ? (
								<div className="text-center py-12">
									<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
									<p className="text-gray-500">No income records found for this period.</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Date
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Source
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Description
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													Amount
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{filteredIncome.map((inc) => (
												<tr key={inc.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{new Date(inc.date).toLocaleDateString()}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{inc.source}
													</td>
													<td className="px-6 py-4 text-sm text-gray-500">
														{inc.description || "-"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-success-600">
														{formatCurrency(inc.amount)}
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-gray-50">
											<tr>
												<td colSpan="3" className="px-6 py-4 text-sm font-semibold text-gray-900">
													Total Income
												</td>
												<td className="px-6 py-4 text-sm font-bold text-right text-success-600">
													{formatCurrency(summary.totalIncome)}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							)}
						</div>
					)}

					{/* Expense Report Tab */}
					{activeTab === "expense" && (
						<div>
							<h5 className="text-lg font-semibold mb-4">Expense Report</h5>
							{filteredExpenses.length === 0 ? (
								<div className="text-center py-12">
									<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
									<p className="text-gray-500">No expense records found for this period.</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Date
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Category
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Description
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Payment Mode
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													Amount
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{filteredExpenses.map((exp) => (
												<tr key={exp.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{new Date(exp.date).toLocaleDateString()}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
															{exp.category}
														</span>
													</td>
													<td className="px-6 py-4 text-sm text-gray-900">{exp.description}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
														{(exp.payment_method || "other").replace("_", " ")}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-danger-600">
														{formatCurrency(exp.amount)}
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-gray-50">
											<tr>
												<td colSpan="4" className="px-6 py-4 text-sm font-semibold text-gray-900">
													Total Expense
												</td>
												<td className="px-6 py-4 text-sm font-bold text-right text-danger-600">
													{formatCurrency(summary.totalExpense)}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							)}
						</div>
					)}

					{/* Budget Report Tab */}
					{activeTab === "budget" && (
						<div>
							<h5 className="text-lg font-semibold mb-4">Budget Report</h5>
							{budgetAnalysis.length === 0 ? (
								<div className="text-center py-12">
									<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
									<p className="text-gray-500">No budgets set up yet.</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Category
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													Budget Limit
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													Spent
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													Remaining
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
													% Used
												</th>
												<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
													Status
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{budgetAnalysis.map((budget) => (
												<tr key={budget.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
														{budget.category}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
														{formatCurrency(budget.amount)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
														{formatCurrency(budget.spent)}
													</td>
													<td
														className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${budget.remaining < 0 ? "text-danger-600" : "text-success-600"
															}`}
													>
														{formatCurrency(Math.abs(budget.remaining))}
														{budget.remaining < 0 && " over"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
														{budget.percentage.toFixed(1)}%
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-center">
														{budget.status === "over" && (
															<span className="px-2 py-1 text-xs font-medium rounded-full bg-danger-100 text-danger-800">
																Over Budget
															</span>
														)}
														{budget.status === "warning" && (
															<span className="px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-800">
																Warning
															</span>
														)}
														{budget.status === "good" && (
															<span className="px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-800">
																On Track
															</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{/* Advanced Reports Tab */}
					{activeTab === "advanced" && (
						<div className="space-y-6">
							<div className="text-center mb-6">
								<h5 className="text-lg font-semibold text-gray-900">Advanced Reports & Analytics</h5>
								<p className="text-sm text-gray-500 mt-1">
									Visual insights and trends for {getTimeRangeLabel()}
								</p>
							</div>

							{filteredExpenses.length === 0 ? (
								<div className="text-center py-12">
									<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
									<p className="text-gray-500">No data available for charts. Add some expenses to see visualizations.</p>
								</div>
							) : (
								<>
									{/* Charts Grid */}
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
										{/* Category Pie Chart */}
										<div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
											<h6 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
												<PieChart className="h-5 w-5 text-primary-600 mr-2" />
												Spending by Category
											</h6>
											<div className="h-80">
												<Pie
													data={chartData.categoryChartData}
													options={{
														responsive: true,
														maintainAspectRatio: false,
														plugins: {
															legend: {
																position: "bottom",
																labels: {
																	padding: 15,
																	usePointStyle: true,
																	font: { size: 11 },
																},
															},
															tooltip: {
																callbacks: {
																	label: function (context) {
																		const label = context.label || "";
																		const value = formatCurrency(context.raw);
																		const total = context.dataset.data.reduce((a, b) => a + b, 0);
																		const percentage = ((context.raw / total) * 100).toFixed(1);
																		return `${label}: ${value} (${percentage}%)`;
																	},
																},
															},
														},
													}}
												/>
											</div>
										</div>

										{/* Top Merchants/Vendors Bar Chart */}
										<div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
											<h6 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
												<BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
												Top 5 Merchants & Categories
											</h6>
											<div className="h-80">
												<Bar
													data={chartData.merchantChartData}
													options={{
														responsive: true,
														maintainAspectRatio: false,
														indexAxis: "y",
														plugins: {
															legend: { display: false },
															tooltip: {
																callbacks: {
																	label: function (context) {
																		return `Spent: ${formatCurrency(context.raw)}`;
																	},
																},
															},
														},
														scales: {
															x: {
																beginAtZero: true,
																ticks: {
																	callback: function (value) {
																		return formatCurrency(value);
																	},
																},
															},
															y: { grid: { display: false } },
														},
													}}
												/>
											</div>
										</div>
									</div>

									{/* Monthly Trends Line Chart */}
									{chartData.monthlyData.length > 1 && (
										<div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
											<h6 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
												<Activity className="h-5 w-5 text-success-600 mr-2" />
												Spending Over Time
											</h6>
											<div className="h-80">
												<Line
													data={chartData.monthlyChartData}
													options={{
														responsive: true,
														maintainAspectRatio: false,
														plugins: {
															legend: { display: false },
															tooltip: {
																mode: "index",
																intersect: false,
																callbacks: {
																	label: function (context) {
																		return `Spending: ${formatCurrency(context.raw)}`;
																	},
																},
															},
														},
														scales: {
															x: { grid: { display: false } },
															y: {
																beginAtZero: true,
																ticks: {
																	callback: function (value) {
																		return formatCurrency(value);
																	},
																},
															},
														},
													}}
												/>
											</div>
										</div>
									)}

									{/* Payment Methods Doughnut Chart */}
									<div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
										<h6 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
											<Receipt className="h-5 w-5 text-warning-600 mr-2" />
											Payment Methods Distribution
										</h6>
										<div className="h-80">
											<Doughnut
												data={chartData.paymentMethodData}
												options={{
													responsive: true,
													maintainAspectRatio: false,
													plugins: {
														legend: {
															position: "bottom",
															labels: {
																padding: 15,
																usePointStyle: true,
																font: { size: 11 },
															},
														},
														tooltip: {
															callbacks: {
																label: function (context) {
																	const label = context.label || "";
																	const value = formatCurrency(context.raw);
																	const total = context.dataset.data.reduce((a, b) => a + b, 0);
																	const percentage = ((context.raw / total) * 100).toFixed(1);
																	return `${label}: ${value} (${percentage}%)`;
																},
															},
														},
													},
												}}
											/>
										</div>
									</div>

									{/* Category Breakdown Table */}
									<div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
										<h6 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
											<Target className="h-5 w-5 text-indigo-600 mr-2" />
											Category Breakdown
										</h6>
										<div className="space-y-3">
											{chartData.categoryData.map((item, index) => {
												const percentage = (item.amount / summary.totalExpense) * 100;
												return (
													<div
														key={item.category}
														className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
													>
														<div className="flex items-center space-x-3">
															<div
																className="w-3 h-3 rounded-full"
																style={{
																	backgroundColor: [
																		"#3B82F6", "#10B981", "#F59E0B", "#EF4444",
																		"#8B5CF6", "#06B6D4", "#84CC16", "#F97316",
																	][index % 8],
																}}
															></div>
															<span className="font-medium text-gray-900">{item.category}</span>
														</div>
														<div className="flex items-center space-x-4">
															<div className="text-right">
																<div className="text-sm font-semibold text-gray-900">
																	{formatCurrency(item.amount)}
																</div>
																<div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
															</div>
															<div className="w-24 bg-gray-200 rounded-full h-2">
																<div
																	className="h-2 rounded-full"
																	style={{
																		width: `${percentage}%`,
																		backgroundColor: [
																			"#3B82F6", "#10B981", "#F59E0B", "#EF4444",
																			"#8B5CF6", "#06B6D4", "#84CC16", "#F97316",
																		][index % 8],
																	}}
																></div>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Report Metadata */}
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
				<div className="flex items-center justify-between text-sm text-gray-600">
					<div className="flex items-center space-x-4">
						<span>Report generated on: {new Date().toLocaleDateString()}</span>
						<span>•</span>
						<span>Period: {getTimeRangeLabel()}</span>
					</div>
					<div className="flex items-center space-x-2">
						<Eye className="h-4 w-4" />
						<span>Budgetly Financial Reports</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Reports;
