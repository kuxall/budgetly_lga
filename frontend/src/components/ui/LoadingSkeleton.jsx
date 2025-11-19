/**
 * Skeleton loading components for better perceived performance
 */

export const SkeletonCard = () => (
	<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
		<div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
		<div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
		<div className="h-3 bg-gray-200 rounded w-2/3"></div>
	</div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
	<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		<div className="animate-pulse">
			{/* Header */}
			<div className="bg-gray-50 border-b border-gray-200 p-4">
				<div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
					{Array.from({ length: columns }).map((_, i) => (
						<div key={i} className="h-4 bg-gray-200 rounded"></div>
					))}
				</div>
			</div>
			{/* Rows */}
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<div key={rowIndex} className="border-b border-gray-200 p-4">
					<div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
						{Array.from({ length: columns }).map((_, colIndex) => (
							<div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
						))}
					</div>
				</div>
			))}
		</div>
	</div>
);

export const SkeletonChart = () => (
	<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
		<div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
		<div className="h-64 bg-gray-100 rounded flex items-end justify-around p-4 space-x-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="bg-gray-200 rounded-t"
					style={{
						height: `${Math.random() * 60 + 40}%`,
						width: '100%'
					}}
				></div>
			))}
		</div>
	</div>
);

export const SkeletonList = ({ items = 5 }) => (
	<div className="space-y-3 animate-pulse">
		{Array.from({ length: items }).map((_, i) => (
			<div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div className="flex items-center space-x-4">
					<div className="h-12 w-12 bg-gray-200 rounded-full"></div>
					<div className="flex-1 space-y-2">
						<div className="h-4 bg-gray-200 rounded w-3/4"></div>
						<div className="h-3 bg-gray-200 rounded w-1/2"></div>
					</div>
				</div>
			</div>
		))}
	</div>
);

export const SkeletonText = ({ lines = 3 }) => (
	<div className="space-y-2 animate-pulse">
		{Array.from({ length: lines }).map((_, i) => (
			<div
				key={i}
				className="h-3 bg-gray-200 rounded"
				style={{ width: i === lines - 1 ? '60%' : '100%' }}
			></div>
		))}
	</div>
);

export default {
	SkeletonCard,
	SkeletonTable,
	SkeletonChart,
	SkeletonList,
	SkeletonText,
};
