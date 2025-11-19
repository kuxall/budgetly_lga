import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { budgetApi } from '../services/api';

const useNotificationStore = create(
	persist(
		(set, get) => ({
			notifications: [],
			unreadCount: 0,
			isLoading: false,
			error: null,

			// Add a new notification
			addNotification: (notification) => {
				const newNotification = {
					id: Date.now().toString(),
					timestamp: new Date().toISOString(),
					read: false,
					...notification,
				};

				set((state) => ({
					notifications: [newNotification, ...state.notifications],
					unreadCount: state.unreadCount + 1,
				}));
			},

			// Mark notification as read
			markAsRead: (notificationId) => {
				set((state) => ({
					notifications: state.notifications.map((notification) =>
						notification.id === notificationId
							? { ...notification, read: true }
							: notification
					),
					unreadCount: Math.max(0, state.unreadCount - 1),
				}));
			},

			// Mark all notifications as read
			markAllAsRead: () => {
				set((state) => ({
					notifications: state.notifications.map((notification) => ({
						...notification,
						read: true,
					})),
					unreadCount: 0,
				}));
			},

			// Remove a notification
			removeNotification: (notificationId) => {
				set((state) => {
					const notification = state.notifications.find(n => n.id === notificationId);
					const wasUnread = notification && !notification.read;

					return {
						notifications: state.notifications.filter(n => n.id !== notificationId),
						unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
					};
				});
			},

			// Clear all notifications
			clearAll: () => {
				set({
					notifications: [],
					unreadCount: 0,
				});
			},

			// Fetch budget alerts from API (only critical over-budget alerts)
			fetchBudgetAlerts: async () => {
				set({ isLoading: true, error: null });

				try {
					const response = await budgetApi.getBudgetAlerts();
					const alerts = response.alerts || [];

					// Only show CRITICAL over-budget alerts (>100%)
					const criticalAlerts = alerts.filter(alert =>
						alert.notification_type === 'over_budget' && alert.percentage > 100
					);

					// Convert API alerts to notifications
					const notifications = criticalAlerts.map((alert) => ({
						id: `budget-${alert.budget_id}-${Date.now()}`,
						type: 'budget_alert',
						title: `⚠️ Budget Exceeded: ${alert.category || 'Unknown'}`,
						message: `You've spent $${(Number(alert.spent) || 0).toFixed(2)} of your $${(Number(alert.budget_amount) || 0).toFixed(2)} ${alert.period || 'monthly'} budget (${(Number(alert.percentage) || 0).toFixed(1)}%)`,
						severity: 'critical',
						category: alert.category,
						budgetId: alert.budget_id,
						data: alert,
						timestamp: new Date().toISOString(),
						read: false,
					}));

					// Add new notifications (avoid duplicates)
					const existingIds = get().notifications.map(n => n.id);
					notifications.forEach((notification) => {
						if (!existingIds.includes(notification.id)) {
							get().addNotification(notification);
						}
					});

					set({ isLoading: false });
					return notifications;

				} catch (error) {
					console.error('Failed to fetch budget alerts:', error);
					set({
						isLoading: false,
						error: error.message || 'Failed to fetch budget alerts'
					});
					return [];
				}
			},

			// Check for new budget alerts periodically
			startBudgetMonitoring: () => {
				// Check immediately
				get().fetchBudgetAlerts();

				// Then check every 2 hours (less frequent since only critical alerts)
				const interval = setInterval(() => {
					get().fetchBudgetAlerts();
				}, 2 * 60 * 60 * 1000); // 2 hours

				return interval;
			},

			// Stop budget monitoring
			stopBudgetMonitoring: (intervalId) => {
				if (intervalId) {
					clearInterval(intervalId);
				}
			},

			// Add helpful financial tips
			addFinancialTip: (tip) => {
				const tipNotification = {
					id: `tip-${Date.now()}`,
					type: 'financial_tip',
					title: '💡 Financial Tip',
					message: tip,
					severity: 'info',
					timestamp: new Date().toISOString(),
					read: false,
				};
				get().addNotification(tipNotification);
			},

			// Add system notification
			addSystemNotification: (title, message, severity = 'info') => {
				const notification = {
					id: `system-${Date.now()}`,
					type: 'system',
					title: title,
					message: message,
					severity: severity,
					timestamp: new Date().toISOString(),
					read: false,
				};
				get().addNotification(notification);
			},
		}),
		{
			name: 'budgetly-notifications',
			partialize: (state) => ({
				notifications: state.notifications,
				unreadCount: state.unreadCount,
			}),
		}
	)
);

export { useNotificationStore };
