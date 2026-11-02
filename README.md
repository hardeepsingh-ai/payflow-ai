# PayFlow AI - Smart Payment Intelligence for SMEs

AI-powered payment intelligence dashboard that connects to PayPal, automatically categorizes transactions, predicts cash flow, and sends smart alerts - helping small businesses make better financial decisions.

## Features

- **PayPal Integration** - Connects to PayPal API to pull real transaction data
- **AI-Powered Categorization** - Uses Claude AI to automatically categorize every transaction
- **Cash Flow Insights** - AI-generated financial health summary, alerts, and 30-day forecast
- **Interactive Dashboard** - Visual charts for spending breakdown and income vs expenses
- **Smart Alerts** - Automated warnings about unusual spending patterns

## Tech Stack

- **Backend:** Python (FastAPI)
- **PayPal:** REST API v1 (Sandbox)
- **AI:** Anthropic Claude API
- **Frontend:** HTML/CSS/JavaScript + Chart.js
- **Deployment:** Render (backend) + Netlify (frontend)

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
# Edit .env with your PayPal sandbox credentials and Anthropic API key
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Open the dashboard
Visit `http://localhost:8000` in your browser.

The app runs in demo mode by default with realistic sample data. Set `USE_DEMO=false` in `.env` to use real PayPal sandbox data.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Full dashboard data with transactions, categories, and AI insights |
| `GET /api/transactions` | Transaction list with AI categorization |
| `GET /api/health` | Health check and mode status |

## Built For

PayPal AI Hackathon 2026 - [devpost.com](https://paypalaihackathon.devpost.com/)

## License

MIT
