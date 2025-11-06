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
			green: isActive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
			yellow: isActive ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
			red: isActive ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
			orange: isActive ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
			blue: isActive ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
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
							className="text-sm text-blue-600 hover:text-blue-800"
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