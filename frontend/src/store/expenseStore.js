import { create } from 'zustand';
import { expenseApi } from '../services/api';
import toast from 'react-hot-toast';

export const useExpenseStore = create((set, get) => ({
	expenses: [],
	isLoading: false,
	isSubmitting: false,

	// Fetch all expenses
	fetchExpenses: async () => {
		set({ isLoading: true });
		try {
			const expenses = await expenseApi.getExpenses();
			set({ expenses, isLoading: false });
			return expenses;
		} catch (error) {
			set({ isLoading: false });
			toast.error(error.message || 'Failed to fetch expenses');
			return [];
		}
	},

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

	// Update expense
	updateExpense: async (id, expenseData) => {
		set({ isSubmitting: true });
		try {
			const updatedExpense = await expenseApi.updateExpense(id, expenseData);
			const currentExpenses = get().expenses;
			const updatedExpenses = currentExpenses.map(expense =>
				expense.id === id ? updatedExpense : expense
			);
			set({
				expenses: updatedExpenses,
				isSubmitting: false
			});
			toast.success('Expense updated successfully!');
			return updatedExpense;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to update expense');
			throw error;
		}
	},

	// Delete expense
	deleteExpense: async (id) => {
		try {
			await expenseApi.deleteExpense(id);
			const currentExpenses = get().expenses;
			const filteredExpenses = currentExpenses.filter(expense => expense.id !== id);
			set({ expenses: filteredExpenses });
			toast.success('Expense deleted successfully!');
		} catch (error) {
			toast.error(error.message || 'Failed to delete expense');
			throw error;
		}
	},

	// Get expenses by category
	getExpensesByCategory: () => {
		const expenses = get().expenses;
		const categoryTotals = {};

		expenses.forEach(expense => {
			const category = expense.category || 'Other';
			categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
		});

		return categoryTotals;
	},

	// Get total expenses
	getTotalExpenses: () => {
		const expenses = get().expenses;
		return expenses.reduce((total, expense) => total + expense.amount, 0);
	},

	// Clear expenses (for logout)
	clearExpenses: () => {
		set({ expenses: [], isLoading: false, isSubmitting: false });
	}
}));