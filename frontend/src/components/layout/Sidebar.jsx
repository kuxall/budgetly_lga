import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
	Home,
	Receipt,
	Target,
	TrendingUp,
	BarChart3,
	Settings,
	Brain,
	Image,
	X,
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
	const navigation = [
		{ name: "Dashboard", href: "/dashboard", icon: Home },
		{ name: "Expenses", href: "/expenses", icon: Receipt },
		{ name: "Budgets", href: "/budgets", icon: Target },
		{ name: "Income", href: "/income", icon: TrendingUp },
		{ name: "Receipts", href: "/receipts", icon: Image },
		{ name: "AI Insights", href: "/ai-insights", icon: Brain },
		{ name: "Reports", href: "/reports", icon: BarChart3 },
		{ name: "Settings", href: "/settings", icon: Settings },
	];

	return (
		<>
			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
				<div className="flex min-h-0 flex-1 flex-col bg-gray-800">
					<div className="flex h-16 flex-shrink-0 items-center px-4">
						<h1 className="text-white text-xl font-semibold">Budgetly</h1>
					</div>
					<div className="flex flex-1 flex-col overflow-y-auto">
						<nav className="flex-1 space-y-1 px-2 py-4">
							{navigation.map((item) => (
								<NavLink
									key={item.name}
									to={item.href}
									className={({ isActive }) =>
										`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
											isActive
												? "bg-gray-900 text-white"
												: "text-gray-300 hover:bg-gray-700 hover:text-white"
										}`
									}
								>
									<item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
									{item.name}
								</NavLink>
							))}
						</nav>
					</div>
				</div>
			</div>

			{/* Mobile sidebar */}
			{isOpen && (
				<motion.div
					initial={{ x: -256 }}
					animate={{ x: 0 }}
					exit={{ x: -256 }}
					className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 lg:hidden"
				>
					<div className="flex h-16 flex-shrink-0 items-center justify-between px-4">
						<h1 className="text-white text-xl font-semibold">Budgetly</h1>
						<button
							onClick={onClose}
							className="text-gray-300 hover:text-white"
						>
							<X className="h-6 w-6" />
						</button>
					</div>
					<div className="flex flex-1 flex-col overflow-y-auto">
						<nav className="flex-1 space-y-1 px-2 py-4">
							{navigation.map((item) => (
								<NavLink
									key={item.name}
									to={item.href}
									onClick={onClose}
									className={({ isActive }) =>
										`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
											isActive
												? "bg-gray-900 text-white"
												: "text-gray-300 hover:bg-gray-700 hover:text-white"
										}`
									}
								>
									<item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
									{item.name}
								</NavLink>
							))}
						</nav>
					</div>
				</motion.div>
			)}
		</>
	);
};

export default Sidebar;
