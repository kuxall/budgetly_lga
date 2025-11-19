import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";

const NotificationDropdown = () => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	const {
		notifications,
		unreadCount,
		isLoading,
		markAsRead,
		markAllAsRead,
		removeNotification,
		clearAll,
		startBudgetMonitoring,
		stopBudgetMonitoring,
	} = useNotificationStore();

	// Start budget monitoring on component mount
	useEffect(() => {
		const intervalId = startBudgetMonitoring();

		return () => {
			stopBudgetMonitoring(intervalId);
		};
	}, [startBudgetMonitoring, stopBudgetMonitoring]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const getSeverityIcon = (severity, type) => {
		// Special icons for different notification types
		if (type === 'financial_tip') {
			return <Info className="h-4 w-4 text-blue-500" />;
		}

		switch (severity) {
			case "critical":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case "warning":
				return <AlertCircle className="h-4 w-4 text-amber-500" />;
			case "success":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			default:
				return <Info className="h-4 w-4 text-blue-500" />;
		}
	};

	const getSeverityColor = (severity) => {
		switch (severity) {
			case "critical":
				return "border-red-200 bg-red-50";
			case "warning":
				return "border-amber-200 bg-amber-50";
			case "success":
				return "border-green-200 bg-green-50";
			default:
				return "border-blue-200 bg-blue-50";
		}
	};

	const formatTimestamp = (timestamp) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor((now - date) / (1000 * 60));

		if (diffInMinutes < 1) return "Just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		return date.toLocaleDateString();
	};

	const handleNotificationClick = (notification) => {
		if (!notification.read) {
			markAsRead(notification.id);
		}

		// Navigate based on notification type
		if (notification.type === "budget_alert") {
			window.location.href = "/budgets";
		} else if (notification.type === "financial_tip") {
			// Tips don't navigate anywhere, just mark as read
			return;
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Notification Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2"
			>
				<div className="flex items-center space-x-1">
					<span className="text-sm font-medium">Alerts</span>
					{unreadCount > 0 && (
						<span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</div>
			</button>

			{/* Dropdown Panel */}
			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
					{/* Header */}
					<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-900">
							Notifications {unreadCount > 0 && `(${unreadCount})`}
						</h3>
						<div className="flex items-center space-x-2">
							{notifications.length > 0 && (
								<>
									<button
										onClick={markAllAsRead}
										className="text-xs text-blue-600 hover:text-blue-800"
									>
										Mark all read
									</button>
									<button
										onClick={clearAll}
										className="text-xs text-gray-500 hover:text-gray-700"
									>
										Clear all
									</button>
								</>
							)}
						</div>
					</div>

					{/* Content */}
					<div className="max-h-96 overflow-y-auto">
						{isLoading ? (
							<div className="px-4 py-8 text-center text-gray-500">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
								Loading notifications...
							</div>
						) : notifications.length === 0 ? (
							<div className="px-4 py-8 text-center text-gray-500">
								<p className="text-sm">🎉 All clear!</p>
								<p className="text-xs text-gray-400 mt-1">
									No critical alerts. You'll see important budget warnings and tips here.
								</p>
							</div>
						) : (
							<div className="divide-y divide-gray-100">
								{notifications.map((notification) => (
									<div
										key={notification.id}
										className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? "bg-blue-50" : ""
											}`}
										onClick={() => handleNotificationClick(notification)}
									>
										<div className="flex items-start space-x-3">
											<div className="flex-shrink-0 mt-0.5">
												{getSeverityIcon(notification.severity, notification.type)}
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<p
															className={`text-sm font-medium text-gray-900 ${!notification.read ? "font-semibold" : ""
																}`}
														>
															{notification.title}
														</p>
														<p className="text-sm text-gray-600 mt-1">
															{notification.message}
														</p>
														<p className="text-xs text-gray-400 mt-1">
															{formatTimestamp(notification.timestamp)}
														</p>
													</div>

													<button
														onClick={(e) => {
															e.stopPropagation();
															removeNotification(notification.id);
														}}
														className="ml-2 text-gray-400 hover:text-gray-600"
													>
														<X className="h-4 w-4" />
													</button>
												</div>

												{/* Budget-specific info */}
												{notification.type === "budget_alert" &&
													notification.data && (
														<div
															className={`mt-2 p-2 rounded border ${getSeverityColor(
																notification.severity
															)}`}
														>
															<div className="flex justify-between text-xs">
																<span>
																	Spent: ${notification.data.spent?.toFixed(2)}
																</span>
																<span>
																	Budget: $
																	{notification.data.budget_amount?.toFixed(2)}
																</span>
															</div>
															<div className="mt-1 bg-gray-200 rounded-full h-1.5">
																<div
																	className={`h-1.5 rounded-full ${notification.severity === "critical"
																		? "bg-red-500"
																		: "bg-amber-500"
																		}`}
																	style={{
																		width: `${Math.min(
																			notification.data.percentage || 0,
																			100
																		)}%`,
																	}}
																></div>
															</div>
														</div>
													)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
						<button
							onClick={() => {
								setIsOpen(false);
								window.location.href = "/budgets";
							}}
							className="text-xs text-blue-600 hover:text-blue-800 font-medium"
						>
							View all budgets →
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
