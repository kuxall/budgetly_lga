import { create } from 'zustand';
import { expenseApi } from '../services/api';
import toast from 'react-hot-toast';
import { formatError } from '../utils/errorMessages';

export const useExpenseStore = create((set, get) => ({
	expenses: [],
	pagination: null,
	isLoading: false,
	isSubmitting: false,

	// Fetch all expenses
	fetchExpenses: async (page = 1, pageSize = 1000) => {
		set({ isLoading: true });
		try {
			const response = await expenseApi.getExpenses(page, pageSize);
			// Handle both paginated and non-paginated responses
			const expenses = response.items || response;
			const pagination = response.pagination || null;
			set({ expenses, pagination, isLoading: false });
			return expenses;
		} catch (error) {
			set({ isLoading: false });
			toast.error(formatError(error, 'fetch-expenses'));
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
			toast.error(formatError(error, 'create-expense'));
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
			toast.error(formatError(error, 'update-expense'));
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
			toast.error(formatError(error, 'delete-expense'));
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