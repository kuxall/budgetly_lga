import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useExpenseStore } from "../../store/expenseStore";

const Layout = () => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { fetchExpenses } = useExpenseStore();

	useEffect(() => {
		// Fetch initial data when layout mounts
		fetchExpenses();
	}, [fetchExpenses]);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Sidebar */}
			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

			{/* Main content */}
			<div className="lg:pl-64">
				{/* Header */}
				<Header onMenuClick={() => setSidebarOpen(true)} />

				{/* Page content */}
				<main className="py-6">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
						>
							<Outlet />
						</motion.div>
					</div>
				</main>
			</div>

			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}
		</div>
	);
};

export default Layout;