import { useState } from "react";
import DataFilters from "./DataFilters";

const ReceiptFilters = ({ data, onFilterChange, className = "" }) => {
	const [activePreset, setActivePreset] = useState(null);

	const confidencePresets = [
		{ id: 'high', label: 'High Confidence', range: { min: 80, max: 100 }, color: 'green' },
		{ id: 'medium', label: 'Medium Confidence', range: { min: 50, max: 79 }, color: 'yellow' },
		{ id: 'low', label: 'Low Confidence', range: { min: 0, max: 49 }, color: 'red' },
		{ id: 'unprocessed', label: 'Needs Review', range: { min: 0, max: 70 }, color: 'orange' }
	];

	const statusPresets = [
		{ id: 'processed', label: 'Processed', filter: (item) => item.status === 'processed', color: 'blue' },
		{ id: 'pending', label: 'Pending', filter: (item) => item.status === 'pending', color: 'gray' }
	];

	const handlePresetClick = (preset, type) => {
		if (activePreset === preset.id) {
			// Deactivate preset
			setActivePreset(null);
			onFilterChange(data, {});
		} else {
			// Activate preset
			setActivePreset(preset.id);

			if (type === 'confidence') {
				// Filter by confidence range
				const filtered = data.filter(item => {
					const confidence = (item.extracted_data?.confidence || item.confidence || 0) * 100;
					return confidence >= preset.range.min && confidence <= preset.range.max;
				});
				onFilterChange(filtered, { confidenceRange: preset.range });
			} else if (type === 'status') {
				// Filter by status
				const filtered = data.filter(preset.filter);
				onFilterChange(filtered, { status: preset.id });
			}
		}
	};

	const getPresetButtonClass = (preset, baseColor) => {
		const isActive = activePreset === preset.id;
		const colorClasses = {
			green: isActive ? 'bg-success-100 text-success-800 border-success-300' : 'bg-success-50 text-success-700 border-success-200 hover:bg-success-100',
			yellow: isActive ? 'bg-warning-100 text-warning-800 border-warning-300' : 'bg-warning-50 text-warning-700 border-warning-200 hover:bg-warning-100',
			red: isActive ? 'bg-danger-100 text-danger-800 border-danger-300' : 'bg-danger-50 text-danger-700 border-danger-200 hover:bg-danger-100',
			orange: isActive ? 'bg-warning-100 text-warning-800 border-warning-300' : 'bg-warning-50 text-warning-700 border-warning-200 hover:bg-warning-100',
			blue: isActive ? 'bg-primary-100 text-primary-800 border-primary-300' : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100',
			gray: isActive ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
		};

		return `px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${colorClasses[baseColor]}`;
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Quick Confidence Filters */}
			<div className="bg-white border border-gray-200 rounded-lg p-4">
				<h4 className="text-sm font-medium text-gray-900 mb-3">Quick Confidence Filters</h4>
				<div className="flex flex-wrap gap-2 mb-4">
					{confidencePresets.map((preset) => (
						<button
							key={preset.id}
							onClick={() => handlePresetClick(preset, 'confidence')}
							className={getPresetButtonClass(preset, preset.color)}
						>
							{preset.label}
							<span className="ml-1 text-xs opacity-75">
								({preset.range.min}-{preset.range.max}%)
							</span>
						</button>
					))}
				</div>

				{/* Status Filters */}
				<h5 className="text-sm font-medium text-gray-700 mb-2">Processing Status</h5>
				<div className="flex flex-wrap gap-2">
					{statusPresets.map((preset) => (
						<button
							key={preset.id}
							onClick={() => handlePresetClick(preset, 'status')}
							className={getPresetButtonClass(preset, preset.color)}
						>
							{preset.label}
						</button>
					))}
				</div>

				{/* Clear All */}
				{activePreset && (
					<div className="mt-3 pt-3 border-t border-gray-200">
						<button
							onClick={() => {
								setActivePreset(null);
								onFilterChange(data, {});
							}}
							className="text-sm text-primary-600 hover:text-primary-800"
						>
							Clear all filters
						</button>
					</div>
				)}
			</div>

			{/* Advanced Filters */}
			<DataFilters
				data={data}
				onFilterChange={(filtered, filters) => {
					// Reset preset if advanced filters are used
					if (Object.keys(filters).some(key => filters[key] && key !== 'confidenceRange')) {
						setActivePreset(null);
					}
					onFilterChange(filtered, filters);
				}}
				filterConfig={{
					showMerchant: true,
					showCategory: true,
					showDateRange: true,
					showAmountRange: true,
					showSearch: true,
					showConfidence: true,
					showPaymentMethod: false,
					showSource: false,
				}}
			/>
		</div>
	);
};

export default ReceiptFilters;