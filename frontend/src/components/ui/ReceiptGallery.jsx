import React, { useState, useEffect } from 'react';
import {
	Receipt,
	Eye,
	Trash2,
	Plus,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	X
} from 'lucide-react';
import toast from 'react-hot-toast';

const ReceiptGallery = ({
	onAddExpense,
	receipts: propReceipts,
	loading: propLoading,
	showCount = false,
	totalCount = 0
}) => {
	const [receipts, setReceipts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedReceipt, setSelectedReceipt] = useState(null);
	const [showImageModal, setShowImageModal] = useState(false);

	// Use props if provided, otherwise load receipts internally
	useEffect(() => {
		if (propReceipts !== undefined) {
			setReceipts(propReceipts);
			setLoading(propLoading || false);
		} else {
			loadReceipts();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [propReceipts, propLoading]);

	const loadReceipts = async () => {
		if (propReceipts !== undefined) return; // Don't load if receipts are provided via props

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
				setReceipts(data.receipts);
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

	const handleViewImage = async (receipt) => {
		try {
			const token = localStorage.getItem('auth_token');
			const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
			const response = await fetch(`${API_BASE_URL}/receipts/image/${receipt.token}`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			const data = await response.json();
			if (data.success) {
				setSelectedReceipt({
					...receipt,
					imageData: data.image_data,
					contentType: data.content_type
				});
				setShowImageModal(true);
			} else {
				toast.error('Failed to load receipt image');
			}
		} catch (error) {
			console.error('Error loading receipt image:', error);
			toast.error('Network error loading image');
		}
	};

	const handleDeleteReceipt = async (receipt) => {
		if (!window.confirm('Are you sure you want to delete this receipt?')) {
			return;
		}

		try {
			const token = localStorage.getItem('auth_token');
			const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
			const response = await fetch(`${API_BASE_URL}/receipts/image/${receipt.token}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			const data = await response.json();
			if (data.success) {
				toast.success('Receipt deleted successfully');
				loadReceipts(); // Refresh the list
			} else {
				toast.error('Failed to delete receipt');
			}
		} catch (error) {
			console.error('Error deleting receipt:', error);
			toast.error('Network error deleting receipt');
		}
	};

	const handleAddExpenseFromReceipt = async (receipt) => {
		try {
			const token = localStorage.getItem('auth_token');
			const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
			const response = await fetch(`${API_BASE_URL}/expenses/create-from-receipt`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					receipt_token: receipt.token,
					description: receipt.extracted_data?.merchant || 'Receipt Expense',
					amount: receipt.extracted_data?.amount || 0,
					category: receipt.extracted_data?.category || 'Other',
					date: receipt.extracted_data?.date || new Date().toISOString().split('T')[0],
					payment_method: receipt.extracted_data?.payment_method || 'other'
				})
			});

			const data = await response.json();
			if (data.success) {
				toast.success('Expense created successfully!');
				if (onAddExpense) {
					onAddExpense(data.expense);
				}
				loadReceipts(); // Refresh to show updated status
			} else {
				toast.error(data.error || 'Failed to create expense');
			}
		} catch (error) {
			console.error('Error creating expense:', error);
			toast.error('Network error creating expense');
		}
	};

	const downloadImage = (receipt) => {
		if (!selectedReceipt?.imageData) return;

		const link = document.createElement('a');
		link.href = `data:${selectedReceipt.contentType};base64,${selectedReceipt.imageData}`;
		link.download = `receipt-${receipt.token}.jpg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const getStatusIcon = (receipt) => {
		if (receipt.expense_id) {
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		}
		return <Clock className="h-4 w-4 text-yellow-500" />;
	};

	const getStatusText = (receipt) => {
		if (receipt.expense_id) {
			return 'Expense Created';
		}
		return 'Pending Review';
	};

	const getStatusColor = (receipt) => {
		if (receipt.expense_id) {
			return 'text-green-600 bg-green-50';
		}
		return 'text-yellow-600 bg-yellow-50';
	};

	const getConfidenceColor = (confidence) => {
		if (confidence >= 0.8) return 'bg-green-100 text-green-800';
		if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	};

	const formatDate = (dateString) => {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'Invalid Date';
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
				<span className="ml-2 text-gray-600">Loading receipts...</span>
			</div>
		);
	}

	if (receipts.length === 0) {
		return (
			<div className="text-center py-12">
				<Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
				{showCount && totalCount > 0 ? (
					<>
						<h3 className="text-lg font-medium text-gray-900 mb-2">No receipts match your filters</h3>
						<p className="text-gray-500 mb-6">Try adjusting your filter criteria to see more results.</p>
					</>
				) : (
					<>
						<h3 className="text-lg font-medium text-gray-900 mb-2">No receipts uploaded</h3>
						<p className="text-gray-500 mb-6">Upload your first receipt to get started with automatic expense tracking.</p>
					</>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Receipt Gallery</h2>
				<div className="text-sm text-gray-500">
					{showCount && totalCount > 0 ? (
						<>Showing {receipts.length} of {totalCount} receipts</>
					) : (
						<>{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</>
					)}
				</div>
			</div>

			{/* Receipt Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{receipts.map((receipt) => (
					<div key={receipt.token} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
						{/* Receipt Preview */}
						<div className="aspect-w-16 aspect-h-9 bg-gray-100 relative">
							<div className="flex items-center justify-center h-32">
								<Receipt className="h-12 w-12 text-gray-400" />
							</div>

							{/* Status Badge */}
							<div className="absolute top-2 right-2">
								<div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt)}`}>
									{getStatusIcon(receipt)}
									<span className="ml-1">{getStatusText(receipt)}</span>
								</div>
							</div>
						</div>

						{/* Receipt Info */}
						<div className="p-4">
							<div className="space-y-3">
								{/* Merchant & Amount */}
								<div>
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-medium text-gray-900 truncate">
											{receipt.extracted_data?.merchant || 'Unknown Merchant'}
										</h3>
										<span className="text-sm font-semibold text-gray-900">
											${receipt.extracted_data?.amount?.toFixed(2) || '0.00'}
										</span>
									</div>
									<p className="text-xs text-gray-500 mt-1">
										{receipt.extracted_data?.category || 'Other'}
									</p>
								</div>

								{/* Date & Confidence */}
								<div className="flex items-center justify-between text-xs text-gray-500">
									<div className="flex items-center">
										<Calendar className="h-3 w-3 mr-1" />
										{receipt.extracted_data?.date || 'No date'}
									</div>
									{receipt.extracted_data?.confidence && (
										<div className="flex items-center space-x-1">
											<span className="text-xs text-gray-400">AI:</span>
											<div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(receipt.extracted_data.confidence)}`}>
												{Math.round(receipt.extracted_data.confidence * 100)}%
											</div>
										</div>
									)}
								</div>

								{/* Confidence Bar */}
								{receipt.extracted_data?.confidence && (
									<div className="mt-2">
										<div className="flex items-center justify-between text-xs mb-1">
											<span className="text-gray-500">Extraction Confidence</span>
											<span className={`font-medium ${getConfidenceColor(receipt.extracted_data.confidence)}`}>
												{receipt.extracted_data.confidence >= 0.8 ? 'High' :
													receipt.extracted_data.confidence >= 0.5 ? 'Medium' : 'Low'}
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-1.5">
											<div
												className={`h-1.5 rounded-full transition-all duration-300 ${receipt.extracted_data.confidence >= 0.8 ? 'bg-green-500' :
													receipt.extracted_data.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
													}`}
												style={{ width: `${Math.round(receipt.extracted_data.confidence * 100)}%` }}
											></div>
										</div>
									</div>
								)}

								{/* Upload Date */}
								<div className="text-xs text-gray-400">
									Uploaded {formatDate(receipt.created_at)}
								</div>
							</div>

							{/* Actions */}
							<div className="mt-4 flex items-center justify-between">
								<div className="flex space-x-2">
									<button
										onClick={() => handleViewImage(receipt)}
										className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
										title="View Image"
									>
										<Eye className="h-4 w-4" />
									</button>
									<button
										onClick={() => handleDeleteReceipt(receipt)}
										className="p-1 text-gray-400 hover:text-red-600 transition-colors"
										title="Delete Receipt"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>

								{!receipt.expense_id && (
									<button
										onClick={() => handleAddExpenseFromReceipt(receipt)}
										className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
									>
										<Plus className="h-3 w-3 mr-1" />
										Add Expense
									</button>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Image Modal */}
			{showImageModal && selectedReceipt && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-4 border-b">
							<h3 className="text-lg font-medium text-gray-900">
								{selectedReceipt.extracted_data?.merchant || 'Receipt'}
							</h3>
							<div className="flex items-center space-x-2">
								<button
									onClick={() => downloadImage(selectedReceipt)}
									className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
									title="Download Image"
								>
									<Download className="h-5 w-5" />
								</button>
								<button
									onClick={() => setShowImageModal(false)}
									className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Modal Content */}
						<div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
							<div className="flex flex-col lg:flex-row gap-6">
								{/* Image/PDF Display */}
								<div className="flex-1">
									{selectedReceipt.contentType === 'application/pdf' ? (
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-gray-700">PDF Receipt</span>
												<a
													href={`data:application/pdf;base64,${selectedReceipt.imageData}`}
													download={selectedReceipt.filename}
													className="text-sm text-blue-600 hover:text-blue-800"
												>
													Download PDF
												</a>
											</div>
											<iframe
												src={`data:application/pdf;base64,${selectedReceipt.imageData}`}
												className="w-full h-96 rounded-lg shadow-sm border"
												title="Receipt PDF"
											/>
										</div>
									) : (
										<img
											src={`data:${selectedReceipt.contentType};base64,${selectedReceipt.imageData}`}
											alt="Receipt"
											className="w-full h-auto rounded-lg shadow-sm"
										/>
									)}
								</div>

								{/* Receipt Details */}
								<div className="lg:w-80 space-y-4">
									<div className="bg-gray-50 rounded-lg p-4">
										<h4 className="font-medium text-gray-900 mb-3">Extracted Data</h4>
										<div className="space-y-2 text-sm">
											<div>
												<span className="text-gray-500">Merchant:</span>
												<span className="ml-2 text-gray-900">
													{selectedReceipt.extracted_data?.merchant || 'Not detected'}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Amount:</span>
												<span className="ml-2 text-gray-900">
													${selectedReceipt.extracted_data?.amount?.toFixed(2) || '0.00'}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Date:</span>
												<span className="ml-2 text-gray-900">
													{selectedReceipt.extracted_data?.date || 'Not detected'}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Category:</span>
												<span className="ml-2 text-gray-900">
													{selectedReceipt.extracted_data?.category || 'Other'}
												</span>
											</div>
											{selectedReceipt.extracted_data?.confidence && (
												<div>
													<span className="text-gray-500">Confidence:</span>
													<span className={`ml-2 font-medium ${getConfidenceColor(selectedReceipt.extracted_data.confidence)}`}>
														{Math.round(selectedReceipt.extracted_data.confidence * 100)}%
													</span>
												</div>
											)}
										</div>
									</div>

									{/* Status */}
									<div className={`rounded-lg p-4 ${getStatusColor(selectedReceipt)}`}>
										<div className="flex items-center">
											{getStatusIcon(selectedReceipt)}
											<span className="ml-2 font-medium">{getStatusText(selectedReceipt)}</span>
										</div>
									</div>

									{/* Action Button */}
									{!selectedReceipt.expense_id && (
										<button
											onClick={() => {
												handleAddExpenseFromReceipt(selectedReceipt);
												setShowImageModal(false);
											}}
											className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
										>
											<Plus className="h-4 w-4 mr-2" />
											Create Expense
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ReceiptGallery;
