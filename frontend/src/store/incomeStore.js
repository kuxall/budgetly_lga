import { create } from 'zustand';
import { incomeApi } from '../services/api';
import toast from 'react-hot-toast';

export const useIncomeStore = create((set, get) => ({
	income: [],
	isLoading: false,
	isSubmitting: false,


	// Fetch all income
	fetchIncome: async () => {
		set({ isLoading: true });
		try {
			const income = await incomeApi.getIncome();
			set({ income, isLoading: false });
			return income;
		} catch (error) {
			set({ isLoading: false });
			toast.error(error.message || 'Failed to fetch income');
			return [];
		}
	},

	// Create new income
	createIncome: async (incomeData) => {
		set({ isSubmitting: true });
		try {
			const newIncome = await incomeApi.createIncome(incomeData);
			const currentIncome = get().income;
			set({
				income: [newIncome, ...currentIncome],
				isSubmitting: false
			});
			toast.success('Income added successfully!');
			return newIncome;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to add income');
			throw error;
		}
	},

	// Update income
	updateIncome: async (id, incomeData) => {
		set({ isSubmitting: true });
		try {
			const updatedIncome = await incomeApi.updateIncome(id, incomeData);
			const currentIncome = get().income;
			const updatedIncomeList = currentIncome.map(inc =>
				inc.id === id ? updatedIncome : inc
			);
			set({
				income: updatedIncomeList,
				isSubmitting: false
			});
			toast.success('Income updated successfully!');
			return updatedIncome;
		} catch (error) {
			set({ isSubmitting: false });
			toast.error(error.message || 'Failed to update income');
			throw error;
		}
	},

	deleteIncome: async (id) => {
		try {
			await incomeApi.deleteIncome(id);
			const currentIncome = get().income;
			const filteredIncome = currentIncome.filter(inc => inc.id !== id);
			set({ income: filteredIncome });
			toast.success('Income deleted successfully!');
		} catch (error) {
			toast.error(error.message || 'Failed to delete income');
			throw error;
		}
	},

	// Get total income
	getTotalIncome: () => {
		const income = get().income;
		return income.reduce((total, inc) => total + inc.amount, 0);
	},

	// Clear income (for logout)
	clearIncome: () => {
		set({ income: [], isLoading: false, isSubmitting: false });
	}
}));