import { useState } from 'react';
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
			<div className="space-y-6">
				<div className="border-b border-gray-200 pb-5">
					<h3 className="text-lg font-medium leading-6 text-gray-900">Receipts</h3>
					<p className="mt-2 max-w-4xl text-sm text-gray-500">
						View and manage your uploaded receipts.
					</p>
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