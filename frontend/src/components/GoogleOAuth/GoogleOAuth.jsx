import { useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import { authApi } from "../../services/api";
import toast from "react-hot-toast";

const GoogleOAuth = ({ onSuccess, onError, className = "" }) => {
	const [loading, setLoading] = useState(false);
	const { login } = useAuthStore();

	const handleGoogleLogin = async () => {
		setLoading(true);
		try {
			// Load Google Identity Services
			if (!window.google) {
				throw new Error("Google Identity Services not loaded");
			}

			// Initialize Google OAuth
			window.google.accounts.id.initialize({
				client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
				callback: handleCredentialResponse,
				auto_select: false,
				cancel_on_tap_outside: true,
			});

			// Prompt for account selection
			window.google.accounts.id.prompt((notification) => {
				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					// Fallback to popup if prompt is not displayed
					window.google.accounts.id.renderButton(
						document.getElementById("google-signin-button"),
						{
							theme: "outline",
							size: "large",
							width: "100%",
						}
					);
				}
			});
		} catch (error) {
			toast.error("Failed to initialize Google Sign-In");
			setLoading(false);
			if (onError) onError(error);
		}
	};

	const handleCredentialResponse = async (response) => {
		try {
			setLoading(true);

			// Decode the JWT token to get user info
			const userInfo = parseJwt(response.credential);

			// Send the credential to your backend
			const result = await authApi.googleLogin({
				id_token: response.credential,
				user_data: {
					id: userInfo.sub,
					email: userInfo.email,
					verified_email: userInfo.email_verified,
					given_name: userInfo.given_name,
					family_name: userInfo.family_name,
					picture: userInfo.picture,
					locale: userInfo.locale,
				},
			});

			if (result.success) {
				// Store auth data
				login(result.user, result.tokens.access_token);
				toast.success("Successfully signed in with Google!");
				if (onSuccess) onSuccess(result);
			} else {
				throw new Error(result.message || "Google login failed");
			}
		} catch (error) {
			toast.error(error.message || "Google sign-in failed");
			if (onError) onError(error);
		} finally {
			setLoading(false);
		}
	};

	const parseJwt = (token) => {
		try {
			const base64Url = token.split(".")[1];
			const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
			const jsonPayload = decodeURIComponent(
				atob(base64)
					.split("")
					.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
					.join("")
			);
			return JSON.parse(jsonPayload);
		} catch (error) {
			return {};
		}
	};

	return (
		<div className={`google-oauth-container ${className}`}>
			<button
				onClick={handleGoogleLogin}
				disabled={loading}
				className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? (
					<div className="flex items-center">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
						Signing in...
					</div>
				) : (
					<div className="flex items-center">
						<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Continue with Google
					</div>
				)}
			</button>
{/* Hidden button for Google's renderButton fallback */ }
<div id="google-signin-button" className="hidden"></div>
		</div >
	);
};

export default GoogleOAuth;