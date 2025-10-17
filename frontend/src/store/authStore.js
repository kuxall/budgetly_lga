import { create } from 'zustand';
import { authApi, setAuthToken } from '../services/api';
import toast from 'react-hot-toast';

// Helper functions for localStorage
const getStoredAuth = () => {
	try {
		const token = localStorage.getItem('auth_token');
		const user = localStorage.getItem('auth_user');
		return {
			token,
			user: user ? JSON.parse(user) : null
		};
	} catch (error) {
		console.error('Error reading auth from localStorage:', error);
		return { token: null, user: null };
	}
};

const setStoredAuth = (token, user) => {
	try {
		if (token && user) {
			localStorage.setItem('auth_token', token);
			localStorage.setItem('auth_user', JSON.stringify(user));
		} else {
			localStorage.removeItem('auth_token');
			localStorage.removeItem('auth_user');
		}
	} catch (error) {
		console.error('Error storing auth to localStorage:', error);
	}
};

// Initialize with stored auth data
const storedAuth = getStoredAuth();
console.log('Initializing auth store with stored data:', {
	hasToken: !!storedAuth.token,
	hasUser: !!storedAuth.user
});

// Set the auth token immediately if we have one
if (storedAuth.token) {
	console.log('Setting auth token from stored data');
	setAuthToken(storedAuth.token);
}

export const useAuthStore = create((set) => ({
	user: storedAuth.user,
	token: storedAuth.token,
	isAuthenticated: !!storedAuth.token,
	isLoading: !!storedAuth.token, // Start with loading if we have a token to validate

	login: async (emailOrUser, passwordOrToken) => {
		// Handle both login with credentials and direct login with user data + token
		if (typeof emailOrUser === 'object' && emailOrUser.id) {
			// Direct login with user object and token
			const user = emailOrUser;
			const token = passwordOrToken;

			setAuthToken(token);
			setStoredAuth(token, user);

			set({
				user,
				token,
				isAuthenticated: true,
				isLoading: false,
			});

			return true;
		} else {
			// Regular login with email and password
			const email = emailOrUser;
			const password = passwordOrToken;

			set({ isLoading: true });
			try {
				const response = await authApi.login(email, password);

				// Complete login
				setAuthToken(response.tokens.access_token);
				setStoredAuth(response.tokens.access_token, response.user);

				set({
					user: response.user,
					token: response.tokens.access_token,
					isAuthenticated: true,
					isLoading: false,
				});

				toast.success('Welcome back!');
				return true;
			} catch (error) {
				set({ isLoading: false });
				toast.error(error.message || 'Login failed');
				return false;
			}
		}
	},

	logout: () => {
		setAuthToken(null);
		setStoredAuth(null, null);

		set({
			user: null,
			token: null,
			isAuthenticated: false,
		});
		toast.success('Logged out successfully');
	},

	register: async (email, password, firstName, lastName) => {
		set({ isLoading: true });
		try {
			const response = await authApi.register(email, password, firstName, lastName);

			setAuthToken(response.tokens.access_token);
			setStoredAuth(response.tokens.access_token, response.user);

			set({
				user: response.user,
				token: response.tokens.access_token,
				isAuthenticated: true,
				isLoading: false,
			});

			toast.success('Account created successfully!');
			return true;
		} catch (error) {
			set({ isLoading: false });
			toast.error(error.message || 'Registration failed');
			return false;
		}
	},

	checkAuth: async () => {
		const { token, user } = getStoredAuth();
		if (token && user) {
			try {
				setAuthToken(token);
				set({
					user,
					token,
					isAuthenticated: true,
				});
			} catch (error) {
				// Token is invalid, clear auth
				setStoredAuth(null, null);
				set({
					user: null,
					token: null,
					isAuthenticated: false,
				});
			}
		} else {
			set({
				user: null,
				token: null,
				isAuthenticated: false,
			});
		}
	},

	// Initialize auth on app start
	initializeAuth: async () => {
		const { token, user } = getStoredAuth();
		console.log('initializeAuth called with:', { hasToken: !!token, hasUser: !!user });

		if (token && user) {
			setAuthToken(token);
			set({
				user,
				token,
				isAuthenticated: true,
				isLoading: false,
			});

			console.log('Auth initialized with stored data');
		} else {
			set({
				user: null,
				token: null,
				isAuthenticated: false,
				isLoading: false,
			});
		}
	},
}));