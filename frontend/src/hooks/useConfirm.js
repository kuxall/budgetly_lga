import { useState, useRef } from 'react';

export const useConfirm = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [config, setConfig] = useState({
		title: '',
		message: '',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		type: 'warning',
		onConfirm: () => { }
	});
	const [isLoading, setIsLoading] = useState(false);
	const resolveRef = useRef(null);

	const confirm = ({
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		type = 'warning'
	}) => {
		return new Promise((resolve) => {
			resolveRef.current = resolve;

			setConfig({
				title,
				message,
				confirmText,
				cancelText,
				type,
				onConfirm: async () => {
					setIsLoading(true);
					try {
						if (resolveRef.current) {
							resolveRef.current(true);
							resolveRef.current = null;
						}
					} finally {
						setIsLoading(false);
						setIsOpen(false);
					}
				}
			});
			setIsOpen(true);
		});
	};

	const handleClose = () => {
		if (!isLoading) {
			// Resolve with false when cancelled
			if (resolveRef.current) {
				resolveRef.current(false);
				resolveRef.current = null;
			}
			setIsOpen(false);
		}
	};

	return {
		isOpen,
		config,
		isLoading,
		confirm,
		handleClose
	};
};
