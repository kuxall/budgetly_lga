import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Wallet, Mail, Lock, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import GoogleSignInButton from "../../components/ui/GoogleSignInButton";

const Register = () => {
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const { register, isLoading } = useAuthStore();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (formData.password !== formData.confirmPassword) {
			alert("Passwords don't match");
			return;
		}
		await register(
			formData.email,
			formData.password,
			formData.firstName,
			formData.lastName
		);
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-md w-full space-y-8"
			>
				<div className="text-center">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
						className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
					>
						<Wallet className="h-8 w-8 text-white" />
					</motion.div>
					<motion.h2
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3 }}
						className="mt-6 text-3xl font-bold text-gray-900"
					>
						Create your account
					</motion.h2>
				</div>

				<motion.form
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="mt-8 space-y-6"
					onSubmit={handleSubmit}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="firstName"
									className="block text-sm font-medium text-gray-700"
								>
									First Name
								</label>
								<div className="mt-1 relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<User className="h-5 w-5 text-gray-400" />
									</div>
									<input
										id="firstName"
										name="firstName"
										type="text"
										required
										className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
										placeholder="First name"
										value={formData.firstName}
										onChange={handleChange}
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="lastName"
									className="block text-sm font-medium text-gray-700"
								>
									Last Name
								</label>
								<div className="mt-1">
									<input
										id="lastName"
										name="lastName"
										type="text"
										required
										className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
										placeholder="Last name"
										value={formData.lastName}
										onChange={handleChange}
									/>
								</div>
							</div>
						</div>

						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700"
							>
								Email address
							</label>
							<div className="mt-1 relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Mail className="h-5 w-5 text-gray-400" />
								</div>
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									required
									className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
									placeholder="Enter your email"
									value={formData.email}
									onChange={handleChange}
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<div className="mt-1 relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-gray-400" />
								</div>
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="new-password"
									required
									className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
									placeholder="Enter your password"
									value={formData.password}
									onChange={handleChange}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
									) : (
										<Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
									)}
								</button>
							</div>
						</div>

						<div>
							<label
								htmlFor="confirmPassword"
								className="block text-sm font-medium text-gray-700"
							>
								Confirm Password
							</label>
							<div className="mt-1 relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-gray-400" />
								</div>
								<input
									id="confirmPassword"
									name="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									autoComplete="new-password"
									required
									className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
									placeholder="Confirm your password"
									value={formData.confirmPassword}
									onChange={handleChange}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									{showConfirmPassword ? (
										<EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
									) : (
										<Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
									)}
								</button>
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
					>
						{isLoading ? "Creating account..." : "Create account"}
					</button>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white text-gray-500">
								Or continue with
							</span>
						</div>
					</div>

					<GoogleSignInButton text="Sign up with Google" disabled={isLoading} />

					<div className="text-center">
						<span className="text-sm text-gray-600">
							Already have an account?{" "}
							<Link
								to="/login"
								className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
							>
								Sign in
							</Link>
						</span>
					</div>
				</motion.form>
			</motion.div>
		</div>
	);
};

export default Register;
