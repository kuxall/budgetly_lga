"""Advanced AI-powered financial insights service with chat functionality using OpenAI GPT-4."""
import os
import json
import statistics
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Any, Optional
import httpx
import logging
from .model_config_service import model_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIInsightsService:
    """Advanced service for generating AI-powered financial insights and chat functionality using GPT-4."""

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            logger.warning(
                "OPENAI_API_KEY not found - AI features will be limited")
            self.openai_api_key = None

        self.openai_url = "https://api.openai.com/v1/chat/completions"

        # Get model configurations for different features
        self.insights_model = model_config.get_model_for_feature(
            "insights")  # GPT-4o for complex analysis
        self.validation_model = model_config.get_model_for_feature(
            "validation")  # GPT-4o-mini for simple tasks

        self.max_tokens = model_config.get_token_limit_for_feature(
            "insights")
        self.temperature = 0.2  # Lower for more consistent financial advice
        self.is_configured = bool(self.openai_api_key)

        if self.is_configured:
            logger.info(
                f"OpenAI API configured. Using {self.insights_model} for insights, {self.validation_model} for validation.")
        else:
            logger.warning(
                "OpenAI API key not configured. AI features will be disabled.")

    # ==================== CHAT FUNCTIONALITY (TOP PRIORITY) ====================

    async def chat_with_ai(self,
                           message: str,
                           user_context: Dict[str, Any] = None,
                           chat_history: List[Dict] = None,
                           timeout_seconds: int = 60) -> Dict[str, Any]:
        """
        Primary chat functionality for financial Q&A and advice.
        This is the main feature users will interact with.
        """
        if not self.openai_api_key:
            return {
                "response": "I'm sorry, but the AI chat feature is not available right now. Please configure the OpenAI API key to enable this functionality.",
                "status": "error",
                "error_type": "api_key_missing"
            }

        try:
            # Prepare context-aware chat prompt
            system_prompt = self._create_chat_system_prompt(user_context)

            # Build conversation history
            messages = [{"role": "system", "content": system_prompt}]

            # Add chat history if provided
            if chat_history:
                # Keep last 10 messages for context
                messages.extend(chat_history[-10:])

            # Add current user message with enhanced context for item queries
            enhanced_message = self._enhance_message_with_item_data(
                message, user_context)
            messages.append({"role": "user", "content": enhanced_message})

            # Get AI response with timeout
            try:
                response = await asyncio.wait_for(
                    self._call_openai_chat_api(messages),
                    timeout=timeout_seconds
                )

                return {
                    "response": response,
                    "status": "success",
                    "model_used": self.insights_model,
                    "timestamp": datetime.now().isoformat()
                }
            except asyncio.TimeoutError:
                # Try fallback model if primary model times out
                if self.insights_model.startswith('gpt-5'):
                    logger.warning(
                        f"GPT-5 model timed out, trying fallback model")
                    fallback_response = await self._try_fallback_model(messages, timeout_seconds // 2)
                    if fallback_response:
                        return fallback_response
                raise

        except asyncio.TimeoutError:
            logger.warning("Chat AI timeout")
            return {
                "response": "I'm taking longer than usual to respond. Please try asking your question again.",
                "status": "timeout",
                "error_type": "timeout"
            }
        except Exception as e:
            logger.error(f"Chat AI error: {e}")
            return {
                "response": "I encountered an issue while processing your question. Please try again or rephrase your question.",
                "status": "error",
                "error_type": "processing_error",
                "error_details": str(e)
            }

    def _create_chat_system_prompt(self, user_context: Dict[str, Any] = None) -> str:
        """Create a context-aware system prompt for chat functionality."""
        base_prompt = """You are SavI, a concise, data-driven financial advisor. Follow these rules:
        
        RESPONSE STYLE:
        - Keep responses SHORT (5 sentences max for general questions)
        - Be direct and actionable
        - Use bullet points for multiple suggestions
        - Avoid lengthy explanations unless specifically asked

        PERSONALIZATION RULES:
        - ALWAYS prioritize user's actual financial data when available
        - For questions about their spending/budgeting: Use their real data extensively
        - For general financial questions: Give brief, practical advice
        - If no relevant user data: Keep response to 3-5 sentences maximum

        TONE:
        - Friendly but professional
        - Encouraging and supportive
        - Focus on practical next steps"""

        if user_context:
            context_info = []

            # Build detailed financial profile
            if user_context.get('total_expenses'):
                context_info.append(
                    f"Total expenses: ${user_context['total_expenses']:.2f}")

            if user_context.get('total_income'):
                context_info.append(
                    f"Total income: ${user_context['total_income']:.2f}")
                net_position = user_context['total_income'] - \
                    user_context.get('total_expenses', 0)
                context_info.append(f"Net position: ${net_position:.2f}")

            if user_context.get('top_categories'):
                top_cats = ", ".join(
                    [f"{cat}: ${amt:.0f}" for cat, amt in user_context['top_categories'][:3]])
                context_info.append(f"Top spending: {top_cats}")

            if user_context.get('budget_count'):
                context_info.append(
                    f"Active budgets: {user_context['budget_count']}")

            if user_context.get('expense_count'):
                context_info.append(
                    f"Total transactions: {user_context['expense_count']}")

            if user_context.get('recent_expenses'):
                context_info.append(
                    f"Recent expenses (last 30 days): ${user_context['recent_expenses']:.2f}")

            if user_context.get('avg_transaction'):
                context_info.append(
                    f"Average transaction: ${user_context['avg_transaction']:.2f}")

            if user_context.get('top_merchant'):
                context_info.append(
                    f"Most frequent merchant: {user_context['top_merchant']}")

            # Budget analysis
            if user_context.get('budget_analysis'):
                over_budget = [
                    b for b in user_context['budget_analysis'] if b['status'] == 'over']
                under_budget = [
                    b for b in user_context['budget_analysis'] if b['status'] == 'under']

                if over_budget:
                    over_cats = ", ".join(
                        [f"{b['category']} (${b['over_under']:.0f} over)" for b in over_budget[:2]])
                    context_info.append(f"Over budget: {over_cats}")

                if under_budget:
                    under_cats = ", ".join(
                        [f"{b['category']} (${abs(b['over_under']):.0f} under)" for b in under_budget[:2]])
                    context_info.append(f"Under budget: {under_cats}")

            # Receipt and item-level data
            if user_context.get('receipt_count'):
                context_info.append(
                    f"Receipts processed: {user_context['receipt_count']}")

            if user_context.get('total_items_purchased'):
                context_info.append(
                    f"Individual items tracked: {user_context['total_items_purchased']}")

            if user_context.get('top_purchased_items'):
                top_items = ", ".join(
                    [f"{item[0]} ({item[1]}x)" for item in user_context['top_purchased_items'][:3]])
                context_info.append(f"Most purchased items: {top_items}")

            if user_context.get('highest_spending_items'):
                top_spend_items = ", ".join(
                    [f"{item[0]} (${item[1]:.0f})" for item in user_context['highest_spending_items'][:3]])
                context_info.append(
                    f"Highest spending items: {top_spend_items}")

            if user_context.get('recent_items_count'):
                context_info.append(
                    f"Recent items (30 days): {user_context['recent_items_count']} items, ${user_context.get('recent_items_spending', 0):.2f}")

            if context_info:
                base_prompt += f"\n\nUSER'S ACTUAL DATA:\n• " + \
                    "\n• ".join(context_info)

                # Add item-level query capability
                if user_context.get('recent_items'):
                    base_prompt += f"\n\nITEM-LEVEL DATA AVAILABLE: You have access to detailed purchase data including specific items, quantities, prices, and merchants. For questions about specific products (like 'How much did I spend on tomatoes?' or 'Where did I buy milk?'), search through the recent_items data to provide exact answers."

                base_prompt += f"\n\nIMPORTANT: Use this real data to give specific, personalized advice. Reference actual numbers, categories, and items when relevant to their question. For general questions not related to their data, keep responses to 5 sentences max."
        else:
            base_prompt += "\n\nNo user financial data available. Keep responses brief and general."

        return base_prompt

    def _enhance_message_with_item_data(self, message: str, user_context: Dict[str, Any]) -> str:
        """Enhance user message with relevant item data for specific product queries."""
        if not user_context.get('recent_items'):
            return message

        # Check if the message is asking about specific items/products
        item_keywords = ['spend on', 'bought', 'purchase', 'buy',
                         'cost of', 'price of', 'how much', 'where did i']
        product_indicators = ['tomato', 'milk', 'bread',
                              'coffee', 'gas', 'grocery', 'food', 'restaurant']

        message_lower = message.lower()
        is_item_query = any(
            keyword in message_lower for keyword in item_keywords)

        if is_item_query:
            recent_items = user_context['recent_items']

            # Search for relevant items based on the query
            relevant_items = []
            for item in recent_items:
                item_name = item['name'].lower()
                # Simple keyword matching - could be enhanced with fuzzy matching
                for word in message_lower.split():
                    if len(word) > 3 and word in item_name:
                        relevant_items.append(item)
                        break

            if relevant_items:
                # Add relevant item data to the message
                items_context = "\n\nRELEVANT ITEMS FROM YOUR RECEIPTS:\n"
                for item in relevant_items[-10:]:  # Last 10 relevant items
                    items_context += f"• {item['name']} - ${item['price']:.2f} x{item['quantity']} at {item['merchant']} on {item['date']}\n"

                return message + items_context

        return message

    async def _try_fallback_model(self, messages: List[Dict], timeout_seconds: int) -> Optional[Dict[str, Any]]:
        """Try fallback model (GPT-4o) if primary model fails."""
        try:
            fallback_model = "gpt-4o"
            logger.info(f"Attempting fallback to {fallback_model}")

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.openai_api_key}"
            }

            payload = {
                "model": fallback_model,
                "messages": messages,
                "max_tokens": 1500,  
                "temperature": 0.3,  
                "stream": False
            }

            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(self.openai_url, headers=headers, json=payload)

                if response.status_code == 200:
                    result = response.json()
                    return {
                        "response": result["choices"][0]["message"]["content"],
                        "status": "success_fallback",
                        "model_used": fallback_model,
                        "timestamp": datetime.now().isoformat(),
                        "note": "Used fallback model due to primary model timeout"
                    }

        except Exception as e:
            logger.error(f"Fallback model also failed: {e}")

        return None

    async def _call_openai_chat_api(self, messages: List[Dict], max_retries: int = 2) -> str:
        """Optimized OpenAI API call for chat functionality."""
        if not self.openai_api_key:
            raise Exception("OpenAI API key not available")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        payload = {
            "model": self.insights_model,  
            "messages": messages,
            "max_tokens": self.max_tokens,
            "stream": False
        }

        payload["temperature"] = 0.3

        for attempt in range(max_retries):
            try:
                # Standard timeouts for GPT-4 models
                base_timeout = 25.0
                timeout_duration = base_timeout + \
                    (attempt * 15.0)  # Progressive timeout
                async with httpx.AsyncClient(timeout=timeout_duration) as client:
                    response = await client.post(self.openai_url, headers=headers, json=payload)

                    if response.status_code == 200:
                        result = response.json()
                        return result["choices"][0]["message"]["content"]
                    elif response.status_code == 429:  # Rate limit
                        if attempt < max_retries - 1:
                            # Exponential backoff
                            await asyncio.sleep(2 ** attempt)
                            continue
                        else:
                            raise Exception("OpenAI API rate limit exceeded")
                    else:
                        raise Exception(
                            f"OpenAI API error: {response.status_code} - {response.text}")

            except httpx.TimeoutException:
                if attempt < max_retries - 1:
                    logger.warning(
                        f"OpenAI chat timeout on attempt {attempt + 1}, retrying...")
                    await asyncio.sleep(1)
                    continue
                else:
                    raise Exception("OpenAI API timeout")
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise e

    async def generate_spending_insights(self,
                                         expenses: List[Dict],
                                         budgets: List[Dict] = None,
                                         income: List[Dict] = None,
                                         timeout_seconds: int = 30) -> Dict[str, Any]:
        """Generate comprehensive AI-powered spending insights with optimized performance."""
        if not expenses:
            return {
                "message": "No expenses to analyze",
                "insights": [],
                "ai_status": "no_data"
            }

        try:
            statistical_insights = self._generate_statistical_insights(
                expenses, budgets, income)

            # Prepare optimized data for AI analysis
            analysis_data = self._prepare_analysis_data(
                expenses, budgets, income)

            # If no OpenAI key, return enhanced statistical insights
            if not self.openai_api_key:
                return self._create_enhanced_statistical_response(analysis_data, statistical_insights)

            # Try AI insights with optimized approach
            try:
                ai_response = await asyncio.wait_for(
                    self._get_comprehensive_ai_insights(analysis_data),
                    timeout=timeout_seconds
                )
                return {
                    **ai_response,
                    "statistical_insights": statistical_insights,
                    "ai_status": "success"
                }
            except asyncio.TimeoutError:
                logger.warning(
                    "AI insights timeout - falling back to statistical insights")
                return self._create_enhanced_statistical_response(analysis_data, statistical_insights)

        except Exception as e:
            logger.error(f"AI service error: {e}")
            # Always return something useful
            statistical_insights = self._generate_statistical_insights(
                expenses, budgets, income)
            analysis_data = self._prepare_analysis_data(
                expenses, budgets, income)
            return self._create_enhanced_statistical_response(analysis_data, statistical_insights)

    def calculate_financial_metrics(self, expenses: List[Dict], income: List[Dict], budgets: List[Dict], user_id: str) -> Dict[str, Any]:
        """Calculate comprehensive financial metrics from user data."""

        # Basic totals
        total_expenses = sum(expense.get("amount", 0) for expense in expenses)
        total_income = sum(inc.get("amount", 0) for inc in income)
        net_position = total_income - total_expenses

        # Recent data (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
        recent_expenses = [
            exp for exp in expenses
            if datetime.fromisoformat(exp.get("date", "1970-01-01")).date() >= thirty_days_ago
        ]
        recent_expense_count = len(recent_expenses)
        recent_total = sum(exp.get("amount", 0) for exp in recent_expenses)

        # Category breakdown
        category_totals = defaultdict(float)
        for expense in expenses:
            category = expense.get("category", "Other")
            category_totals[category] += expense.get("amount", 0)

        # Top categories summary
        top_categories = sorted(category_totals.items(),
                                key=lambda x: x[1], reverse=True)[:3]
        top_categories_summary = ", ".join(
            [f"{cat}: ${amt:.0f}" for cat, amt in top_categories])

        # Average transaction
        average_transaction = total_expenses / len(expenses) if expenses else 0

        # Top merchants (from descriptions)
        merchant_totals = defaultdict(float)
        for expense in expenses:
            merchant = expense.get("description", "Unknown")[
                :50]  # Truncate long descriptions
            merchant_totals[merchant] += expense.get("amount", 0)

        top_merchants = sorted(merchant_totals.items(),
                               key=lambda x: x[1], reverse=True)[:5]
        top_merchants_list = ", ".join(
            [f"{merchant} (${amt:.0f})" for merchant, amt in top_merchants])

        # Spending consistency (coefficient of variation)
        if len(expenses) > 1:
            amounts = [exp.get("amount", 0) for exp in expenses]
            mean_amount = statistics.mean(amounts)
            std_dev = statistics.stdev(amounts)
            consistency_score = max(
                0, 100 - (std_dev / mean_amount * 100)) if mean_amount > 0 else 50
        else:
            consistency_score = 50

        consistency_description = self._get_consistency_description(
            consistency_score)

        # Monthly average (last 6 months)
        six_months_ago = (datetime.now() - timedelta(days=180)).date()
        historical_expenses = [
            exp for exp in expenses
            if datetime.fromisoformat(exp.get("date", "1970-01-01")).date() >= six_months_ago
        ]

        monthly_totals = defaultdict(float)
        for expense in historical_expenses:
            month_key = expense.get("date", "1970-01-01")[:7]  # YYYY-MM format
            monthly_totals[month_key] += expense.get("amount", 0)

        monthly_average = sum(monthly_totals.values()) / \
            len(monthly_totals) if monthly_totals else 0
        current_month = datetime.now().strftime("%Y-%m")
        current_month_total = monthly_totals.get(current_month, 0)

        if monthly_average > 0:
            variance_pct = (
                (current_month_total - monthly_average) / monthly_average) * 100
            if variance_pct > 10:
                current_vs_average = f"current month {variance_pct:.0f}% above average"
            elif variance_pct < -10:
                current_vs_average = f"current month {abs(variance_pct):.0f}% below average"
            else:
                current_vs_average = "current month near average"
        else:
            current_vs_average = "insufficient historical data"

        # Recent trend analysis
        if len(monthly_totals) >= 2:
            recent_months = sorted(monthly_totals.items())[-2:]
            if len(recent_months) == 2:
                prev_month, curr_month = recent_months
                trend_pct = ((curr_month[1] - prev_month[1]) /
                             prev_month[1] * 100) if prev_month[1] > 0 else 0
                if trend_pct > 15:
                    recent_trend = f"Last 30 days show {trend_pct:.0f}% increase from previous month"
                elif trend_pct < -15:
                    recent_trend = f"Last 30 days show {abs(trend_pct):.0f}% decrease from previous month"
                else:
                    recent_trend = "Spending relatively stable compared to previous month"
            else:
                recent_trend = "Stable spending pattern"
        else:
            recent_trend = "Insufficient data for trend analysis"

        return {
            "total_expenses": total_expenses,
            "total_income": total_income,
            "net_income": net_position,
            "expense_count": len(expenses),
            "recent_expense_count": recent_expense_count,
            "top_categories_summary": top_categories_summary,
            "average_transaction": average_transaction,
            "budget_count": len(budgets),
            "category_breakdown": dict(category_totals),
            "top_merchants_list": top_merchants_list,
            "recent_trend_description": recent_trend,
            "consistency_score": consistency_score,
            "consistency_description": consistency_description,
            "monthly_average": monthly_average,
            "current_vs_average": current_vs_average,
            "predicted_amount": self._predict_next_month_spending(monthly_totals),
            "top_categories": top_categories,
            "top_merchants": top_merchants
        }

    def _prepare_analysis_data(self,
                               expenses: List[Dict],
                               budgets: List[Dict] = None,
                               income: List[Dict] = None) -> Dict:
        """Prepare optimized data for AI analysis."""
        # Calculate basic statistics
        total_expenses = sum(exp.get('amount', 0) for exp in expenses)
        total_income = sum(inc.get('amount', 0)
                           for inc in income) if income else 0

        # Group by category
        category_spending = defaultdict(float)
        category_counts = defaultdict(int)
        merchant_spending = defaultdict(float)

        for expense in expenses:
            category = expense.get('category', 'Other')
            amount = expense.get('amount', 0)
            merchant = expense.get('description', 'Unknown')[
                :50]  # Truncate long descriptions

            category_spending[category] += amount
            category_counts[category] += 1
            merchant_spending[merchant] += amount

        # Recent spending trend (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_expenses = []
        for expense in expenses:
            try:
                date_str = expense.get('date', '')
                if date_str:
                    expense_date = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00'))
                    if expense_date >= thirty_days_ago:
                        recent_expenses.append(expense)
            except Exception:
                continue

        # Calculate monthly averages
        monthly_spending = self._get_monthly_spending(expenses)
        avg_monthly = sum(monthly_spending.values(
        )) / len(monthly_spending) if monthly_spending else total_expenses

        # Top categories and merchants
        top_categories = sorted(category_spending.items(),
                                key=lambda x: x[1], reverse=True)[:5]
        top_merchants = sorted(merchant_spending.items(),
                               key=lambda x: x[1], reverse=True)[:5]

        return {
            "total_expenses": total_expenses,
            "total_income": total_income,
            "net_income": total_income - total_expenses,
            "expense_count": len(expenses),
            "recent_expense_count": len(recent_expenses),
            "recent_total": sum(exp.get('amount', 0) for exp in recent_expenses),
            "category_breakdown": dict(category_spending),
            "category_counts": dict(category_counts),
            "top_categories": top_categories,
            "top_merchants": top_merchants,
            "budgets": budgets or [],
            "average_transaction": total_expenses / len(expenses) if expenses else 0,
            "average_monthly": avg_monthly,
            "largest_expense": max(expenses, key=lambda x: x.get('amount', 0)) if expenses else None,
            "most_frequent_category": max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else None,
            "spending_consistency": self._calculate_consistency_score([exp.get('amount', 0) for exp in expenses])
        }

    async def _get_comprehensive_ai_insights(self, data: Dict) -> Dict:
        """Get comprehensive AI insights with optimized prompts."""
        # Create focused, efficient prompt
        prompt = self._create_optimized_prompt(data)

        try:
            response = await self._call_openai_api(prompt)
            parsed_response = self._parse_ai_response(response)

            # Validate and enhance response
            return self._validate_and_enhance_response(parsed_response, data)
        except Exception as e:
            logger.error(f"AI insights generation failed: {e}")
            raise

    def _create_optimized_prompt(self, data: Dict) -> str:
        """Create an optimized, focused prompt for better AI responses."""
        # Summarize key data points
        budget_summary = ""
        if data.get('budgets'):
            budget_summary = f"\nBUDGETS: {len(data['budgets'])} budgets set"

        top_categories_str = ", ".join(
            [f"{cat}: ${amt:.0f}" for cat, amt in data['top_categories'][:3]])

        return f"""As SavI, a financial advisor, analyze this spending data and provide actionable insights in JSON format:

FINANCIAL SUMMARY:
• Total Expenses: ${data['total_expenses']:.2f}
• Total Income: ${data['total_income']:.2f}
• Net Position: ${data['net_income']:.2f}
• Transactions: {data['expense_count']} total, {data['recent_expense_count']} recent
• Top Categories: {top_categories_str}
• Average Transaction: ${data['average_transaction']:.2f}{budget_summary}

Provide analysis in this exact JSON structure:
{{
  "financial_health": {{
    "score": 85,
    "status": "Good",
    "summary": "Brief 1-2 sentence assessment"
  }},
  "key_insights": [
    "Most important spending insight",
    "Second key observation", 
    "Third notable pattern"
  ],
  "recommendations": [{{
    "title": "Specific Action",
    "description": "Clear explanation",
    "impact": "High",
    "savings_potential": 150.00
  }}],
  "spending_analysis": {{
    "top_concern": "Biggest spending issue",
    "positive_trend": "What they're doing well",
    "optimization_area": "Area for improvement"
  }},
  "next_month_prediction": {{
    "estimated_spending": {data['average_monthly']:.2f},
    "confidence": "High",
    "key_factors": ["Factor 1", "Factor 2"]
  }}
}}

Focus on:
1. Actionable, specific advice
2. Realistic savings opportunities  
3. Spending pattern insights
4. Budget optimization
5. Financial goal progress

Return ONLY valid JSON."""

    async def _call_openai_api(self, prompt: str, max_retries: int = 2) -> str:
        """Optimized OpenAI API call with better error handling."""
        if not self.openai_api_key:
            raise Exception("OpenAI API key not available")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }

        payload = {
            "model": self.insights_model,  # Use GPT-4o for comprehensive financial analysis
            "messages": [
                {
                    "role": "system",
                    "content": "You are SavI, an expert financial advisor with advanced analytical capabilities. Provide deep, actionable insights in valid JSON format. Use your advanced reasoning to identify complex patterns and provide sophisticated recommendations."
                },
                {"role": "user", "content": prompt}
            ],
            "max_tokens": self.max_tokens
        }

        # Add temperature for GPT-4 models
        payload["temperature"] = 0.2

        for attempt in range(max_retries):
            try:
                # Standard timeouts for GPT-4 models
                base_timeout = 20.0
                timeout_duration = base_timeout + \
                    (attempt * 15.0)  # Progressive timeout
                async with httpx.AsyncClient(timeout=timeout_duration) as client:
                    response = await client.post(self.openai_url, headers=headers, json=payload)

                    if response.status_code == 200:
                        result = response.json()
                        return result["choices"][0]["message"]["content"]
                    elif response.status_code == 429:  # Rate limit
                        if attempt < max_retries - 1:
                            # Exponential backoff
                            await asyncio.sleep(2 ** attempt)
                            continue
                        else:
                            raise Exception("OpenAI API rate limit exceeded")
                    else:
                        raise Exception(
                            f"OpenAI API error: {response.status_code}")

            except httpx.TimeoutException:
                if attempt < max_retries - 1:
                    logger.warning(
                        f"OpenAI timeout on attempt {attempt + 1}, retrying...")
                    await asyncio.sleep(1)
                    continue
                else:
                    raise Exception("OpenAI API timeout")
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                else:
                    raise e

    def _parse_ai_response(self, response: str) -> Dict:
        """Parse and clean AI response."""
        try:
            # Clean response
            cleaned = response.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            raise Exception("Invalid AI response format")

    def _validate_and_enhance_response(self, ai_response: Dict, data: Dict) -> Dict:
        """Validate and enhance AI response with data-driven insights."""
        # Ensure required fields exist
        validated_response = {
            "financial_health": ai_response.get("financial_health", {
                "score": 70,
                "status": "Fair",
                "summary": "Your financial data shows room for optimization."
            }),
            "key_insights": ai_response.get("key_insights", [
                f"You've spent ${data['total_expenses']:.2f} across {data['expense_count']} transactions",
                f"Your top spending category is {data['most_frequent_category'] or 'Unknown'}",
                "Regular expense tracking will help optimize your spending"
            ]),
            "recommendations": ai_response.get("recommendations", []),
            "spending_analysis": ai_response.get("spending_analysis", {
                "top_concern": "Monitor spending patterns for better control",
                "positive_trend": "You're actively tracking your expenses",
                "optimization_area": f"{data['most_frequent_category'] or 'Top'} category spending"
            }),
            "next_month_prediction": ai_response.get("next_month_prediction", {
                "estimated_spending": data['average_monthly'],
                "confidence": "Medium",
                "key_factors": ["Historical spending patterns", "Current trends"]
            })
        }

        # Add data-driven enhancements
        if data['net_income'] < 0:
            validated_response["financial_health"]["status"] = "Needs Attention"
            validated_response["financial_health"]["score"] = min(
                validated_response["financial_health"]["score"], 50)

        return validated_response

    def _create_enhanced_statistical_response(self, data: Dict, statistical_insights: Dict) -> Dict:
        """Create enhanced response when AI is not available."""
        # Calculate financial health score
        health_score = 70  # Default
        health_status = "Fair"

        if data['total_income'] > 0:
            expense_ratio = (data['total_expenses'] /
                             data['total_income']) * 100
            if expense_ratio < 50:
                health_score, health_status = 90, "Excellent"
            elif expense_ratio < 70:
                health_score, health_status = 75, "Good"
            elif expense_ratio < 90:
                health_score, health_status = 60, "Fair"
            else:
                health_score, health_status = 40, "Needs Attention"

        # Generate insights based on data
        key_insights = [
            f"You've spent ${data['total_expenses']:.2f} across {data['expense_count']} transactions",
            f"Your top spending category is {data['most_frequent_category'] or 'Unknown'} (${data['category_breakdown'].get(data['most_frequent_category'], 0):.2f})",
            f"Average transaction amount: ${data['average_transaction']:.2f}"
        ]

        # Add recent spending insight
        if data['recent_expense_count'] > 0:
            recent_avg = data['recent_total'] / data['recent_expense_count']
            if recent_avg > data['average_transaction'] * 1.2:
                key_insights.append(
                    "Recent spending is above your average - consider reviewing recent purchases")
            elif recent_avg < data['average_transaction'] * 0.8:
                key_insights.append(
                    "Recent spending is below average - good spending control!")

        # Generate recommendations
        recommendations = []

        # Budget recommendation
        if not data['budgets']:
            recommendations.append({
                "title": "Set Up Budgets",
                "description": f"Create a budget for {data['most_frequent_category'] or 'your top category'} to better control spending",
                "impact": "High",
                "savings_potential": data['category_breakdown'].get(data['most_frequent_category'], 0) * 0.1
            })

        # Category optimization
        if data['top_categories']:
            top_cat, top_amount = data['top_categories'][0]
            # If category is >30% of monthly spending
            if top_amount > data['average_monthly'] * 0.3:
                recommendations.append({
                    "title": f"Optimize {top_cat} Spending",
                    "description": f"Your {top_cat} spending (${top_amount:.2f}) could be optimized for savings",
                    "impact": "Medium",
                    "savings_potential": top_amount * 0.15
                })

        return {
            "financial_health": {
                "score": health_score,
                "status": health_status,
                "summary": f"You're spending {(data['total_expenses']/data['total_income']*100) if data['total_income'] > 0 else 0:.1f}% of your income with room for optimization."
            },
            "key_insights": key_insights,
            "recommendations": recommendations,
            "spending_analysis": {
                "top_concern": f"{data['most_frequent_category'] or 'Top'} category represents your largest expense area",
                "positive_trend": "You're actively tracking expenses, which is excellent for financial awareness",
                "optimization_area": f"Focus on {data['most_frequent_category'] or 'top spending'} category for potential savings"
            },
            "next_month_prediction": {
                "estimated_spending": data['average_monthly'],
                "confidence": "Medium",
                "key_factors": ["Historical spending patterns", "Current category trends"]
            },
            "statistical_insights": statistical_insights,
            "ai_status": "statistical_enhanced"
        }

    def _get_consistency_description(self, score: float) -> str:
        """Convert consistency score to description."""
        if score >= 80:
            return "very consistent spending"
        elif score >= 60:
            return "moderate consistency"
        elif score >= 40:
            return "somewhat inconsistent"
        else:
            return "highly variable spending"

    def _predict_next_month_spending(self, monthly_totals: Dict[str, float]) -> float:
        """Simple prediction based on recent trends."""
        if len(monthly_totals) < 2:
            return 0

        amounts = list(monthly_totals.values())
        if len(amounts) >= 3:
            # Use weighted average of last 3 months
            weights = [1, 2, 3]  # More weight on recent months
            weighted_sum = sum(amounts[-3:][i] * weights[i]
                               for i in range(len(amounts[-3:])))
            weighted_avg = weighted_sum / sum(weights[:len(amounts[-3:])])
            return weighted_avg
        else:
            # Simple average
            return sum(amounts) / len(amounts)

    def prepare_prompt(self, metrics: Dict[str, Any]) -> str:
        """Prepare the AI prompt with calculated metrics."""

        prompt = f"""As SavI, a financial advisor, analyze this spending data and provide actionable insights:

FINANCIAL SUMMARY:
• Total Expenses: ${metrics['total_expenses']:.2f}
• Total Income: ${metrics['total_income']:.2f}
• Net Position: ${metrics['net_income']:.2f}
• Transactions: {metrics['expense_count']} total, {metrics['recent_expense_count']} recent
• Top Categories: {metrics['top_categories_summary']}
• Average Transaction: ${metrics['average_transaction']:.2f}
• BUDGETS: {metrics['budget_count']} budgets set

DETAILED DATA:
• Category Breakdown: {', '.join([f'{cat}: ${amt:.0f}' for cat, amt in metrics['category_breakdown'].items()])}
• Top Merchants: {metrics['top_merchants_list']}
• Recent Spending Trend: {metrics['recent_trend_description']}
• Spending Consistency Score: {metrics['consistency_score']:.1f} ({metrics['consistency_description']})
• Monthly Average: ${metrics['monthly_average']:.2f} ({metrics['current_vs_average']})

Provide analysis in this exact JSON structure:

{{
  "financial_health": {{
    "score": 85,
    "status": "Good",
    "summary": "Brief 1-2 sentence assessment"
  }},
  "key_insights": [
    "Most important spending insight",
    "Second key observation", 
    "Third notable pattern"
  ],
  "recommendations": [{{
    "title": "Specific Action",
    "description": "Clear explanation",
    "impact": "High",
    "savings_potential": 150.00
  }}],
  "spending_analysis": {{
    "top_concern": "Biggest spending issue",
    "positive_trend": "What they're doing well",
    "optimization_area": "Area for improvement"
  }},
  "next_month_prediction": {{
    "estimated_spending": {metrics['predicted_amount']:.2f},
    "confidence": "High",
    "key_factors": ["Factor 1", "Factor 2"]
  }}
}}

Focus on:
1. Actionable, specific advice
2. Realistic savings opportunities  
3. Spending pattern insights
4. Budget optimization
5. Financial goal progress

Return ONLY valid JSON."""

        return prompt

    async def generate_insights(self, prompt: str) -> Dict[str, Any]:
        """Generate AI insights using OpenAI API."""

        if not self.is_configured:
            return {
                "error": "AI insights service not configured",
                "fallback_insights": self._generate_fallback_insights()
            }

        try:
            # Use the JSON-based approach instead of structured text
            insights_text = await self._call_openai_api(prompt)

            # Try to parse as JSON first (new format)
            try:
                # Clean the response
                cleaned_content = insights_text.strip()
                if cleaned_content.startswith('```json'):
                    cleaned_content = cleaned_content[7:]
                if cleaned_content.endswith('```'):
                    cleaned_content = cleaned_content[:-3]
                cleaned_content = cleaned_content.strip()

                parsed_insights = json.loads(cleaned_content)

                return {
                    "success": True,
                    "insights": parsed_insights,
                    "raw_response": insights_text,
                    "model_used": self.insights_model
                }

            except json.JSONDecodeError:
                # Fallback to structured text parsing
                logger.warning(
                    "Failed to parse JSON response, trying structured text parsing")
                parsed_insights = self._parse_insights_response(insights_text)

                return {
                    "success": True,
                    "insights": parsed_insights,
                    "raw_response": insights_text,
                    "model_used": self.insights_model
                }

        except Exception as e:
            logger.error(f"Error generating AI insights: {str(e)}")
            return {
                "error": f"Failed to generate insights: {str(e)}",
                "fallback_insights": self._generate_fallback_insights()
            }

    def _parse_insights_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the structured AI response into a dictionary."""

        sections = {}
        current_section = None
        current_content = []

        lines = response_text.strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check for section headers
            if line.startswith('FINANCIAL HEALTH:'):
                current_section = 'financial_health'
                sections[current_section] = {}
            elif line.startswith('KEY INSIGHTS:'):
                current_section = 'key_insights'
                sections[current_section] = []
            elif line.startswith('RECOMMENDATIONS:'):
                current_section = 'recommendations'
                sections[current_section] = []
            elif line.startswith('SPENDING ANALYSIS:'):
                current_section = 'spending_analysis'
                sections[current_section] = {}
            elif line.startswith('NEXT MONTH PREDICTION:'):
                current_section = 'next_month_prediction'
                sections[current_section] = {}
            elif current_section:
                # Parse content based on section
                if current_section == 'financial_health':
                    if line.startswith('- Score:'):
                        sections[current_section]['score'] = line.replace(
                            '- Score:', '').strip()
                    elif line.startswith('- Status:'):
                        sections[current_section]['status'] = line.replace(
                            '- Status:', '').strip()
                    elif line.startswith('- Summary:'):
                        sections[current_section]['summary'] = line.replace(
                            '- Summary:', '').strip()
                elif current_section == 'key_insights':
                    if line.startswith(('1.', '2.', '3.')):
                        sections[current_section].append(line[2:].strip())
                elif current_section == 'recommendations':
                    if line.startswith(('1.', '2.')):
                        current_content = [line]
                    elif line.startswith(('   Description:', '   Impact:', '   Savings Potential:')):
                        current_content.append(line)
                        if line.startswith('   Savings Potential:'):
                            # End of recommendation, parse it
                            rec = self._parse_recommendation(current_content)
                            if rec:
                                sections[current_section].append(rec)
                elif current_section == 'spending_analysis':
                    if line.startswith('- Top Concern:'):
                        sections[current_section]['top_concern'] = line.replace(
                            '- Top Concern:', '').strip()
                    elif line.startswith('- Positive Trend:'):
                        sections[current_section]['positive_trend'] = line.replace(
                            '- Positive Trend:', '').strip()
                    elif line.startswith('- Optimization Area:'):
                        sections[current_section]['optimization_area'] = line.replace(
                            '- Optimization Area:', '').strip()
                elif current_section == 'next_month_prediction':
                    if line.startswith('- Estimated Spending:'):
                        sections[current_section]['estimated_spending'] = line.replace(
                            '- Estimated Spending:', '').strip()
                    elif line.startswith('- Confidence:'):
                        sections[current_section]['confidence'] = line.replace(
                            '- Confidence:', '').strip()
                    elif line.startswith('- Key Factors:'):
                        sections[current_section]['key_factors'] = line.replace(
                            '- Key Factors:', '').strip()

        return sections

    def _parse_recommendation(self, content_lines: List[str]) -> Optional[Dict[str, str]]:
        """Parse a single recommendation from content lines."""
        if not content_lines:
            return None

        rec = {}
        for line in content_lines:
            if line.startswith(('1.', '2.')):
                title_part = line.split('Title:', 1)
                if len(title_part) > 1:
                    rec['title'] = title_part[1].strip()
            elif 'Description:' in line:
                rec['description'] = line.split('Description:', 1)[1].strip()
            elif 'Impact:' in line:
                rec['impact'] = line.split('Impact:', 1)[1].strip()
            elif 'Savings Potential:' in line:
                rec['savings_potential'] = line.split(
                    'Savings Potential:', 1)[1].strip()

        return rec if rec else None

    def _generate_statistical_insights(self,
                                       expenses: List[Dict],
                                       budgets: List[Dict] = None,
                                       income: List[Dict] = None) -> Dict:
        """Generate comprehensive statistical insights."""
        if not expenses:
            return {}

        amounts = [exp.get('amount', 0) for exp in expenses]
        total_expenses = sum(amounts)

        # Category analysis
        category_totals = defaultdict(float)
        for expense in expenses:
            category_totals[expense.get(
                'category', 'Other')] += expense.get('amount', 0)

        # Time-based analysis
        monthly_spending = self._get_monthly_spending(expenses)

        return {
            "total_spent": total_expenses,
            "transaction_count": len(expenses),
            "average_transaction": statistics.mean(amounts) if amounts else 0,
            "median_transaction": statistics.median(amounts) if amounts else 0,
            "largest_expense": max(amounts) if amounts else 0,
            "smallest_expense": min(amounts) if amounts else 0,
            "spending_variance": statistics.variance(amounts) if len(amounts) > 1 else 0,
            "category_breakdown": dict(category_totals),
            "top_category": max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else None,
            "spending_consistency": self._calculate_consistency_score(amounts),
            "monthly_average": sum(monthly_spending.values()) / len(monthly_spending) if monthly_spending else total_expenses,
            "monthly_breakdown": monthly_spending
        }

    def _calculate_consistency_score(self, amounts: List[float]) -> float:
        """Calculate spending consistency score (0-100)."""
        if len(amounts) < 2:
            return 100.0

        mean_amount = statistics.mean(amounts)
        if mean_amount == 0:
            return 100.0

        std_dev = statistics.stdev(amounts)
        cv = std_dev / mean_amount  # Coefficient of variation

        # Convert to consistency score (lower CV = higher consistency)
        consistency_score = max(0, 100 - (cv * 50))  # Scale CV to 0-100
        return round(consistency_score, 1)

    def _get_monthly_spending(self, expenses: List[Dict]) -> Dict[str, float]:
        """Get spending by month."""
        monthly_spending = defaultdict(float)
        for expense in expenses:
            try:
                date_str = expense.get('date', '')
                if date_str:
                    expense_date = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00'))
                    month_key = expense_date.strftime('%Y-%m')
                    monthly_spending[month_key] += expense.get('amount', 0)
            except Exception:
                continue
        return dict(monthly_spending)

    # ==================== LEGACY METHODS (MAINTAINED FOR COMPATIBILITY) ====================

    def _generate_fallback_insights(self) -> Dict[str, Any]:
        """Generate basic insights when AI service is unavailable."""
        return {
            "financial_health": {
                "score": "75",
                "status": "Good",
                "summary": "Your financial data shows a generally positive trend with room for optimization."
            },
            "key_insights": [
                "Regular expense tracking is helping you maintain financial awareness",
                "Consider reviewing your largest expense categories for optimization opportunities",
                "Your income-to-expense ratio provides a foundation for financial growth"
            ],
            "recommendations": [
                {
                    "title": "Review Monthly Budgets",
                    "description": "Set up or review budgets for your top spending categories",
                    "impact": "Medium",
                    "savings_potential": "Varies by category"
                }
            ],
            "spending_analysis": {
                "top_concern": "Unable to analyze without AI service",
                "positive_trend": "Consistent expense tracking",
                "optimization_area": "Budget planning and category optimization"
            },
            "next_month_prediction": {
                "estimated_spending": "Based on historical average",
                "confidence": "Medium",
                "key_factors": "Historical patterns, Current trends, Budget adherence"
            },
            "note": "This is a fallback response. Enable AI service for detailed insights."
        }

    # ==================== ADDITIONAL UTILITY METHODS ====================

    async def get_financial_tips(self, category: str = None, amount_range: str = None) -> Dict[str, Any]:
        """Get general financial tips, optionally filtered by category or amount range."""
        if not self.openai_api_key:
            return self._get_fallback_tips(category, amount_range)

        try:
            prompt = f"""Provide 5 practical financial tips for {"general budgeting" if not category else f"{category} spending"}{"" if not amount_range else f" for someone with {amount_range} budget"}. 
            
            Format as JSON:
            {{
              "tips": [
                {{"title": "Tip Title", "description": "Detailed explanation", "difficulty": "Easy/Medium/Hard"}},
                ...
              ],
              "category": "{category or 'general'}",
              "focus_area": "Main focus of these tips"
            }}
            
            Make tips actionable and specific."""

            response = await asyncio.wait_for(
                self._call_openai_api(prompt),
                timeout=20
            )

            return {
                "success": True,
                "data": self._parse_ai_response(response),
                "source": "ai"
            }

        except Exception as e:
            logger.error(f"Error getting financial tips: {e}")
            return self._get_fallback_tips(category, amount_range)

    def _get_fallback_tips(self, category: str = None, amount_range: str = None) -> Dict[str, Any]:
        """Fallback tips when AI is not available."""
        general_tips = [
            {"title": "Track Every Expense",
                "description": "Record all expenses to understand spending patterns", "difficulty": "Easy"},
            {"title": "Create a Monthly Budget",
                "description": "Allocate specific amounts to different categories", "difficulty": "Medium"},
            {"title": "Build an Emergency Fund",
                "description": "Save 3-6 months of expenses for unexpected costs", "difficulty": "Hard"},
            {"title": "Review Subscriptions",
                "description": "Cancel unused subscriptions and services", "difficulty": "Easy"},
            {"title": "Use the 50/30/20 Rule",
                "description": "50% needs, 30% wants, 20% savings and debt repayment", "difficulty": "Medium"}
        ]

        return {
            "success": True,
            "data": {
                "tips": general_tips,
                "category": category or "general",
                "focus_area": "Basic financial management"
            },
            "source": "fallback"
        }

    async def analyze_spending_pattern(self, expenses: List[Dict], pattern_type: str = "weekly") -> Dict[str, Any]:
        """Analyze spending patterns by different time periods."""
        if not expenses:
            return {"error": "No expenses to analyze"}

        try:
            if pattern_type == "weekly":
                return self._analyze_weekly_pattern(expenses)
            elif pattern_type == "monthly":
                return self._analyze_monthly_pattern(expenses)
            elif pattern_type == "category":
                return self._analyze_category_pattern(expenses)
            else:
                return {"error": "Invalid pattern type"}
        except Exception as e:
            logger.error(f"Error analyzing spending pattern: {e}")
            return {"error": "Failed to analyze spending pattern"}

    def _analyze_weekly_pattern(self, expenses: List[Dict]) -> Dict[str, Any]:
        """Analyze weekly spending patterns."""
        weekly_totals = defaultdict(float)
        day_totals = defaultdict(float)

        for expense in expenses:
            try:
                date_str = expense.get('date', '')
                if date_str:
                    expense_date = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00'))
                    week_key = expense_date.strftime('%Y-W%U')
                    day_key = expense_date.strftime('%A')

                    weekly_totals[week_key] += expense.get('amount', 0)
                    day_totals[day_key] += expense.get('amount', 0)
            except Exception:
                continue

        # Find peak spending day
        peak_day = max(day_totals.items(),
                       key=lambda x: x[1]) if day_totals else ("Unknown", 0)

        return {
            "pattern_type": "weekly",
            "weekly_averages": dict(weekly_totals),
            "daily_totals": dict(day_totals),
            "peak_spending_day": {"day": peak_day[0], "amount": peak_day[1]},
            "total_weeks_analyzed": len(weekly_totals)
        }

    def _analyze_monthly_pattern(self, expenses: List[Dict]) -> Dict[str, Any]:
        """Analyze monthly spending patterns."""
        monthly_totals = self._get_monthly_spending(expenses)

        if len(monthly_totals) < 2:
            return {"error": "Need at least 2 months of data"}

        amounts = list(monthly_totals.values())
        avg_monthly = sum(amounts) / len(amounts)

        # Calculate trend
        if len(amounts) >= 3:
            recent_avg = sum(amounts[-3:]) / 3
            older_avg = sum(amounts[:-3]) / len(amounts[:-3]
                                                ) if len(amounts) > 3 else amounts[0]
            trend = "increasing" if recent_avg > older_avg * \
                1.1 else "decreasing" if recent_avg < older_avg * 0.9 else "stable"
        else:
            trend = "stable"

        return {
            "pattern_type": "monthly",
            "monthly_totals": monthly_totals,
            "average_monthly": avg_monthly,
            "trend": trend,
            "months_analyzed": len(monthly_totals),
            "highest_month": max(monthly_totals.items(), key=lambda x: x[1]),
            "lowest_month": min(monthly_totals.items(), key=lambda x: x[1])
        }

    def _analyze_category_pattern(self, expenses: List[Dict]) -> Dict[str, Any]:
        """Analyze spending patterns by category."""
        category_totals = defaultdict(float)
        category_counts = defaultdict(int)
        category_avg = defaultdict(float)

        for expense in expenses:
            category = expense.get('category', 'Other')
            amount = expense.get('amount', 0)

            category_totals[category] += amount
            category_counts[category] += 1

        # Calculate averages
        for category in category_totals:
            category_avg[category] = category_totals[category] / \
                category_counts[category]

        # Sort by total spending
        sorted_categories = sorted(
            category_totals.items(), key=lambda x: x[1], reverse=True)

        return {
            "pattern_type": "category",
            "category_totals": dict(category_totals),
            "category_averages": dict(category_avg),
            "category_counts": dict(category_counts),
            "top_categories": sorted_categories[:5],
            "total_categories": len(category_totals)
        }


# Global service instance
_ai_insights_service = None


def get_ai_insights_service() -> AIInsightsService:
    """Get or create the AI insights service instance."""
    global _ai_insights_service
    if _ai_insights_service is None:
        _ai_insights_service = AIInsightsService()
    return _ai_insights_service


# Legacy compatibility
ai_insights_service = get_ai_insights_service()
