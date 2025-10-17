/**
 * Google OAuth service for frontend authentication
 */

class GoogleAuthService {
	constructor() {
		this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
		this.isInitialized = false;
		this.gapi = null;
	}

	/**
	 * Initialize Google API
	 */
	async initialize() {
		if (this.isInitialized) return;

		return new Promise((resolve, reject) => {
			// Load Google API script
			if (!window.gapi) {
				const script = document.createElement('script');
				script.src = 'https://apis.google.com/js/api.js';
				script.onload = () => {
					this.loadAuth2().then(resolve).catch(reject);
				};
				script.onerror = () => reject(new Error('Failed to load Google API'));
				document.head.appendChild(script);
			} else {
				this.loadAuth2().then(resolve).catch(reject);
			}
		});
	}

	/**
	 * Load Google Auth2 library
	 */
	async loadAuth2() {
		return new Promise((resolve, reject) => {
			window.gapi.load('auth2', {
				callback: () => {
					window.gapi.auth2.init({
						client_id: this.clientId,
						scope: 'openid email profile'
					}).then(() => {
						this.isInitialized = true;
						this.gapi = window.gapi;
						resolve();
					}).catch(reject);
				},
				onerror: () => reject(new Error('Failed to load Google Auth2'))
			});
		});
	}

	/**
	 * Sign in with Google
	 */
	async signIn() {
		try {
			await this.initialize();

			const authInstance = this.gapi.auth2.getAuthInstance();
			const googleUser = await authInstance.signIn();

			const profile = googleUser.getBasicProfile();
			const idToken = googleUser.getAuthResponse().id_token;

			return {
				id_token: idToken,
				user: {
					google_id: profile.getId(),
					email: profile.getEmail(),
					first_name: profile.getGivenName(),
					last_name: profile.getFamilyName(),
					picture: profile.getImageUrl(),
					email_verified: profile.getEmail() ? true : false
				}
			};
		} catch (error) {
			console.error('Google sign-in error:', error);
			throw new Error('Failed to sign in with Google');
		}
	}

	/**
	 * Sign out from Google
	 */
	async signOut() {
		try {
			if (!this.isInitialized) return;

			const authInstance = this.gapi.auth2.getAuthInstance();
			await authInstance.signOut();
		} catch (error) {
			console.error('Google sign-out error:', error);
		}
	}

	/**
	 * Check if user is signed in
	 */
	async isSignedIn() {
		try {
			await this.initialize();
			const authInstance = this.gapi.auth2.getAuthInstance();
			return authInstance.isSignedIn.get();
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get current user
	 */
	async getCurrentUser() {
		try {
			await this.initialize();
			const authInstance = this.gapi.auth2.getAuthInstance();

			if (!authInstance.isSignedIn.get()) {
				return null;
			}

			const googleUser = authInstance.currentUser.get();
			const profile = googleUser.getBasicProfile();
			const idToken = googleUser.getAuthResponse().id_token;

			return {
				id_token: idToken,
				user: {
					google_id: profile.getId(),
					email: profile.getEmail(),
					first_name: profile.getGivenName(),
					last_name: profile.getFamilyName(),
					picture: profile.getImageUrl(),
					email_verified: true
				}
			};
		} catch (error) {
			console.error('Failed to get current user:', error);
			return null;
		}
	}
}

// Alternative implementation using Google Identity Services (newer approach)
class GoogleIdentityService {
	constructor() {
		this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
		this.isInitialized = false;
	}

	/**
	 * Initialize Google Identity Services
	 */
	async initialize() {
		if (this.isInitialized) return;

		return new Promise((resolve, reject) => {
			if (!window.google) {
				const script = document.createElement('script');
				script.src = 'https://accounts.google.com/gsi/client';
				script.onload = () => {
					this.isInitialized = true;
					resolve();
				};
				script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
				document.head.appendChild(script);
			} else {
				this.isInitialized = true;
				resolve();
			}
		});
	}

	/**
	 * Sign in with Google using popup
	 */
	async signInWithPopup() {
		try {
			await this.initialize();

			return new Promise((resolve, reject) => {
				window.google.accounts.id.initialize({
					client_id: this.clientId,
					callback: (response) => {
						resolve({
							id_token: response.credential
						});
					}
				});

				// Use the popup method
				window.google.accounts.oauth2.initTokenClient({
					client_id: this.clientId,
					scope: 'openid email profile',
					callback: (response) => {
						if (response.error) {
							reject(new Error(response.error));
						} else {
							// Get ID token
							window.google.accounts.id.initialize({
								client_id: this.clientId,
								callback: (idResponse) => {
									resolve({
										id_token: idResponse.credential,
										access_token: response.access_token
									});
								}
							});

							// Prompt for ID token
							window.google.accounts.id.prompt();
						}
					}
				}).requestAccessToken();
			});
		} catch (error) {
			console.error('Google Identity sign-in error:', error);
			throw new Error('Failed to sign in with Google');
		}
	}

	/**
	 * Render Google Sign-In button
	 */
	renderButton(element, options = {}) {
		this.initialize().then(() => {
			window.google.accounts.id.initialize({
				client_id: this.clientId,
				callback: options.callback || (() => { }),
				auto_select: false,
				cancel_on_tap_outside: true
			});

			window.google.accounts.id.renderButton(element, {
				theme: options.theme || 'outline',
				size: options.size || 'large',
				type: options.type || 'standard',
				shape: options.shape || 'rectangular',
				text: options.text || 'signin_with',
				logo_alignment: options.logo_alignment || 'left',
				width: options.width || 250
			});
		});
	}
}

// Export both services - use GoogleIdentityService for new implementations
export const googleAuthService = new GoogleAuthService();
export const googleIdentityService = new GoogleIdentityService();
export default googleIdentityService;