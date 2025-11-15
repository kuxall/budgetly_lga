# Budgetly - AI-Powered Personal Finance Manager

By Lumen Grove Analytics

## Overview

Budgetly is an intelligent personal finance management platform that leverages advanced AI to help you track expenses, analyze spending patterns, and make smarter financial decisions. Upload receipt images, get AI-powered insights, and take control of your financial future.

## Key Features

### Smart Receipt Processing

- Upload receipts in any format (JPG, PNG, PDF)
- Automatic OCR extraction of merchant, date, amount, and line items
- Intelligent expense categorization
- Support for images up to 50MB with auto-optimization

### Income-Aware Budgeting

- Budget Health Score (0-100) evaluating your financial wellness
- AI-powered budget recommendations using the 50/30/20 rule
- Auto-suggest budget amounts based on your income
- Track available income to allocate across budgets
- Spending vs income trends with savings rate analysis

### AI-Powered Insights

- Comprehensive financial health scoring
- Personalized recommendations to optimize spending
- Pattern identification and trend analysis
- Interactive chat assistant for financial queries
- Predictive spending forecasts

### Budget Management

- Set category-specific budget limits
- Real-time tracking with visual progress indicators
- Overspending alerts and notifications
- Monthly budget vs actual spending analysis
- Income-based budget recommendations

### Financial Analytics

- Spending trends visualization over time
- Category breakdown charts
- Income vs expenses tracking
- Savings rate calculations
- 6-month historical analysis

## Technology Stack

### Backend

- **Framework**: FastAPI (high-performance Python web framework)
- **Runtime**: Python 3.8+
- **AI/ML**: OpenAI GPT-4o (complex analysis, OCR) and GPT-4o-mini (validation)
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT tokens with bcrypt password hashing
- **Image Processing**: Pillow (PIL), PyPDF2
- **Email**: aiosmtplib for notifications
- **Server**: Uvicorn ASGI server

### Frontend

- **Framework**: React 18.2.0
- **Styling**: Tailwind CSS 3.3.0
- **Charts**: Chart.js 4.4.0 with react-chartjs-2
- **State Management**: Zustand 4.5.7
- **Routing**: React Router DOM 6.8.0
- **Animations**: Framer Motion 10.18.0
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment (recommended):

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `.env` file with your configuration:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_secret_key_change_in_production

# Optional - AI Model Configuration
OPENAI_OCR_MODEL=gpt-4o
OPENAI_INSIGHTS_MODEL=gpt-4o
OPENAI_VALIDATION_MODEL=gpt-4o-mini

# Optional - CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional - Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com

# Optional - Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

5. Start the server:

```bash
uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:8001
```

4. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:8001/docs` (interactive API testing)
- **ReDoc**: `http://localhost:8001/redoc` (clean documentation)

## API Endpoints

### Authentication

```
POST   /api/v1/auth/register              Register new user
POST   /api/v1/auth/login                 User login
GET    /api/v1/auth/profile               Get user profile
POST   /api/v1/auth/forgot-password       Request password reset
POST   /api/v1/auth/reset-password        Reset password with token
GET    /api/v1/auth/oauth/google          Google OAuth login
POST   /api/v1/auth/oauth/google/token    Google token login
```

### Income Management

```
POST   /api/v1/income                     Create income record
GET    /api/v1/income                     Get all income records
GET    /api/v1/income/monthly-average     Get average monthly income
GET    /api/v1/income/{id}                Get specific income
PUT    /api/v1/income/{id}                Update income
DELETE /api/v1/income/{id}                Delete income
```

### Expense Management

```
POST   /api/v1/expenses                   Create expense
GET    /api/v1/expenses                   Get all expenses
GET    /api/v1/expenses/{id}              Get specific expense
PUT    /api/v1/expenses/{id}              Update expense
DELETE /api/v1/expenses/{id}              Delete expense
```

### Budget Management

```
POST   /api/v1/budgets                    Create budget
GET    /api/v1/budgets                    Get all budgets
GET    /api/v1/budgets/health-score       Get budget health score
GET    /api/v1/budgets/recommendations    Get AI budget recommendations
GET    /api/v1/budgets/{id}               Get specific budget
PUT    /api/v1/budgets/{id}               Update budget
DELETE /api/v1/budgets/{id}               Delete budget
```

### AI Features

```
POST   /api/v1/receipts/upload            Upload receipt for OCR processing
POST   /api/v1/ai/chat                    Chat with AI assistant
GET    /api/v1/ai/insights                Get financial insights
```

### System

```
GET    /health                            Health check
GET    /api/v1/config/models              Get AI model configuration
```

## Example API Usage

### Register a User

```bash
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Create an Expense

```bash
curl -X POST http://localhost:8001/api/v1/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Grocery shopping",
    "amount": 150.00,
    "category": "Groceries",
    "date": "2025-11-14"
  }'
```

### Upload a Receipt

```bash
curl -X POST http://localhost:8001/api/v1/receipts/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@receipt.jpg"
```

## Project Structure

```
budgetly/
├── backend/
│   ├── services/          # Business logic
│   ├── main.py           # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── readme.md
```

## AI Model Configuration

Budgetly uses a multi-model approach for optimal performance and cost efficiency:

- **GPT-4o**: Used for complex financial analysis, receipt OCR with vision capabilities, and generating detailed insights
- **GPT-4o-mini**: Used for data validation and simple tasks to reduce costs

You can customize model selection in your `.env` file or through the API at `/api/v1/config/models`.

## Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:

- Code follows existing style conventions
- All tests pass
- Documentation is updated as needed

## License

This project is licensed under the MIT License.

## Support

For support, questions, or feedback:

- Email: kuxall0@gmail.com
- GitHub Issues: Report bugs or request features
- Documentation: See `/docs` directory for additional guides

## Acknowledgments

- OpenAI for GPT models
- FastAPI and React communities
- All open-source contributors

---

Built with care by Lumen Grove Analytics
