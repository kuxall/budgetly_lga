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
		"inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

	const variantClasses = {
		primary:
			"bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800",
		secondary:
			"bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 active:bg-gray-300",
		success:
			"bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800",
		danger:
			"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800",
		ghost:
			"text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200",
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