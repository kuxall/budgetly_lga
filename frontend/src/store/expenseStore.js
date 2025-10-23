import { create } from 'zustand';
import { expenseApi } from '../services/api';
import toast from 'react-hot-toast';

export const useExpenseStore = create((set, get) => ({
	expenses: [],
	isLoading: false,
	isSubmitting: false,

	// Fetch expenses
	fetchExpenses: async () => {
		set({ isLoading: true });
		try {
			const expenses = await expenseApi.getExpenses();
			set({ expenses, isLoading: false });
		} catch (error) {
			set({ isLoading: false });
			toast.error(error.message || 'Failed to fetch expenses');
			throw error;
		}
	},

	// Create new expense
	createExpense: async (expenseData, budgets = []) => {
		set({ isSubmitting: true });
		try {
			const newExpense = await expenseApi.createExpense(expenseData);
			const currentExpenses = get().expenses;
			const updatedExpenses = [newExpense, ...currentExpenses];

			set({
				expenses: updatedExpenses,
				isSubmitting: false
			});

			// Check if this expense causes any budget to be exceeded
			const relevantBudget = budgets.find(budget =>
				budget.category === newExpense.category && budget.period === 'monthly'
			);

			if (relevantBudget) {
				// Calculate total spent in this category for current month
				const currentDate = new Date();
				const currentMonth = currentDate.getMonth();
				const currentYear = currentDate.getFullYear();

				const monthlySpent = updatedExpenses
					.filter(expense => {
						const expenseDate = new Date(expense.date);
						return expenseDate.getMonth() === currentMonth &&
							expenseDate.getFullYear() === currentYear &&
							expense.category === newExpense.category;
					})
					.reduce((total, expense) => total + expense.amount, 0);

				const percentage = (monthlySpent / relevantBudget.amount) * 100;

				if (percentage >= 100) {
					const overspent = monthlySpent - relevantBudget.amount;
					toast.error(`⚠️ Budget exceeded! You've overspent by $${overspent.toFixed(2)} in ${newExpense.category}`, {
						duration: 6000
					});
				} else if (percentage >= 90) {
					const remaining = relevantBudget.amount - monthlySpent;
					toast.warning(`⚠️ Budget warning! Only $${remaining.toFixed(2)} left in ${newExpense.category} budget`, {
						duration: 5000
					});
				} else {
					toast.success('Expense added successfully!');
				}
			} else {
				toast.success('Expense added successfully!');
			}

			return newExpense;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to add expense');
			throw error;
		}
	},

	// Delete functionality disabled for now - focusing on creation and tracking
	// deleteExpense: async (expenseId) => {
	// 	try {
	// 		await expenseApi.deleteExpense(expenseId);
	// 		const currentExpenses = get().expenses;
	// 		set({
	// 			expenses: currentExpenses.filter(expense => expense.id !== expenseId)
	// 		});
	// 		toast.success('Expense deleted successfully!');
	// 	} catch (error) {
	// 		toast.error(error.message || 'Failed to delete expense');
	// 		throw error;
	// 	}
	// },

	// Get total expenses
	getTotalExpenses: () => {
		const { expenses } = get();
		return expenses.reduce((total, expense) => total + expense.amount, 0);
	},

	// Clear expenses (for logout)
	clearExpenses: () => {
		set({ expenses: [], isLoading: false, isSubmitting: false });
	}
}));