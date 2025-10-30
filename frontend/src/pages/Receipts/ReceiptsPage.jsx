import React, { useState } from 'react';
import ReceiptGallery from '../../components/ui/ReceiptGallery';
import MainLayout from '../../components/layout/MainLayout';
import toast from 'react-hot-toast';

const ReceiptsPage = () => {
	const [refreshKey, setRefreshKey] = useState(0);

	const handleAddExpense = (expense) => {
		// Refresh the gallery to show updated status
		setRefreshKey(prev => prev + 1);
		toast.success(`Expense created: ${expense.description} - $${expense.amount}`);
	};

	return (
		<MainLayout>
			<div>
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
				</div>

				{/* Receipt Gallery */}
				<ReceiptGallery
					key={refreshKey}
					onAddExpense={handleAddExpense}
				/>
			</div>
		</MainLayout>
	);
};

export default ReceiptsPage;