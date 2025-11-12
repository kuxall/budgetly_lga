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
import BudgetlyTitle from "../ui/BudgetlyTitle";

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
				<div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700">
					<div className="flex h-16 flex-shrink-0 items-center px-4 border-b border-gray-700">
						<BudgetlyTitle
							size="small"
							animated={true}
							theme="dark"
							showTagline={false}
							className="text-white"
						/>
					</div>
					<div className="flex flex-1 flex-col overflow-y-auto">
						<nav className="flex-1 space-y-1 px-3 py-4">
							{navigation.map((item) => (
								<NavLink
									key={item.name}
									to={item.href}
									className={({ isActive }) =>
										`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
											? "bg-primary-600 text-white shadow-lg shadow-primary-600/50"
											: "text-gray-300 hover:bg-gray-700/50 hover:text-white"
										}`
									}
								>
									<item.icon className="h-5 w-5 flex-shrink-0" />
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
					className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 lg:hidden"
				>
					<div className="flex h-16 flex-shrink-0 items-center justify-between px-4 border-b border-gray-700">
						<BudgetlyTitle
							size="small"
							animated={true}
							theme="dark"
							showTagline={false}
							className="text-white"
						/>
						<button
							onClick={onClose}
							className="text-gray-300 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
						>
							<X className="h-6 w-6" />
						</button>
					</div>
					<div className="flex flex-1 flex-col overflow-y-auto">
						<nav className="flex-1 space-y-1 px-3 py-4">
							{navigation.map((item) => (
								<NavLink
									key={item.name}
									to={item.href}
									onClick={onClose}
									className={({ isActive }) =>
										`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
											? "bg-primary-600 text-white shadow-lg shadow-primary-600/50"
											: "text-gray-300 hover:bg-gray-700/50 hover:text-white"
										}`
									}
								>
									<item.icon className="h-5 w-5 flex-shrink-0" />
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
