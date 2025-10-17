import React from "react";
import { motion } from "framer-motion";
import {
	Wallet,
	TrendingUp,
	PieChart,
	Target,
	CreditCard,
	BarChart3,
	Shield
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const Dashboard = () => {
	const { user, logout } = useAuthStore();

	const features = [
		{
			icon: <PieChart className="h-8 w-8" />,
			title: "Expense Tracking",
			description: "Track your daily expenses with smart categorization and visual insights.",
			color: "from-blue-500 to-blue-600"
		},
		{
			icon: <Target className="h-8 w-8" />,
			title: "Budget Planning",
			description: "Set realistic budgets and get alerts when you're approaching limits.",
			color: "from-green-500 to-green-600"
		},
		{
			icon: <TrendingUp className="h-8 w-8" />,
			title: "Financial Insights",
			description: "AI-powered analytics to help you understand your spending patterns.",
			color: "from-purple-500 to-purple-600"
		},
		{
			icon: <CreditCard className="h-8 w-8" />,
			title: "Multiple Accounts",
			description: "Manage multiple bank accounts and credit cards in one place.",
			color: "from-orange-500 to-orange-600"
		},
		{
			icon: <BarChart3 className="h-8 w-8" />,
			title: "Reports & Analytics",
			description: "Detailed reports with charts and graphs to visualize your finances.",
			color: "from-pink-500 to-pink-600"
		},
		{
			icon: <Shield className="h-8 w-8" />,
			title: "Secure & Private",
			description: "Bank-level security with end-to-end encryption for your data.",
			color: "from-indigo-500 to-indigo-600"
		}
	];



	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
								<Wallet className="h-5 w-5 text-white" />
							</div>
							<h1 className="ml-3 text-xl font-bold text-gray-900">Budgetly</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">
								Welcome, {user?.first_name || user?.email}!
							</span>
							<button
								onClick={logout}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Hero Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-16"
				>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
						className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mb-8"
					>
						<Wallet className="h-10 w-10 text-white" />
					</motion.div>

					<h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
						Welcome to{" "}
						<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Budgetly
						</span>
					</h1>

					<p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
						Your AI-powered personal finance manager. Take control of your money,
						track expenses, set budgets, and achieve your financial goals with intelligent insights.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
						>
							Start Managing Finances
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-colors"
						>
							View Demo
						</motion.button>
					</div>
				</motion.div>



				{/* Features Section */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6, duration: 0.6 }}
					className="mb-16"
				>
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-gray-900 mb-4">
							Powerful Features for Smart Money Management
						</h2>
						<p className="text-lg text-gray-600 max-w-2xl mx-auto">
							Everything you need to take control of your finances and build a better financial future.
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature, index) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.7 + index * 0.1 }}
								whileHover={{ y: -5 }}
								className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
							>
								<div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} text-white mb-4`}>
									{feature.icon}
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									{feature.title}
								</h3>
								<p className="text-gray-600">
									{feature.description}
								</p>
							</motion.div>
						))}
					</div>
				</motion.div>

				{/* CTA Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 1, duration: 0.6 }}
					className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white"
				>
					<h2 className="text-3xl font-bold mb-4">
						Ready to Transform Your Financial Life?
					</h2>
					<p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
						Join thousands of users who have already taken control of their finances with Budgetly's intelligent tools.
					</p>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
					>
						Get Started Now
					</motion.button>
				</motion.div>
			</main>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-8 mt-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div className="flex items-center justify-center mb-4">
						<div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
							<Wallet className="h-5 w-5 text-white" />
						</div>
						<span className="text-xl font-bold">Budgetly</span>
					</div>
					<p className="text-gray-400 mb-4">
						AI-Powered Personal Finance Management Platform
					</p>
					<p className="text-sm text-gray-500">
						© 2025 Budgetly by Lumen Grove Analytics. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
};

export default Dashboard;