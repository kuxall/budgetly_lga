/**
 * Reusable loading spinner component
 */

const LoadingSpinner = ({
	size = 'md',
	color = 'primary',
	text = null,
	fullScreen = false,
	overlay = false
}) => {
	const sizes = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
		xl: 'h-16 w-16',
	};

	const colors = {
		primary: 'border-primary-600',
		white: 'border-white',
		gray: 'border-gray-600',
		success: 'border-success-600',
		danger: 'border-danger-600',
	};

	const spinner = (
		<div className="flex flex-col items-center justify-center space-y-3">
			<div
				className={`animate-spin rounded-full border-b-2 ${sizes[size]} ${colors[color]}`}
				role="status"
				aria-label="Loading"
			>
				<span className="sr-only">Loading...</span>
			</div>
			{text && (
				<p className="text-sm text-gray-600 animate-pulse">{text}</p>
			)}
		</div>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-white z-50">
				{spinner}
			</div>
		);
	}

	if (overlay) {
		return (
			<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
				{spinner}
			</div>
		);
	}

	return spinner;
};

export default LoadingSpinner;
