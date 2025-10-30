import { create } from 'zustand';
import { budgetApi } from '../services/api';
import toast from 'react-hot-toast';

export const useBudgetStore = create((set, get) => ({
	budgets: [],
	isLoading: false,
	isSubmitting: false,

	// Fetch budgets
	fetchBudgets: async () => {
		set({ isLoading: true });
		try {
			const budgets = await budgetApi.getBudgets();
			set({ budgets, isLoading: false });
		} catch (error) {
			set({ isLoading: false });
			toast.error(error.message || 'Failed to fetch budgets');
			throw error;
		}
	},

	// Create new budget
	createBudget: async (budgetData) => {
		set({ isSubmitting: true });
		try {
			const newBudget = await budgetApi.createBudget(budgetData);
			const currentBudgets = get().budgets;
			set({
				budgets: [newBudget, ...currentBudgets],
				isSubmitting: false
			});
			toast.success('Budget created successfully!');
			return newBudget;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to create budget');
			throw error;
		}
	},

	// deleteBudget: async (budgetId) => {
	// 	try {
	// 		await budgetApi.deleteBudget(budgetId);
	// 		const currentBudgets = get().budgets;
	// 		set({
	// 			budgets: currentBudgets.filter(budget => budget.id !== budgetId)
	// 		});
	// 		toast.success('Budget deleted successfully!');
	// 	} catch (error) {
	// 		toast.error(error.message || 'Failed to delete budget');
	// 		throw error;
	// 	}
	// },

	// Get total budget
	getTotalBudget: () => {
		const { budgets } = get();
		return budgets
			.filter(budget => budget.period === 'monthly')
			.reduce((total, budget) => total + budget.amount, 0);
	},

	// Get budget progress (requires expenses data)
	getBudgetProgress: (budgetId, expenses = []) => {
		const { budgets } = get();
		const budget = budgets.find(b => b.id === budgetId);

		if (!budget) {
			return { spent: 0, remaining: 0, percentage: 0 };
		}

		// Calculate spent amount for this budget's category
		const currentDate = new Date();
		const currentMonth = currentDate.getMonth();
		const currentYear = currentDate.getFullYear();

		let spent = 0;

		if (budget.period === 'monthly') {
			// Filter expenses for current month and matching category
			const matchingExpenses = expenses.filter(expense => {
				const expenseDate = new Date(expense.date);
				const isCurrentMonth = expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
				const isSameCategory = expense.category === budget.category;

				// Debug logging
				console.log('Budget Progress Debug:', {
					budgetId,
					budgetCategory: budget.category,
					expenseCategory: expense.category,
					expenseAmount: expense.amount,
					expenseDate: expense.date,
					isCurrentMonth,
					isSameCategory,
					matches: isCurrentMonth && isSameCategory
				});

				return isCurrentMonth && isSameCategory;
			});

			spent = matchingExpenses.reduce((total, expense) => total + expense.amount, 0);

			console.log('Total spent for budget:', {
				budgetCategory: budget.category,
				totalSpent: spent,
				matchingExpensesCount: matchingExpenses.length
			});
		} else if (budget.period === 'weekly') {
			// Filter expenses for current week and matching category
			const startOfWeek = new Date(currentDate);
			startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
			startOfWeek.setHours(0, 0, 0, 0);

			spent = expenses
				.filter(expense => {
					const expenseDate = new Date(expense.date);
					return expenseDate >= startOfWeek &&
						expenseDate <= currentDate &&
						expense.category === budget.category;
				})
				.reduce((total, expense) => total + expense.amount, 0);
		} else if (budget.period === 'yearly') {
			// Filter expenses for current year and matching category
			spent = expenses
				.filter(expense => {
					const expenseDate = new Date(expense.date);
					return expenseDate.getFullYear() === currentYear &&
						expense.category === budget.category;
				})
				.reduce((total, expense) => total + expense.amount, 0);
		}

		const remaining = budget.amount - spent;
		const percentage = (spent / budget.amount) * 100;

		return {
			spent,
			remaining,
			percentage,
			isOverBudget: spent > budget.amount,
			overspent: Math.max(spent - budget.amount, 0)
		};
	},

	// Clear budgets (for logout)
	clearBudgets: () => {
		set({ budgets: [], isLoading: false, isSubmitting: false });
	}
}));