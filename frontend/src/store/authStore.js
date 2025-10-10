import { create } from "zustand";

export const useAuthStore = create((set) => ({
  isLoading: false,
  login: async (email, password) => {
    set({ isLoading: true });
    // Simulate async login
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({ isLoading: false });
    // Add your actual login logic here
    alert(`Logged in as ${email}`);
  },
}));
