"""Email service for sending password reset and other emails."""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        # Email configuration from environment variables
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "Budgetly")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        # Check if SSL should be used instead of TLS
        self.use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

        # Check if email is configured
        self.is_configured = bool(self.smtp_username and self.smtp_password)

        if not self.is_configured:
            logger.warning(
                "Email service not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.")

    def _create_smtp_connection(self):
        """Create and return SMTP connection."""
        context = ssl.create_default_context()

        if self.use_ssl:
            # Use SMTP_SSL for port 465
            server = smtplib.SMTP_SSL(
                self.smtp_server, self.smtp_port, context=context)
        else:
            # Use SMTP with STARTTLS for port 587
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls(context=context)

        server.login(self.smtp_username, self.smtp_password)
        return server

    def _create_password_reset_html(self, user_name: str, reset_token: str) -> str:
        """Create HTML content for password reset email."""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Budgetly</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8fafc;
                }}
                .container {{
                    background-color: white;
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                }}
                .title {{
                    color: #1f2937;
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0;
                }}
                .subtitle {{
                    color: #6b7280;
                    font-size: 16px;
                    margin: 8px 0 0 0;
                }}
                .content {{
                    margin: 30px 0;
                }}
                .greeting {{
                    font-size: 16px;
                    margin-bottom: 20px;
                }}
                .message {{
                    color: #4b5563;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }}
                .button-container {{
                    text-align: center;
                    margin: 30px 0;
                }}
                .reset-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.2s;
                }}
                .reset-button:hover {{
                    background: linear-gradient(135deg, #1d4ed8, #1e40af);
                    transform: translateY(-1px);
                }}
                .alternative-link {{
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #f3f4f6;
                    border-radius: 6px;
                    font-size: 14px;
                    color: #6b7280;
                }}
                .alternative-link a {{
                    color: #3b82f6;
                    word-break: break-all;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }}
                .security-note {{
                    background-color: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 20px 0;
                    font-size: 14px;
                    color: #92400e;
                }}
                .expiry-note {{
                    font-size: 14px;
                    color: #ef4444;
                    font-weight: 500;
                    margin-top: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">💰</div>
                    <h1 class="title">Reset Your Password</h1>
                    <p class="subtitle">Budgetly - AI-Powered Financial Management</p>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Hello {user_name or "there"},
                    </div>
                    
                    <div class="message">
                        We received a request to reset your password for your Budgetly account. 
                        If you made this request, click the button below to create a new password.
                    </div>
                    
                    <div class="button-container">
                        <a href="{reset_url}" class="reset-button">Reset My Password</a>
                    </div>
                    
                    <div class="expiry-note">
                        ⏰ This link will expire in 1 hour for security reasons.
                    </div>
                    
                    <div class="alternative-link">
                        <strong>Button not working?</strong> Copy and paste this link into your browser:<br>
                        <a href="{reset_url}">{reset_url}</a>
                    </div>
                    
                    <div class="security-note">
                        <strong>🔒 Security Notice:</strong> If you didn't request this password reset, 
                        please ignore this email. Your account remains secure and no changes have been made.
                    </div>
                </div>
                
                <div class="footer">
                    <p>
                        This email was sent by Budgetly<br>
                        If you have any questions, please contact our support team.
                    </p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        © 2025 Budgetly. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    def _create_password_reset_text(self, user_name: str, reset_token: str) -> str:
        """Create plain text content for password reset email."""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        text_content = f"""
Hello {user_name or "there"},

We received a request to reset your password for your Budgetly account.

If you made this request, click the link below to create a new password:
{reset_url}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. 
Your account remains secure and no changes have been made.

Best regards,
The Budgetly Team

---
© 2025 Budgetly. All rights reserved.
        """
        return text_content.strip()

    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = "") -> bool:
        """Send password reset email to user."""
        if not self.is_configured:
            logger.error(
                "Email service not configured. Cannot send password reset email.")
            # In development, log the reset URL
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            print(f"\n🔗 Password Reset Link for {to_email}:")
            print(f"   {reset_url}")
            print(f"   (This link expires in 1 hour)\n")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Reset Your Budgetly Password"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Create text and HTML versions
            text_content = self._create_password_reset_text(
                user_name, reset_token)
            html_content = self._create_password_reset_html(
                user_name, reset_token)

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(
                f"Password reset email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send password reset email to {to_email}: {str(e)}")
            # Fallback: log the reset URL for development
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            print(
                f"\n❌ Email sending failed, but here's the reset link for {to_email}:")
            print(f"   {reset_url}")
            print(f"   (This link expires in 1 hour)\n")
            return False

    async def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """Send welcome email to new user."""
        if not self.is_configured:
            logger.warning(
                "Email service not configured. Cannot send welcome email.")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Welcome to Budgetly!"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Simple welcome message
            text_content = f"""
Hello {user_name},

Welcome to Budgetly! Your account has been created successfully.

You can now start managing your finances with our AI-powered platform.

Best regards,
The Budgetly Team
            """

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3b82f6;">Welcome to Budgetly!</h2>
                    <p>Hello {user_name},</p>
                    <p>Welcome to Budgetly! Your account has been created successfully.</p>
                    <p>You can now start managing your finances with our AI-powered platform.</p>
                    <p>Best regards,<br>The Budgetly Team</p>
                </div>
            </body>
            </html>
            """

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(f"Welcome email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send welcome email to {to_email}: {str(e)}")
            return False


# Create global instance
email_service = EmailService()
