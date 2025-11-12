import React, { useState, useCallback } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ReceiptUpload = ({ onClose, onExpenseCreated, onReceiptProcessed }) => {
	const [dragActive, setDragActive] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);

	const handleDrag = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	}, []);

	const handleDrop = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFile(e.dataTransfer.files[0]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleFileInput = (e) => {
		if (e.target.files && e.target.files[0]) {
			handleFile(e.target.files[0]);
		}
	};

	const handleFile = async (file) => {
		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
		if (!allowedTypes.includes(file.type)) {
			setError('Please upload a valid image (JPEG, PNG, WebP, TIFF) or PDF file');
			return;
		}

		// Validate file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			setError('File size must be under 10MB');
			return;
		}

		setError(null);
		setResult(null);
		setUploading(true);
		setProcessing(true);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const token = localStorage.getItem('auth_token');
			const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
			const response = await fetch(`${API_BASE_URL}/expenses/upload-receipt`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`
				},
				body: formData
			});

			const data = await response.json();

			if (data.success) {
				setResult(data);

				if (data.auto_created) {
					toast.success('Receipt processed and expense created automatically!');
					if (onExpenseCreated) {
						onExpenseCreated(data.expense);
					}
				} else {
					toast.success('Receipt processed successfully. Please review the extracted data.');
				}

				if (onReceiptProcessed) {
					onReceiptProcessed(data);
				}
			} else {
				if (data.is_duplicate) {
					setError(`This receipt has already been processed. Existing expense: ${data.existing_expense?.description || 'Unknown'} - $${data.existing_expense?.amount || '0.00'}`);
				} else {
					setError(data.error || 'Failed to process receipt');
				}
			}
		} catch (err) {
			setError('Network error. Please try again.');
			console.error('Receipt upload error:', err);
		} finally {
			setUploading(false);
			setProcessing(false);
		}
	};

	const handleCreateExpense = async () => {
		if (!result || !result.receipt_token) return;

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
					receipt_token: result.receipt_token,
					// Use extracted data as defaults
					description: result.extracted_data?.merchant || 'Receipt Expense',
					amount: result.extracted_data?.total_amount || 0,
					category: result.extracted_data?.category || 'Other',
					date: result.extracted_data?.date || new Date().toISOString().split('T')[0],
					payment_method: result.extracted_data?.payment_method || 'other'
				})
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Expense created successfully!');
				if (onExpenseCreated) {
					onExpenseCreated(data.expense);
				}
				onClose();
			} else {
				toast.error(data.error || 'Failed to create expense');
			}
		} catch (err) {
			toast.error('Network error. Please try again.');
			console.error('Create expense error:', err);
		}
	};

	const getConfidenceColor = (level) => {
		switch (level) {
			case 'high': return 'text-green-600 bg-green-50';
			case 'medium': return 'text-yellow-600 bg-yellow-50';
			case 'low': return 'text-red-600 bg-red-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	};

	const getConfidenceIcon = (level) => {
		switch (level) {
			case 'high': return <CheckCircle className="h-4 w-4" />;
			case 'medium': return <AlertCircle className="h-4 w-4" />;
			case 'low': return <AlertCircle className="h-4 w-4" />;
			default: return <AlertCircle className="h-4 w-4" />;
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-xl font-semibold text-gray-900">Upload Receipt</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				<div className="p-6">
					{/* Upload Area */}
					{!result && !error && (
						<div
							className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
								? 'border-blue-400 bg-blue-50'
								: 'border-gray-300 hover:border-gray-400'
								}`}
							onDragEnter={handleDrag}
							onDragLeave={handleDrag}
							onDragOver={handleDrag}
							onDrop={handleDrop}
						>
							{processing ? (
								<div className="space-y-4">
									<div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto">
										<Camera className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
									</div>
									<div>
										<p className="text-lg font-medium text-gray-900">AI is analyzing your receipt...</p>
										<p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
									</div>
									<div className="flex justify-center space-x-1">
										<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
										<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
										<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex justify-center">
										<Upload className="h-12 w-12 text-gray-400" />
									</div>
									<div>
										<p className="text-lg font-medium text-gray-900">
											Drag and drop or click to select
										</p>
										<p className="text-sm text-gray-500 mt-1">
											Supports JPG, PNG, WebP, TIFF, PDF • Max 10MB
										</p>
									</div>
									<input
										type="file"
										accept="image/*,.pdf"
										onChange={handleFileInput}
										className="hidden"
										id="receipt-upload"
										disabled={uploading}
									/>
									<label
										htmlFor="receipt-upload"
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
									>
										<Camera className="h-4 w-4 mr-2" />
										Choose File
									</label>
								</div>
							)}
						</div>
					)}

					{/* Error Display */}
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<div className="flex items-start">
								<AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
								<div>
									<h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
									<p className="text-sm text-red-700 mt-1">{error}</p>
								</div>
							</div>
							<div className="mt-4">
								<button
									onClick={() => {
										setError(null);
										setResult(null);
									}}
									className="text-sm font-medium text-red-800 hover:text-red-900"
								>
									Try Again
								</button>
							</div>
						</div>
					)}

					{/* Results Display */}
					{result && (
						<div className="space-y-6">
							{/* Confidence Indicator */}
							<div className={`rounded-lg p-4 ${getConfidenceColor(result.confidence_level)}`}>
								<div className="flex items-center">
									{getConfidenceIcon(result.confidence_level)}
									<div className="ml-3">
										<h3 className="text-sm font-medium">
											{Math.round(result.confidence * 100)}% Confidence
										</h3>
										<p className="text-sm mt-1">
											{result.confidence_explanation}
										</p>
									</div>
								</div>
							</div>

							{/* Extracted Data */}
							<div className="bg-gray-50 rounded-lg p-4">
								<h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Information</h3>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">Merchant</label>
										<p className="mt-1 text-sm text-gray-900">
											{result.extracted_data?.merchant || 'Not detected'}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Amount</label>
										<p className="mt-1 text-sm text-gray-900">
											${result.extracted_data?.total_amount?.toFixed(2) || '0.00'}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Date</label>
										<p className="mt-1 text-sm text-gray-900">
											{result.extracted_data?.date || 'Not detected'}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Category</label>
										<p className="mt-1 text-sm text-gray-900">
											{result.extracted_data?.category || 'Other'}
										</p>
									</div>
								</div>
							</div>

							{/* Validation Warnings */}
							{result.validation_warnings && result.validation_warnings.length > 0 && (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<h4 className="text-sm font-medium text-yellow-800 mb-2">Validation Warnings</h4>
									<ul className="text-sm text-yellow-700 space-y-1">
										{result.validation_warnings.map((warning, index) => (
											<li key={index}>• {warning}</li>
										))}
									</ul>
								</div>
							)}

							{/* Action Buttons */}
							<div className="flex justify-end space-x-3">
								{result.auto_created ? (
									<div className="flex items-center text-green-600">
										<CheckCircle className="h-5 w-5 mr-2" />
										<span className="text-sm font-medium">Expense Created Automatically</span>
									</div>
								) : (
									<>
										<button
											onClick={onClose}
											className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
										>
											Cancel
										</button>
										<button
											onClick={handleCreateExpense}
											className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
										>
											Create Expense
										</button>
									</>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ReceiptUpload;
