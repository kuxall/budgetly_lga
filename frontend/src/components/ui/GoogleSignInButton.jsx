import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

const GoogleSignInButton = ({ text = "Continue with Google", className = "" }) => {
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
	const { login } = useAuthStore();
	const googleButtonRef = useRef(null);

	useEffect(() => {
		loadGoogleScript();
	}, []);

	const loadGoogleScript = async () => {
		try {
			// Check if Google Client ID is configured
			const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
			if (!clientId || clientId === 'your-google-client-id') {
				console.warn('Google OAuth not configured');
				return;
			}

			// Load Google Identity Services if not already loaded
			if (!window.google) {
				const script = document.createElement('script');
				script.src = 'https://accounts.google.com/gsi/client';
				script.async = true;
				script.defer = true;

				script.onload = () => {
					initializeGoogle();
				};

				script.onerror = () => {
					console.error('Failed to load Google Identity Services');
				};

				document.head.appendChild(script);
			} else {
				initializeGoogle();
			}
		} catch (error) {
			console.error('Error loading Google script:', error);
		}
	};

	const initializeGoogle = () => {
		try {
			const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

			window.google.accounts.id.initialize({
				client_id: clientId,
				callback: handleCredentialResponse,
				auto_select: false,
				cancel_on_tap_outside: true
			});

			setIsGoogleLoaded(true);
		} catch (error) {
			console.error('Error initializing Google:', error);
		}
	};

	const handleCredentialResponse = async (response) => {
		try {
			setIsLoading(true);
			console.log('Google credential response received');

			if (!response.credential) {
				throw new Error('No credential received from Google');
			}

			// Send the ID token to backend
			const result = await authApi.googleOAuthToken(response.credential);

			// Login with the returned user data
			const loginSuccess = await login(result.user, result.tokens.access_token);

			if (loginSuccess) {
				toast.success('Successfully signed in with Google!');
			} else {
				toast.error('Failed to complete sign-in');
			}

		} catch (error) {
			console.error('Google OAuth error:', error);
			toast.error(error.message || 'Failed to sign in with Google');
		} finally {
			setIsLoading(false);
		}
	};

	const handleButtonClick = async () => {
		if (!isGoogleLoaded) {
			toast.error('Google Sign-In is still loading...');
			return;
		}

		try {
			setIsLoading(true);

			// Use Google One Tap
			window.google.accounts.id.prompt((notification) => {
				console.log('Google prompt notification:', notification);

				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					// If One Tap doesn't work, fall back to popup
					console.log('One Tap not available, trying popup...');

					// Create a temporary button and click it
					const tempDiv = document.createElement('div');
					tempDiv.style.position = 'absolute';
					tempDiv.style.top = '-9999px';
					document.body.appendChild(tempDiv);

					window.google.accounts.id.renderButton(tempDiv, {
						theme: 'outline',
						size: 'large',
						type: 'standard'
					});

					// Trigger the Google button
					setTimeout(() => {
						const googleBtn = tempDiv.querySelector('div[role="button"]');
						if (googleBtn) {
							googleBtn.click();
						}
						document.body.removeChild(tempDiv);
					}, 100);
				}

				setIsLoading(false);
			});

		} catch (error) {
			console.error('Google Sign-In error:', error);
			toast.error('Failed to initialize Google Sign-In');
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full">
			<motion.button
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				onClick={handleButtonClick}
				disabled={isLoading || !isGoogleLoaded}
				className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}>
				{isLoading ? (
					<div className="flex items-center">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
						Signing in...
					</div>
				) : !isGoogleLoaded ? (
					<div className="flex items-center">
						<div className="animate-pulse w-5 h-5 bg-gray-300 rounded mr-2"></div>
						Loading...
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
						{text}
					</div>
				)}
			</motion.button>

			{/* Hidden div for Google button rendering */}
			<div ref={googleButtonRef} className="hidden"></div>
		</div>
	);
};

export default GoogleSignInButton;