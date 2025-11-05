import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Wallet, Home, DollarSign, CreditCard, Target, Receipt, LogOut, Brain } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const MainLayout = ({ children }) => {
	const location = useLocation();
	const { user, logout } = useAuthStore();

	const navigation = [
		{ name: "Dashboard", href: "/dashboard", icon: Home },
		{ name: "Income", href: "/income", icon: DollarSign },
		{ name: "Expenses", href: "/expenses", icon: CreditCard },
		{ name: "Receipts", href: "/receipts", icon: Receipt },
		{ name: "Budget", href: "/budget", icon: Target },
		{ name: "AI Insights", href: "/ai-insights", icon: Brain },
		{ name: "Settings", href: "/settings", icon: Target },
	];

	const isActive = (path) => location.pathname === path;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<Link to="/dashboard" className="flex items-center">
							<div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
								<Wallet className="h-5 w-5 text-white" />
							</div>
							<h1 className="ml-3 text-xl font-bold text-gray-900">Budgetly</h1>
						</Link>

						{/* Navigation */}
						<nav className="hidden md:flex space-x-8">
							{navigation.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.name}
										to={item.href}
										className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href)
											? "bg-blue-100 text-blue-700"
											: "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
											}`}
									>
										<Icon className="h-4 w-4" />
										<span>{item.name}</span>
									</Link>
								);
							})}
						</nav>

						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">
								Welcome, {user?.first_name || user?.email}!
							</span>
							<button
								onClick={logout}
								className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
							>
								<LogOut className="h-4 w-4" />
								<span>Logout</span>
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile Navigation */}
			<nav className="md:hidden bg-white border-b">
				<div className="px-4 py-2">
					<div className="flex space-x-4 overflow-x-auto">
						{navigation.map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.name}
									to={item.href}
									className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${isActive(item.href)
										? "bg-blue-100 text-blue-700"
										: "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
										}`}
								>
									<Icon className="h-4 w-4" />
									<span>{item.name}</span>
								</Link>
							);
						})}
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{children}
			</main>
		</div>
	);
};

export default MainLayout;