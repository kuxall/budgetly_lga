import { useState, useEffect } from "react";
import {
	User,
	Lock,
	Shield,
	Settings as SettingsIcon,
	Receipt,
	Download,
	Trash2,
	Eye,
	EyeOff,
	Save,
	AlertTriangle,
	CheckCircle,
	Globe,
	Calendar,
	DollarSign,
	Mail,
	BarChart3,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { settingsApi } from "../../services/api";
import { useGlobalToast } from "../../contexts/ToastContext";
import { useGlobalModal } from "../../contexts/ModalContext";

const Settings = () => {
	const { user } = useAuthStore();
	const [activeTab, setActiveTab] = useState("account");
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState(0);
	const { success, error, warning, info } = useGlobalToast();
	const { confirm } = useGlobalModal();
	const [statistics, setStatistics] = useState({
		daysActive: 0,
		totalExpenses: 0,
		receiptsProcessed: 0,
		totalUploaded: 0,
		autoProcessed: 0,
		manualReview: 0,
		storageUsed: "0 MB",
	});

	// Form states
	const [profile, setProfile] = useState({
		firstName: "",
		lastName: "",
		email: "",
	});

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [preferences, setPreferences] = useState({
		currency: "CAD",
		dateFormat: "DD/MM/YYYY",
		language: "en",
		timezone: "America/Toronto",
		theme: "light",
	});

	const [notifications, setNotifications] = useState({
		emailNotifications: true,
		budgetAlerts: true,
		receiptReminders: false,
		weeklyReports: true,
		securityAlerts: true,
	});

	const [receiptSettings, setReceiptSettings] = useState({
		autoProcess: true,
		storageTime: "24",
		maxFileSize: "10",
		allowedFormats: ["JPEG", "PNG", "WebP", "TIFF", "PDF"],
	});

	const [securitySettings, setSecuritySettings] = useState({
		loginNotifications: true,
	});

	useEffect(() => {
		// Load user data and settings
		if (user) {
			setProfile({
				firstName: user.first_name || "",
				lastName: user.last_name || "",
				email: user.email || "",
			});

			// Load user settings from backend
			loadUserSettings();
			loadUserStatistics();
		}
	}, [user]);

	const loadUserSettings = async () => {
		try {
			const response = await settingsApi.getSettings();
			if (response.success) {
				const settings = response.settings;

				// Update state with loaded settings
				setProfile(settings.profile);
				setPreferences(settings.preferences);
				setNotifications(settings.notifications);
				setReceiptSettings(settings.receiptSettings);
				setSecuritySettings(
					settings.security || {
						loginNotifications: true,
					}
				);
			}
		} catch (error) {
			// Don't show error toast on initial load, just use defaults
		}
	};

	const loadUserStatistics = async () => {
		try {
			const response = await settingsApi.getStatistics();
			if (response.success) {
				setStatistics(response.statistics);
			}
		} catch (error) {
			// Don't show error toast, just use defaults
		}
	};

	const tabs = [
		{ id: "account", name: "Account", icon: User },
		{ id: "security", name: "Security", icon: Lock },
		{ id: "receipts", name: "Receipts", icon: Receipt },
		{ id: "preferences", name: "Preferences", icon: SettingsIcon },
		{ id: "privacy", name: "Privacy & Data", icon: Shield },
	];

	const handleProfileUpdate = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.updateProfile(profile);
			if (response.success) {
				success("Profile updated successfully!");
			}
		} catch (err) {
			error(err.message || "Failed to update profile");
		} finally {
			setLoading(false);
		}
	};

	const calculatePasswordStrength = (password) => {
		let strength = 0;
		if (password.length >= 8) strength += 1;
		if (password.match(/[a-z]/)) strength += 1;
		if (password.match(/[A-Z]/)) strength += 1;
		if (password.match(/[0-9]/)) strength += 1;
		if (password.match(/[^a-zA-Z0-9]/)) strength += 1;
		return strength;
	};

	const getPasswordStrengthText = (strength) => {
		switch (strength) {
			case 0:
			case 1:
				return { text: "Very Weak", color: "text-red-600" };
			case 2:
				return { text: "Weak", color: "text-orange-600" };
			case 3:
				return { text: "Fair", color: "text-yellow-600" };
			case 4:
				return { text: "Good", color: "text-blue-600" };
			case 5:
				return { text: "Strong", color: "text-green-600" };
			default:
				return { text: "", color: "" };
		}
	};

	const handlePasswordChange = async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			error("New passwords don't match");
			return;
		}

		if (passwordForm.newPassword.length < 8) {
			error("Password must be at least 8 characters long");
			return;
		}

		if (passwordStrength < 3) {
			warning("Please choose a stronger password");
			return;
		}

		setLoading(true);
		try {
			const response = await settingsApi.changePassword(
				passwordForm.currentPassword,
				passwordForm.newPassword
			);
			if (response.success) {
				success("Password changed successfully!");
				setPasswordForm({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
			}
		} catch (err) {
			error(err.message || "Failed to change password");
		} finally {
			setLoading(false);
		}
	};

	const handlePreferencesUpdate = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.updatePreferences(preferences);
			if (response.success) {
				success("Preferences updated successfully!");
			}
		} catch (err) {
			error(err.message || "Failed to update preferences");
		} finally {
			setLoading(false);
		}
	};

	const handleNotificationsUpdate = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.updateNotifications(notifications);
			if (response.success) {
				success("Notification preferences updated!");
			}
		} catch (err) {
			error(err.message || "Failed to update notifications");
		} finally {
			setLoading(false);
		}
	};

	const handleReceiptSettingsUpdate = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.updateReceiptSettings(receiptSettings);
			if (response.success) {
				success("Receipt settings updated!");
			}
		} catch (err) {
			error(err.message || "Failed to update receipt settings");
		} finally {
			setLoading(false);
		}
	};

	const handleSecuritySettingsUpdate = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.updateSecuritySettings(
				securitySettings
			);
			if (response.success) {
				success("Security settings updated!");
			}
		} catch (err) {
			error(err.message || "Failed to update security settings");
		} finally {
			setLoading(false);
		}
	};

	const handleExportData = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.exportData();
			if (response.success) {
				info("Data export started! You'll receive an email when ready.");
			}
		} catch (err) {
			error(err.message || "Failed to export data");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteAccount = async () => {
		const confirmed = await confirm({
			title: "Delete Account",
			message:
				"⚠️ DANGER ZONE ⚠️\n\nThis will permanently delete your account and ALL data including:\n• All expenses and income records\n• Budget settings and history\n• Receipt images and data\n• Personal preferences\n• Account information\n\nThis action cannot be undone. Are you absolutely sure?",
			confirmText: "Delete My Account",
			cancelText: "Keep My Account",
			type: "danger",
		});

		if (confirmed) {
			confirmDeleteAccount();
		}
	};

	const confirmDeleteAccount = async () => {
		setLoading(true);
		try {
			const response = await settingsApi.deleteAccount();
			if (response.success) {
				success("Account deletion initiated. You will be logged out shortly.");
				// Logout user and redirect
				setTimeout(() => {
					// Clear auth store and redirect to login
					useAuthStore.getState().logout();
					window.location.href = "/login";
				}, 2000);
			}
		} catch (err) {
			error(err.message || "Failed to delete account");
		} finally {
			setLoading(false);
		}
	};

	const renderTabContent = () => {
		switch (activeTab) {
			case "account":
				return (
					<div className="space-y-6">
						{/* Profile Information */}
						<div className="bg-white shadow-lg rounded-xl border border-gray-100">
							<div className="px-6 py-5">
								<h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
									<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
										<User className="h-5 w-5 text-blue-600" />
									</div>
									Profile Information
								</h4>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-sm font-medium text-gray-700">
											First Name
										</label>
										<input
											type="text"
											value={profile.firstName}
											onChange={(e) =>
												setProfile({ ...profile, firstName: e.target.value })
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
											placeholder="Enter first name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Last Name
										</label>
										<input
											type="text"
											value={profile.lastName}
											onChange={(e) =>
												setProfile({ ...profile, lastName: e.target.value })
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
											placeholder="Enter last name"
										/>
									</div>
									<div className="sm:col-span-2">
										<label className="block text-sm font-medium text-gray-700">
											Email Address
										</label>
										<input
											type="email"
											value={profile.email}
											onChange={(e) =>
												setProfile({ ...profile, email: e.target.value })
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
											placeholder="Enter email address"
										/>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handleProfileUpdate}
										disabled={loading}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Save className="h-4 w-4 mr-2" />
										{loading ? "Updating..." : "Update Profile"}
									</button>
								</div>
							</div>
						</div>

						{/* Account Statistics */}
						<div className="bg-white shadow-lg rounded-xl border border-gray-100">
							<div className="px-6 py-5">
								<h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
									<div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
										<BarChart3 className="h-5 w-5 text-purple-600" />
									</div>
									Account Statistics
								</h4>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<div className="text-center">
										<div className="text-2xl font-bold text-blue-600">
											{statistics.daysActive}
										</div>
										<div className="text-sm text-gray-500">Days Active</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-green-600">
											{statistics.totalExpenses}
										</div>
										<div className="text-sm text-gray-500">Total Expenses</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-purple-600">
											{statistics.receiptsProcessed}
										</div>
										<div className="text-sm text-gray-500">
											Receipts Processed
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);

			case "security":
				return (
					<div className="space-y-6">
						{/* Change Password */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<Lock className="h-5 w-5 mr-2" />
									Change Password
								</h4>
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Current Password
										</label>
										<div className="mt-1 relative">
											<input
												type={showCurrentPassword ? "text" : "password"}
												value={passwordForm.currentPassword}
												onChange={(e) =>
													setPasswordForm({
														...passwordForm,
														currentPassword: e.target.value,
													})
												}
												className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
												placeholder="Enter current password"
											/>
											<button
												type="button"
												onClick={() =>
													setShowCurrentPassword(!showCurrentPassword)
												}
												className="absolute inset-y-0 right-0 pr-3 flex items-center"
											>
												{showCurrentPassword ? (
													<EyeOff className="h-4 w-4 text-gray-400" />
												) : (
													<Eye className="h-4 w-4 text-gray-400" />
												)}
											</button>
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											New Password
										</label>
										<div className="mt-1 relative">
											<input
												type={showPassword ? "text" : "password"}
												value={passwordForm.newPassword}
												onChange={(e) => {
													const newPassword = e.target.value;
													setPasswordForm({
														...passwordForm,
														newPassword: newPassword,
													});
													setPasswordStrength(
														calculatePasswordStrength(newPassword)
													);
												}}
												className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
												placeholder="Enter new password"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute inset-y-0 right-0 pr-3 flex items-center"
											>
												{showPassword ? (
													<EyeOff className="h-4 w-4 text-gray-400" />
												) : (
													<Eye className="h-4 w-4 text-gray-400" />
												)}
											</button>
										</div>
										{passwordForm.newPassword && (
											<div className="mt-2">
												<div className="flex items-center space-x-2">
													<div className="flex-1 bg-gray-200 rounded-full h-2">
														<div
															className={`h-2 rounded-full transition-all duration-300 ${
																passwordStrength === 1
																	? "bg-red-500 w-1/5"
																	: passwordStrength === 2
																	? "bg-orange-500 w-2/5"
																	: passwordStrength === 3
																	? "bg-yellow-500 w-3/5"
																	: passwordStrength === 4
																	? "bg-blue-500 w-4/5"
																	: passwordStrength === 5
																	? "bg-green-500 w-full"
																	: "w-0"
															}`}
														></div>
													</div>
													<span
														className={`text-xs font-medium ${
															getPasswordStrengthText(passwordStrength).color
														}`}
													>
														{getPasswordStrengthText(passwordStrength).text}
													</span>
												</div>
											</div>
										)}
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Confirm New Password
										</label>
										<input
											type="password"
											value={passwordForm.confirmPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													confirmPassword: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
											placeholder="Confirm new password"
										/>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handlePasswordChange}
										disabled={
											loading ||
											!passwordForm.currentPassword ||
											!passwordForm.newPassword ||
											!passwordForm.confirmPassword
										}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Lock className="h-4 w-4 mr-2" />
										{loading ? "Changing..." : "Change Password"}
									</button>
								</div>
							</div>
						</div>

						{/* Security Settings */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<Shield className="h-5 w-5 mr-2" />
									Security Settings
								</h4>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h5 className="text-sm font-medium text-gray-900">
												Login Notifications
											</h5>
											<p className="text-sm text-gray-500">
												Get notified when someone logs into your account
											</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={securitySettings.loginNotifications}
												onChange={(e) =>
													setSecuritySettings({
														...securitySettings,
														loginNotifications: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handleSecuritySettingsUpdate}
										disabled={loading}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Save className="h-4 w-4 mr-2" />
										{loading ? "Saving..." : "Save Security Settings"}
									</button>
								</div>
							</div>
						</div>
					</div>
				);

			case "receipts":
				return (
					<div className="space-y-6">
						{/* Receipt Processing Settings */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<Receipt className="h-5 w-5 mr-2" />
									Receipt Processing
								</h4>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h5 className="text-sm font-medium text-gray-900">
												Auto-Process Receipts
											</h5>
											<p className="text-sm text-gray-500">
												Automatically create expenses from high-confidence
												receipts
											</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={receiptSettings.autoProcess}
												onChange={(e) =>
													setReceiptSettings({
														...receiptSettings,
														autoProcess: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Storage Duration (hours)
										</label>
										<select
											value={receiptSettings.storageTime}
											onChange={(e) =>
												setReceiptSettings({
													...receiptSettings,
													storageTime: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="12">12 hours</option>
											<option value="24">24 hours</option>
											<option value="48">48 hours</option>
											<option value="72">72 hours</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Maximum File Size (MB)
										</label>
										<select
											value={receiptSettings.maxFileSize}
											onChange={(e) =>
												setReceiptSettings({
													...receiptSettings,
													maxFileSize: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="5">5 MB</option>
											<option value="10">10 MB</option>
											<option value="15">15 MB</option>
											<option value="20">20 MB</option>
										</select>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handleReceiptSettingsUpdate}
										disabled={loading}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Save className="h-4 w-4 mr-2" />
										{loading ? "Saving..." : "Save Settings"}
									</button>
								</div>
							</div>
						</div>

						{/* Receipt Statistics */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4">
									Receipt Statistics
								</h4>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
									<div className="text-center">
										<div className="text-2xl font-bold text-blue-600">
											{statistics.totalUploaded}
										</div>
										<div className="text-sm text-gray-500">Total Uploaded</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-green-600">
											{statistics.autoProcessed}
										</div>
										<div className="text-sm text-gray-500">Auto-Processed</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-yellow-600">
											{statistics.manualReview}
										</div>
										<div className="text-sm text-gray-500">Manual Review</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-purple-600">
											{statistics.storageUsed}
										</div>
										<div className="text-sm text-gray-500">Storage Used</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);

			case "notifications":
				return (
					<div className="space-y-6">
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									Notification Preferences
								</h4>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<Mail className="h-5 w-5 text-gray-400 mr-3" />
											<div>
												<h5 className="text-sm font-medium text-gray-900">
													Email Notifications
												</h5>
												<p className="text-sm text-gray-500">
													Receive important updates via email
												</p>
											</div>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.emailNotifications}
												onChange={(e) =>
													setNotifications({
														...notifications,
														emailNotifications: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<AlertTriangle className="h-5 w-5 text-gray-400 mr-3" />
											<div>
												<h5 className="text-sm font-medium text-gray-900">
													Budget Alerts
												</h5>
												<p className="text-sm text-gray-500">
													Get notified when approaching budget limits
												</p>
											</div>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.budgetAlerts}
												onChange={(e) =>
													setNotifications({
														...notifications,
														budgetAlerts: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<Receipt className="h-5 w-5 text-gray-400 mr-3" />
											<div>
												<h5 className="text-sm font-medium text-gray-900">
													Receipt Reminders
												</h5>
												<p className="text-sm text-gray-500">
													Reminders to upload receipts for expenses
												</p>
											</div>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.receiptReminders}
												onChange={(e) =>
													setNotifications({
														...notifications,
														receiptReminders: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<CheckCircle className="h-5 w-5 text-gray-400 mr-3" />
											<div>
												<h5 className="text-sm font-medium text-gray-900">
													Weekly Reports
												</h5>
												<p className="text-sm text-gray-500">
													Weekly spending summary and insights
												</p>
											</div>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.weeklyReports}
												onChange={(e) =>
													setNotifications({
														...notifications,
														weeklyReports: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<Shield className="h-5 w-5 text-gray-400 mr-3" />
											<div>
												<h5 className="text-sm font-medium text-gray-900">
													Security Alerts
												</h5>
												<p className="text-sm text-gray-500">
													Important security and login notifications
												</p>
											</div>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.securityAlerts}
												onChange={(e) =>
													setNotifications({
														...notifications,
														securityAlerts: e.target.checked,
													})
												}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
										</label>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handleNotificationsUpdate}
										disabled={loading}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Save className="h-4 w-4 mr-2" />
										{loading ? "Saving..." : "Save Preferences"}
									</button>
								</div>
							</div>
						</div>
					</div>
				);

			case "preferences":
				return (
					<div className="space-y-6">
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<SettingsIcon className="h-5 w-5 mr-2" />
									Application Preferences
								</h4>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-sm font-medium text-gray-700 flex items-center">
											<DollarSign className="h-4 w-4 mr-2" />
											Currency
										</label>
										<select
											value={preferences.currency}
											onChange={(e) =>
												setPreferences({
													...preferences,
													currency: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="CAD">CAD (C$)</option>
											<option value="USD">USD ($)</option>
											<option value="EUR">EUR (€)</option>
											<option value="GBP">GBP (£)</option>
											<option value="AUD">AUD (A$)</option>
											<option value="JPY">JPY (¥)</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											Date Format
										</label>
										<select
											value={preferences.dateFormat}
											onChange={(e) =>
												setPreferences({
													...preferences,
													dateFormat: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="MM/DD/YYYY">MM/DD/YYYY</option>
											<option value="DD/MM/YYYY">DD/MM/YYYY</option>
											<option value="YYYY-MM-DD">YYYY-MM-DD</option>
											<option value="DD MMM YYYY">DD MMM YYYY</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 flex items-center">
											<Globe className="h-4 w-4 mr-2" />
											Language
										</label>
										<select
											value={preferences.language}
											onChange={(e) =>
												setPreferences({
													...preferences,
													language: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="en">English</option>
											<option value="es">Español</option>
											<option value="fr">Français</option>
											<option value="de">Deutsch</option>
											<option value="it">Italiano</option>
											<option value="pt">Português</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Timezone
										</label>
										<select
											value={preferences.timezone}
											onChange={(e) =>
												setPreferences({
													...preferences,
													timezone: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="America/Toronto">
												Eastern Time - Toronto (ET)
											</option>
											<option value="America/Vancouver">
												Pacific Time - Vancouver (PT)
											</option>
											<option value="America/Winnipeg">
												Central Time - Winnipeg (CT)
											</option>
											<option value="America/Halifax">
												Atlantic Time - Halifax (AT)
											</option>
											<option value="America/St_Johns">
												Newfoundland Time - St. John's (NT)
											</option>
											<option value="America/New_York">
												Eastern Time - US (ET)
											</option>
											<option value="America/Chicago">
												Central Time - US (CT)
											</option>
											<option value="America/Denver">
												Mountain Time - US (MT)
											</option>
											<option value="America/Los_Angeles">
												Pacific Time - US (PT)
											</option>
											<option value="Europe/London">London (GMT)</option>
											<option value="Europe/Paris">Paris (CET)</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">
											Theme
										</label>
										<select
											value={preferences.theme}
											onChange={(e) =>
												setPreferences({
													...preferences,
													theme: e.target.value,
												})
											}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										>
											<option value="light">Light</option>
											<option value="dark">Dark</option>
											<option value="auto">Auto (System)</option>
										</select>
									</div>
								</div>
								<div className="mt-6">
									<button
										onClick={handlePreferencesUpdate}
										disabled={loading}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
									>
										<Save className="h-4 w-4 mr-2" />
										{loading ? "Saving..." : "Save Preferences"}
									</button>
								</div>
							</div>
						</div>
					</div>
				);

			case "privacy":
				return (
					<div className="space-y-6">
						{/* Data Export */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<Download className="h-5 w-5 mr-2" />
									Data Export
								</h4>
								<p className="text-sm text-gray-600 mb-4">
									Download a copy of all your data including expenses, receipts,
									budgets, and account information.
								</p>
								<button
									onClick={handleExportData}
									disabled={loading}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
								>
									<Download className="h-4 w-4 mr-2" />
									{loading ? "Preparing Export..." : "Export My Data"}
								</button>
							</div>
						</div>

						{/* Data Retention */}
						<div className="bg-white shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-gray-900 mb-4">
									Data Retention Policy
								</h4>
								<div className="space-y-3 text-sm text-gray-600">
									<div className="flex justify-between">
										<span>Receipt Images:</span>
										<span className="font-medium">
											24-72 hours (configurable)
										</span>
									</div>
									<div className="flex justify-between">
										<span>Expense Data:</span>
										<span className="font-medium">
											Retained until account deletion
										</span>
									</div>
									<div className="flex justify-between">
										<span>Account Information:</span>
										<span className="font-medium">
											Retained until account deletion
										</span>
									</div>
									<div className="flex justify-between">
										<span>Activity Logs:</span>
										<span className="font-medium">90 days</span>
									</div>
								</div>
							</div>
						</div>

						{/* Danger Zone */}
						<div className="bg-white shadow rounded-lg border-l-4 border-red-400">
							<div className="px-4 py-5 sm:p-6">
								<h4 className="text-lg font-medium text-red-900 mb-4 flex items-center">
									<Trash2 className="h-5 w-5 mr-2" />
									Danger Zone
								</h4>
								<div className="bg-red-50 border border-red-200 rounded-md p-4">
									<div className="flex">
										<div className="flex-shrink-0">
											<AlertTriangle className="h-5 w-5 text-red-400" />
										</div>
										<div className="ml-3">
											<h5 className="text-sm font-medium text-red-800">
												Delete Account
											</h5>
											<div className="mt-2 text-sm text-red-700">
												<p>
													Once you delete your account, there is no going back.
													Please be certain. This will permanently delete:
												</p>
												<ul className="mt-2 list-disc list-inside">
													<li>All your expenses and financial data</li>
													<li>All uploaded receipts and images</li>
													<li>Your account and profile information</li>
													<li>All budgets and categories</li>
												</ul>
											</div>
											<div className="mt-4">
												<button
													onClick={handleDeleteAccount}
													disabled={loading}
													className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													{loading ? "Deleting..." : "Delete Account"}
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					{/* Modern Header */}
					<div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg text-white mb-6">
						<div className="px-6 py-8">
							<h1 className="text-2xl font-bold flex items-center">
								<SettingsIcon className="h-8 w-8 mr-3" />
								Settings
							</h1>
							<p className="mt-2 text-gray-300">
								Manage your account settings and preferences
							</p>
						</div>
					</div>

					<div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
						{/* Sidebar */}
						<aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
							<nav className="space-y-1">
								{tabs.map((tab) => {
									const Icon = tab.icon;
									return (
										<button
											key={tab.id}
											onClick={() => setActiveTab(tab.id)}
											className={`${
												activeTab === tab.id
													? "bg-blue-50 border-blue-500 text-blue-700"
													: "border-transparent text-gray-900 hover:bg-gray-50 hover:text-gray-900"
											} group border-l-4 px-3 py-2 flex items-center text-sm font-medium w-full text-left`}
										>
											<Icon
												className={`${
													activeTab === tab.id
														? "text-blue-500"
														: "text-gray-400 group-hover:text-gray-500"
												} flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
											/>
											<span className="truncate">{tab.name}</span>
										</button>
									);
								})}
							</nav>
						</aside>

						{/* Main content */}
						<div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
							{renderTabContent()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Settings;
