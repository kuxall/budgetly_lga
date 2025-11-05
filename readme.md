# Budgetly - AI-Powered Personal Finance Manager

#### By Lumen Grove Analytics

## Overview

Budgetly is an intelligent personal finance management platform that uses advanced AI to help you track expenses, analyze spending patterns, and make smarter financial decisions. Upload receipt images, get AI-powered insights, and take control of your financial future.

## Key Features

### 🧾 Smart Receipt Processing

- **OCR Technology**: Upload any receipt image (JPG, PNG, PDF) and extract data automatically
- **Multi-format Support**: Handles images up to 50MB with auto-optimization
- **Intelligent Parsing**: Extracts merchant, date, amount, and itemized purchases

### 🤖 AI-Powered Insights

- **Financial Health Scoring**: Get a comprehensive health score based on your spending
- **Smart Recommendations**: Personalized suggestions to optimize your budget
- **Spending Analysis**: Identify patterns and trends in your expenses
- **Interactive Chat**: Ask questions about your finances and get AI-powered answers

### 💰 Budget Management

- **Category Budgets**: Set limits for different spending categories
- **Real-time Tracking**: Monitor budget usage with visual indicators
- **Overspending Alerts**: Get notified when approaching budget limits

### 📊 Financial Analytics

- **Spending Trends**: Visualize your spending patterns over time
- **Category Breakdown**: See where your money goes with detailed charts
- **Income vs Expenses**: Track your financial position and savings rate

## Technology Stack

### Backend

- **FastAPI**: High-performance Python web framework
- **OpenAI GPT Models**: Multi-model AI architecture
  - GPT-4o for complex financial analysis and OCR processing
  - GPT-4o-mini for data validation and simple tasks
- **PIL/Pillow**: Advanced image processing
- **PyPDF2**: PDF text extraction

### Frontend

- **React**: Modern JavaScript framework
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful, consistent icons

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_OCR_MODEL=gpt-4o
   OPENAI_INSIGHTS_MODEL=gpt-4o
   OPENAI_VALIDATION_MODEL=gpt-4o-mini
   ```

4. Start the server:
   ```bash
   uvicorn main:app --reload --port 8001
   ```

### Frontend Setup

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser

## AI Model Configuration

Budgetly uses different AI models optimized for specific tasks:

- **OCR Processing** → GPT-4o (excellent receipt scanning with vision support)
- **Financial Insights** → GPT-4o (advanced analysis and recommendations)
- **Data Validation** → GPT-4o-mini (quick validation, cost-effective)

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/profile` - Get user profile

### Expenses

- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/expenses` - Get user expenses
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

### Budgets

- `POST /api/v1/budgets` - Create budget
- `GET /api/v1/budgets` - Get user budgets
- `PUT /api/v1/budgets/{id}` - Update budget

### AI Features

- `POST /api/v1/ai/chat` - Chat with AI assistant
- `GET /api/v1/ai/insights` - Get financial insights
- `POST /api/v1/receipts/upload` - Upload and process receipts

## Features in Detail

### Receipt Processing

- Upload images in any format (JPEG, PNG, PDF, etc.)
- Automatic image optimization and resizing
- Extract merchant names, dates, amounts, and line items
- Smart categorization of expenses

### AI Chat Assistant

- Ask questions about your spending: "How much did I spend on groceries?"
- Get personalized financial advice
- Analyze spending patterns and trends
- Receive actionable recommendations

### Budget Tracking

- Set monthly budgets by category
- Visual progress indicators
- Overspending notifications
- Budget vs actual spending analysis

### Financial Insights

- Comprehensive financial health scoring
- Spending trend analysis
- Category-wise breakdowns
- Savings rate calculations
- Predictive spending forecasts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the Lumen Grove Analytics team.
