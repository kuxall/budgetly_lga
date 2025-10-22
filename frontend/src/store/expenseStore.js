import { create } from 'zustand';
import { expenseApi } from '../services/api';
import toast from 'react-hot-toast';

export const useExpenseStore = create((set, get) => ({
	expenses: [],
	isLoading: false,
	isSubmitting: false,

	

	// Create new expense
	createExpense: async (expenseData) => {
		set({ isSubmitting: true });
		try {
			const newExpense = await expenseApi.createExpense(expenseData);
			const currentExpenses = get().expenses;
			set({
				expenses: [newExpense, ...currentExpenses],
				isSubmitting: false
			});
			toast.success('Expense added successfully!');
			return newExpense;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to add expense');
			throw error;
		}
	},


	// Clear expenses (for logout)
	clearExpenses: () => {
		set({ expenses: [], isLoading: false, isSubmitting: false });
	}
}));