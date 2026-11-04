# PayFlow AI — Smart Payment Intelligence for SMEs

> **Live Demo:** [payflow-ai.onrender.com](https://payflow-ai.onrender.com)
> **Hackathon:** [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/)

[![Live Demo](https://img.shields.io/badge/Live-Demo-00c853?style=for-the-badge)](https://payflow-ai.onrender.com)
[![Built for](https://img.shields.io/badge/PayPal-AI%20Hackathon%202026-003087?style=for-the-badge&logo=paypal)](https://paypalaihackathon.devpost.com/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com/)
[![AI](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

---

## What is PayFlow AI?

PayFlow AI turns your PayPal account into a **financial brain** for your business. It connects to the PayPal API, analyses every transaction with Google Gemini AI, and gives you smart alerts, natural language Q&A, and professional PDF reports — all in one dashboard.

**The problem it solves:** A chiropractic clinic had Instagram auto-charge £400–600 without anyone knowing. The bank froze their account thinking it was fraud. PayFlow AI is the smart dashboard that would have caught it instantly.

---

## Features

### PayFlow Brain (AI Financial Assistant)
Ask any question about your money in plain English. The Brain analyses your actual transaction data with step-by-step calculations and gives personalised answers — not generic ones.

- *"If I cancelled every recurring charge over £20, would I be profitable?"*
- *"What percentage of income goes to marketing?"*
- *"Rank my expenses by how essential they are to keeping the clinic open"*

### Agentic Actions
The Brain offers action buttons in context. Spot a suspicious charge? Click "Pause this recurring charge" or "Set up alert" right in the chat.

### Smart Alerts + Notification Bell
Automatically detects unusual patterns (auto-recurring Instagram boosts, high marketing ratios). All alerts stored in a notification bell with badge count, dropdown panel, and individual dismiss.

### Interactive Charts
- Spending by Category (doughnut) + Income vs Expenses (bar chart)
- Month-over-Month Comparison with percentage change indicators

### PDF Reports (6 types)
Transactions | Spending by Category | Income vs Expenses | AI Insights | Brain Chat History | Full Financial Report (branded cover page). All with date range filtering.

### Transaction Search & Filter
Search by name and filter by category across all transactions.

### More
- Dark/Light theme toggle with localStorage persistence
- Keyboard shortcuts (`/` to focus Brain, `Esc` to close modals)
- Export Brain chat as text file
- Welcome onboarding screen for first-time users
- Architecture diagram showing the full data flow
- Mobile responsive with hamburger menu

---

## Architecture

```
PayPal API  -->  FastAPI Backend  -->  Gemini AI  -->  Dashboard
(OAuth2)        (Smart alerts)       (Brain + AI)     (Charts, Reports, Alerts)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI |
| PayPal | REST API v1, OAuth2 |
| AI | Google Gemini 3.5 Flash Lite (REST) |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| PDF | jsPDF + autoTable |
| Deploy | Render (single service) |

---

## Quick Start

```bash
git clone https://github.com/hardeepsingh-ai/payflow-ai.git
cd payflow-ai
pip install -r requirements.txt

# Set environment variables (see .env.example)
cd backend
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000`. Click **Demo Mode** to try without PayPal credentials.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PAYPAL_CLIENT_ID` | PayPal sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal sandbox secret |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## Deployment

Single service on Render — FastAPI serves both the API and static frontend.

- **Build:** `pip install -r requirements.txt`
- **Start:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## Author

**Hardeep Singh** — MSc Marketing (Distinction), University of Aberdeen

Built solo for the PayPal AI Hackathon 2026.

---

## License

MIT
