import React from "react";
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";

const Button = ({
	variant = "primary",
	size = "md",
	loading = false,
	children,
	className = "",
	disabled,
	...props
}) => {
	const baseClasses =
		"inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md";

	const variantClasses = {
		primary:
			"bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800",
		secondary:
			"bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 active:bg-gray-300 border border-gray-300",
		success:
			"bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 active:bg-success-800",
		danger:
			"bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 active:bg-danger-800",
		warning:
			"bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 active:bg-warning-800",
		ghost:
			"text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200 shadow-none",
	};

	const sizeClasses = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-sm",
		lg: "px-6 py-3 text-base",
	};

	return (
		<motion.button
			whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
			whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
			disabled={disabled || loading}
			{...props}
		>
			{loading && <LoadingSpinner size="sm" className="mr-2" />}
			{children}
		</motion.button>
	);
};

export default Button;