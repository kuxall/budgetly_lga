import { useState, useRef, useEffect } from 'react';
import { Bot, X, Minus, Send } from 'lucide-react';
import aiInsightsService from '../../services/aiInsightsService';
import './AIChat.css';

const AIChat = () => {
	const [messages, setMessages] = useState([
		{
			id: 1,
			type: 'ai',
			content: "Hi! I'm SavI, your AI financial advisor. I can help you with budgeting, saving tips, expense analysis, and financial planning. What would you like to know?",
			timestamp: new Date()
		}
	]);
	const [inputMessage, setInputMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || isLoading) return;

		const userMessage = {
			id: Date.now(),
			type: 'user',
			content: inputMessage.trim(),
			timestamp: new Date()
		};

		setMessages(prev => [...prev, userMessage]);
		setInputMessage('');
		setIsLoading(true);

		try {
			// Prepare chat history for API (last 10 messages)
			const chatHistory = messages.slice(-10).map(msg => ({
				role: msg.type === 'user' ? 'user' : 'assistant',
				content: msg.content
			}));

			const response = await aiInsightsService.chatWithAI(userMessage.content, chatHistory);

			const aiMessage = {
				id: Date.now() + 1,
				type: 'ai',
				content: response.response || response.message || "I'm sorry, I couldn't process your request right now.",
				timestamp: new Date(),
				status: response.status
			};

			setMessages(prev => [...prev, aiMessage]);

		} catch (error) {
			console.error('Chat error:', error);
			const errorMessage = {
				id: Date.now() + 1,
				type: 'ai',
				content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
				timestamp: new Date(),
				isError: true
			};
			setMessages(prev => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const formatTime = (timestamp) => {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const quickQuestions = [
		"Analyze my spending patterns",
		"How much did I spend on groceries?",
		"Am I over budget in any category?"
	];

	const handleQuickQuestion = (question) => {
		setInputMessage(question);
		inputRef.current?.focus();
	};

	if (!isExpanded) {
		return (
			<div className="fixed bottom-6 right-6 z-50">
				<div className="relative">
					<button
						onClick={() => setIsExpanded(true)}
						className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full p-4 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl chat-button-pulse"
						title="Chat with SavI - Your AI Financial Assistant"
					>
						<Bot size={24} className="animate-bounce" />
					</button>
					{/* Floating indicator */}
					<div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
					<div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full"></div>
					{/* Floating text hint */}
					<div className="absolute -top-12 right-0 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
						💬 Ask me anything about your finances!
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-500 ease-in-out transform ${isMinimized ? 'h-16 scale-95' : 'h-[550px] scale-100'
			} animate-in slide-in-from-bottom-4 fade-in`}>
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-xl flex items-center justify-between">
				<div className="flex items-center">
					<div className="relative">
						<Bot size={20} className="mr-3" />
						<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
					</div>
					<div>
						<span className="font-semibold">SavI</span>
						<div className="text-xs text-blue-100">AI Financial Assistant</div>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<button
						onClick={() => setIsMinimized(!isMinimized)}
						className="text-white hover:text-blue-200 transition-all duration-200 p-1 rounded hover:bg-white hover:bg-opacity-20"
						title={isMinimized ? "Expand chat" : "Minimize chat"}
					>
						<Minus size={16} className={`transform transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} />
					</button>
					<button
						onClick={() => setIsExpanded(false)}
						className="text-white hover:text-blue-200 transition-all duration-200 p-1 rounded hover:bg-white hover:bg-opacity-20"
						title="Close chat"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Messages */}
			{!isMinimized && (
				<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white min-h-0">
					{messages.map((message, index) => (
						<div
							key={message.id}
							className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in`}
							style={{ animationDelay: `${index * 0.1}s` }}
						>
							<div
								className={`max-w-[90%] p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${message.type === 'user'
									? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
									: message.isError
										? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200'
										: 'bg-white text-gray-800 border border-gray-200'
									}`}
							>
								<div className="text-sm leading-relaxed whitespace-pre-wrap">
									{message.content}
								</div>
								<div className={`text-xs mt-2 opacity-70 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
									}`}>
									{formatTime(message.timestamp)}
								</div>
							</div>
						</div>
					))}

					{isLoading && (
						<div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in">
							<div className="bg-white text-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200">
								<div className="flex items-center space-x-3">
									<div className="flex space-x-1">
										<div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
										<div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
										<div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
									</div>
									<span className="text-sm text-gray-600">SavI is analyzing your finances...</span>
								</div>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>
			)}

			{/* Quick Questions */}
			{!isMinimized && messages.length <= 1 && (
				<div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
					<div className="text-xs text-gray-500 mb-2 font-medium">💡 Try asking:</div>
					<div className="space-y-2">
						{quickQuestions.map((question, index) => (
							<button
								key={index}
								onClick={() => handleQuickQuestion(question)}
								className="w-full text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-2 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200 hover:border-blue-300 transform hover:scale-[1.02] text-left"
							>
								{question}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Input */}
			{!isMinimized && (
				<div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
					<div className="flex space-x-3">
						<input
							ref={inputRef}
							type="text"
							value={inputMessage}
							onChange={(e) => setInputMessage(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Ask me about your finances..."
							className="flex-1 border border-gray-300 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
							disabled={isLoading}
						/>
						<button
							onClick={handleSendMessage}
							disabled={!inputMessage.trim() || isLoading}
							className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
						>
							<Send size={16} className={`${isLoading ? 'animate-pulse' : ''}`} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default AIChat;