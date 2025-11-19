const BudgetlyTitle = ({
	size = "default",
	animated = false,
	theme = "light",
	showTagline = true,
	className = "",
}) => {
	const sizes = {
		small: { fontSize: "text-xl", iconSize: 16, taglineSize: "text-xs" },
		default: { fontSize: "text-3xl", iconSize: 20, taglineSize: "text-sm" },
		large: { fontSize: "text-4xl", iconSize: 24, taglineSize: "text-base" },
		xl: { fontSize: "text-5xl", iconSize: 28, taglineSize: "text-lg" },
	};

	const currentSize = sizes[size];
	const isDark = theme === "dark";

	return (
		<div className={`inline-flex flex-col ${className}`}>
			{/* Enhanced Budgetly Title with Integrated SVG */}
			<div className="flex items-center space-x-1">
				{/* "Budge" part */}
				<span
					className={`font-bold ${currentSize.fontSize} bg-gradient-to-r ${isDark
							? "from-white to-gray-200"
							: "from-gray-800 via-blue-600 to-purple-600"
						} bg-clip-text text-transparent tracking-tight`}
				>
					Budge
				</span>

				{/* SVG Dollar Sign replacing the 't' */}
				<div className="relative inline-flex items-center">
					<svg
						width={currentSize.iconSize}
						height={currentSize.iconSize + 4}
						viewBox="0 0 20 24"
						fill="none"
						className={animated ? "animate-pulse" : ""}
					>
						<defs>
							<linearGradient
								id="dollarGradient"
								x1="0%"
								y1="0%"
								x2="100%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#F59E0B" />
								<stop offset="50%" stopColor="#EF4444" />
								<stop offset="100%" stopColor="#DC2626" />
							</linearGradient>
							<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
								<feGaussianBlur stdDeviation="1" result="coloredBlur" />
								<feMerge>
									<feMergeNode in="coloredBlur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>

						{/* Dollar sign as stylized 't' */}
						<path
							d="M10 2v3m0 15v3m-6-12h8a3 3 0 0 1 0 6h-8m8 0h-8a3 3 0 0 1 0-6h8"
							stroke="url(#dollarGradient)"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="none"
							filter="url(#glow)"
						/>

						{/* Sparkle effects */}
						<circle cx="4" cy="5" r="1" fill="#FCD34D" opacity="0.8" />
						<circle cx="16" cy="19" r="0.8" fill="#F59E0B" opacity="0.6" />
					</svg>

					{/* Floating money emoji for animation */}
					{animated && (
						<div
							className="absolute -top-1 -right-1 animate-bounce"
							style={{ animationDelay: "1s" }}
						>
							<span className="text-xs">💰</span>
						</div>
					)}
				</div>

				{/* "ly" part */}
				<span
					className={`font-bold ${currentSize.fontSize} bg-gradient-to-r ${isDark
							? "from-blue-400 to-purple-400"
							: "from-purple-600 via-pink-500 to-orange-500"
						} bg-clip-text text-transparent tracking-tight`}
				>
					ly
				</span>

				{/* Decorative SVG elements */}
				<div className="ml-2 flex items-center space-x-1">
					{/* Coin stack SVG */}
					<svg
						width={currentSize.iconSize - 4}
						height={currentSize.iconSize - 4}
						viewBox="0 0 16 16"
						className={animated ? "animate-spin" : ""}
						style={animated ? { animationDuration: "6s" } : {}}
					>
						<defs>
							<linearGradient
								id="coinStack"
								x1="0%"
								y1="0%"
								x2="100%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#FCD34D" />
								<stop offset="100%" stopColor="#F59E0B" />
							</linearGradient>
						</defs>
						<circle
							cx="8"
							cy="8"
							r="6"
							fill="none"
							stroke="url(#coinStack)"
							strokeWidth="1.5"
							opacity="0.7"
						/>
						<circle cx="8" cy="8" r="3" fill="url(#coinStack)" opacity="0.8" />
						<path
							d="M6 8h4M8 6v4"
							stroke="white"
							strokeWidth="1"
							strokeLinecap="round"
						/>
					</svg>

					{/* Chart SVG */}
					<svg
						width={currentSize.iconSize - 6}
						height={currentSize.iconSize - 6}
						viewBox="0 0 14 14"
						className={animated ? "animate-bounce" : ""}
						style={
							animated
								? { animationDelay: "0.5s", animationDuration: "2s" }
								: {}
						}
					>
						<defs>
							<linearGradient
								id="chartGradient"
								x1="0%"
								y1="100%"
								x2="0%"
								y2="0%"
							>
								<stop offset="0%" stopColor="#10B981" />
								<stop offset="100%" stopColor="#34D399" />
							</linearGradient>
						</defs>
						<rect
							x="2"
							y="8"
							width="2"
							height="4"
							fill="url(#chartGradient)"
							rx="1"
						/>
						<rect
							x="5"
							y="6"
							width="2"
							height="6"
							fill="url(#chartGradient)"
							rx="1"
						/>
						<rect
							x="8"
							y="4"
							width="2"
							height="8"
							fill="url(#chartGradient)"
							rx="1"
						/>
						<rect
							x="11"
							y="2"
							width="2"
							height="10"
							fill="url(#chartGradient)"
							rx="1"
						/>
					</svg>
				</div>
			</div>

			{/* Tagline with animated dots */}
			{showTagline && (
				<div className="flex items-center space-x-2 -mt-1">
					<span
						className={`${currentSize.taglineSize} ${isDark ? "text-gray-300" : "text-gray-600"
							} tracking-wide font-medium`}
					>
						AI-Powered Financial Management
					</span>

					{animated && (
						<div className="flex space-x-1">
							<div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
							<div
								className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"
								style={{ animationDelay: "0.2s" }}
							></div>
							<div
								className="w-1 h-1 bg-pink-400 rounded-full animate-pulse"
								style={{ animationDelay: "0.4s" }}
							></div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default BudgetlyTitle;
