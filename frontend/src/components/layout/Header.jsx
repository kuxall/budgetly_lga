import { Menu, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import NotificationDropdown from "../ui/NotificationDropdown";
import BudgetlyTitle from "../ui/BudgetlyTitle";

const Header = ({ onMenuClick }) => {
	const { user, logout } = useAuthStore();

	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 justify-between items-center">
					<div className="flex items-center">
						<button
							type="button"
							className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
							onClick={onMenuClick}
						>
							<Menu className="h-6 w-6" />
						</button>
						<div className="ml-4 lg:ml-0">
							<BudgetlyTitle
								size="small"
								animated={true}
								theme="light"
								showTagline={false}
							/>
						</div>
					</div>

					<div className="flex items-center space-x-4">
						<NotificationDropdown />

						<div className="relative">
							<button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
								<User className="h-6 w-6" />
								<span className="hidden sm:block">
									{user?.first_name || user?.email || "User"}
								</span>
							</button>
						</div>

						<button
							onClick={logout}
							className="text-gray-500 hover:text-gray-700 text-sm"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Header;
