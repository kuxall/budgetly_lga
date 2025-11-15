import { useState, useEffect } from 'react';
import ReceiptGallery from '../../components/ui/ReceiptGallery';
import ReceiptFilters from '../../components/ui/ReceiptFilters';
import toast from 'react-hot-toast';

const ReceiptsPage = () => {
	const [refreshKey, setRefreshKey] = useState(0);
	const [receipts, setReceipts] = useState([]);
	const [filteredReceipts, setFilteredReceipts] = useState([]);
	const [loading, setLoading] = useState(true);


	const handleAddExpense = (expense) => {
		// Refresh the gallery to show updated status
		setRefreshKey(prev => prev + 1);
		loadReceipts(); // Reload receipts to update status
		toast.success(`Expense created: ${expense.description} - ${expense.amount}`);
	};

	const loadReceipts = async () => {
		try {
			const token = localStorage.getItem('auth_token');
			const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
			const response = await fetch(`${API_BASE_URL}/receipts/list`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			const data = await response.json();
			if (data.success) {
				// Transform receipt data to work with filters
				const transformedReceipts = data.receipts.map(receipt => ({
					...receipt,
					// Map extracted data fields for filtering
					date: receipt.extracted_data?.date || receipt.created_at,
					amount: receipt.extracted_data?.amount || 0,
					category: receipt.extracted_data?.category || 'Other',
					merchant: receipt.extracted_data?.merchant || 'Unknown',
					description: receipt.extracted_data?.merchant || 'Receipt',
					// Add confidence for filtering (ensure it's available at top level)
					confidence: receipt.extracted_data?.confidence || 0,
					// Add status for filtering
					status: receipt.expense_id ? 'processed' : 'pending'
				}));
				setReceipts(transformedReceipts);
				setFilteredReceipts(transformedReceipts);
			} else {
				toast.error('Failed to load receipts');
			}
		} catch (error) {
			console.error('Error loading receipts:', error);
			toast.error('Network error loading receipts');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadReceipts();
	}, [refreshKey]);

	const handleFilterChange = (filtered, filters) => {
		setFilteredReceipts(filtered);
	};

	return (
		<div className="space-y-6">
			<div className="border-b border-gray-200 pb-5">
				<h3 className="text-lg font-medium leading-6 text-gray-900">Receipts</h3>
				<p className="mt-2 max-w-4xl text-sm text-gray-500">
					View and manage your uploaded receipts.
				</p>
			</div>

			{/* Receipt Filters - Confidence-based + Advanced */}
			{!loading && receipts.length > 0 && (
				<ReceiptFilters
					data={receipts}
					onFilterChange={handleFilterChange}
				/>
			)}

			{/* Receipt Gallery */}
			<ReceiptGallery
				key={refreshKey}
				receipts={filteredReceipts}
				loading={loading}
				onAddExpense={handleAddExpense}
				showCount={true}
				totalCount={receipts.length}
			/>
		</div>
	);
};

export default ReceiptsPage;
