import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const ConfirmDialog = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	type = 'warning', // 'warning', 'danger', 'info', 'success'
	isLoading = false
}) => {
	if (!isOpen) return null;

	const typeStyles = {
		warning: {
			icon: AlertTriangle,
			iconColor: 'text-warning-600',
			bgColor: 'bg-warning-100',
			buttonColor: 'bg-warning-600 hover:bg-warning-700'
		},
		danger: {
			icon: AlertTriangle,
			iconColor: 'text-danger-600',
			bgColor: 'bg-danger-100',
			buttonColor: 'bg-danger-600 hover:bg-danger-700'
		},
		info: {
			icon: Info,
			iconColor: 'text-primary-600',
			bgColor: 'bg-primary-100',
			buttonColor: 'bg-primary-600 hover:bg-primary-700'
		},
		success: {
			icon: CheckCircle,
			iconColor: 'text-success-600',
			bgColor: 'bg-success-100',
			buttonColor: 'bg-success-600 hover:bg-success-700'
		}
	};

	const style = typeStyles[type] || typeStyles.warning;
	const Icon = style.icon;

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget && !isLoading) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fade-in">
				{/* Header */}
				<div className="flex items-start justify-between p-6 border-b border-gray-200">
					<div className="flex items-center space-x-3">
						<div className={`${style.bgColor} p-2 rounded-full`}>
							<Icon className={`h-6 w-6 ${style.iconColor}`} />
						</div>
						<h3 className="text-lg font-semibold text-gray-900">
							{title}
						</h3>
					</div>
					{!isLoading && (
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					)}
				</div>

				{/* Body */}
				<div className="p-6">
					<p className="text-gray-600 text-sm leading-relaxed">
						{message}
					</p>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
					<button
						onClick={onClose}
						disabled={isLoading}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						disabled={isLoading}
						className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${style.buttonColor}`}
					>
						{isLoading ? (
							<span className="flex items-center space-x-2">
								<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span>Processing...</span>
							</span>
						) : (
							confirmText
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;
