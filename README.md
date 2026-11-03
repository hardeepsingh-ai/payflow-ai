# PayFlow AI — Smart Payment Intelligence for SMEs

> **Live Demo:** [payflow-ai.onrender.com](https://payflow-ai.onrender.com)
> **Hackathon:** [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/)

AI-powered payment intelligence dashboard that connects to PayPal, automatically categorizes transactions, predicts cash flow, and sends smart alerts — helping small businesses make better financial decisions.

**Built from a real problem:** A chiropractic clinic had their bank account frozen after Instagram auto-charged £600 in boost posts through PayPal without anyone noticing. PayFlow AI detects exactly these kinds of charges and warns you before it's too late.

## Features

- **PayPal Integration** — Connects to PayPal REST API to pull real transaction data (sandbox + production ready)
- **PayFlow Brain** — AI-powered financial assistant (Gemini AI) that answers any question about your money in plain English
- **AI Categorisation** — Automatically sorts every transaction into categories (Marketing, Software, Utilities, Payroll, etc.)
- **Smart Alerts** — Detects unusual charges like auto-recurring Instagram boost posts and warns you immediately
- **Cash Flow Forecast** — AI-generated 30-day balance prediction based on spending trends
- **PDF Reports** — Download financial reports (Transactions, Categories, Income vs Expenses, AI Insights, Brain Chat, Full Report) with date range filtering
- **Interactive Charts** — Spending by Category (doughnut) and Income vs Expenses (bar) with Chart.js
- **Chat Persistence** — Brain conversation history survives page refreshes via localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI |
| **PayPal** | REST API v1 (OAuth2, Sandbox) |
| **AI** | Google Gemini 3.5 Flash Lite (REST API) |
| **Frontend** | HTML, CSS, JavaScript |
| **Charts** | Chart.js |
| **PDF Generation** | jsPDF + autoTable |
| **Deployment** | Render (full-stack, single service) |

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/hardeepsingh-ai/payflow-ai.git
cd payflow-ai
```

### 2. Set up environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables
```bash
cp ../.env.example .env
# Edit .env with your PayPal sandbox credentials and Gemini API key
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Open the dashboard
Visit `http://localhost:8000` in your browser.

The app runs in **demo mode** by default with realistic sample data for Aberdeen Chiropractic Clinic. Set `USE_DEMO=false` in `.env` to connect to a real PayPal sandbox account.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | Full dashboard data with transactions, categories, and AI insights |
| `/api/transactions` | GET | Transaction list with AI categorisation |
| `/api/brain` | POST | Ask PayFlow Brain any financial question (`{"question": "..."}`) |
| `/api/health` | GET | Health check and mode status |

## Architecture

```
PayPal API ──→ FastAPI Backend ──→ Gemini AI (Brain)
                    │
                    ├── Transaction categorisation
                    ├── Smart alert detection
                    ├── Cash flow forecast
                    └── Static frontend serving
                              │
                              ├── Dashboard + Charts
                              ├── PayFlow Brain chat
                              └── PDF Report generator
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PAYPAL_CLIENT_ID` | PayPal sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal sandbox secret |
| `GEMINI_API_KEY` | Google Gemini API key (free tier) |
| `USE_DEMO` | `true` for demo data, `false` for real PayPal (default: `true`) |

## Built For

[PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/) — $69,750 in total prizes

## License

MIT
