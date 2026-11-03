# PayFlow AI — Devpost Project Story

## Inspiration

I worked as a social media manager for a chiropractic clinic, and one of the doctors connected their PayPal to Instagram without realising what would happen. Instagram started auto-charging for boosted posts — £400 to £600 went out without anyone knowing. The clinic owner thought the money was being spent on Meta Ads by me, but it was actually random Instagram boost posts running on autopilot. The charges hit so fast that the bank thought it was fraud and froze the entire business account.

That moment made me think — if there had been a smart dashboard that flagged unusual PayPal charges instantly, this whole mess could have been avoided. That's why I built PayFlow AI.

## What it does

PayFlow AI is an AI-powered payment intelligence dashboard that turns your PayPal account into a financial brain for your business:

- **PayFlow Brain** — An AI financial assistant powered by Gemini AI. Ask any question about your money in plain English — "What percentage of my income goes to marketing?", "Should I cancel my Cliniko subscription?", "If I cut the Instagram charges, would I break even?" — and it analyses your actual transaction data to give a real answer, not a generic one.
- **Smart Alerts** — Automatically detects unusual charges like auto-recurring Instagram boost posts, high marketing spend ratios, and excessive software subscriptions. The exact kind of alert that would have prevented the clinic's bank account from being frozen.
- **AI Categorisation** — Every transaction is automatically sorted into meaningful categories (Marketing & Advertising, Staff & Payroll, Rent & Utilities, Clinic Supplies, Software & Subscriptions, Revenue sources).
- **Cash Flow Forecast** — Predicts your 30-day balance based on current spending trends.
- **PDF Reports** — Download professional financial reports with date range filtering (last 30 days, 2 months, 3 months, 6 months, year, or custom range). Six report types: Transactions, Spending by Category, Income vs Expenses, AI Insights, Brain Chat History, and a Full Financial Report with branded cover page.
- **Interactive Charts** — Spending by Category (doughnut) and Income vs Expenses (bar chart) powered by Chart.js.

## How I built it

- **Backend:** Python with FastAPI, serving both the API and frontend as a single deployment on Render
- **PayPal Integration:** PayPal REST API v1 with OAuth2 authentication (sandbox mode for demo, production-ready)
- **AI Engine:** Google Gemini 3.5 Flash Lite via REST API for the PayFlow Brain — answers any financial question by analysing real transaction context
- **Frontend:** HTML, CSS, JavaScript with Chart.js for charts and jsPDF for PDF report generation
- **Smart Detection:** Custom alert system that catches patterns like auto-charged social media boost posts, high marketing spend ratios, and unusual recurring charges
- **Deployment:** Render (single service — backend serves the static frontend)

## Challenges I ran into

The biggest challenge was making the AI Brain genuinely useful rather than just a gimmick. Early versions used keyword matching — ask about "expenses" and you'd get expenses, but ask "should I cancel my subscription given my current revenue?" and it would give a generic fallback. The breakthrough was integrating Gemini AI with full transaction context, so the Brain actually reasons about your specific financial data. Now it calculates, compares categories, flags issues, and gives personalised financial advice — not pre-written answers.

Getting the deployment right on Render was also tricky. The build and start commands needed careful configuration to serve both the Python backend and static frontend from a single service, and the Gemini API integration went through several iterations (SDK → REST API, multiple model versions) before landing on a stable, free-tier solution.

## Accomplishments that I'm proud of

The PayFlow Brain is the feature I'm most proud of. It's not just a chatbot — it's a financial assistant that understands YOUR business. I tested it with tricky questions like "What percentage of my income would I save if I cancelled all the auto-charged Instagram and Facebook boosts, and would that be enough to turn my cash flow positive?" — and it calculated the exact savings, compared it to the deficit, and concluded "No, you'd still be short by £147.78." That's the kind of analysis that used to require a bookkeeper.

The PDF Report system is another highlight — you can export a complete branded financial report with cover page, category breakdowns, income analysis, and all transactions, filtered by any date range.

## What I learned

Data tracking is everything. Just like tracking your weights at the gym to measure progress, businesses need to track every transaction to understand where their money goes. PayPal shows you a list of transactions, but it doesn't tell you what to DO about them. The difference between seeing data and understanding data is what PayFlow AI bridges.

I also learned that the most impactful AI features aren't the flashiest ones — they're the ones that answer real questions. A doughnut chart looks nice, but the Brain answering "should I cancel this subscription?" based on actual numbers is what saves a business owner time and money.

## What's next for PayFlow AI

My vision is to turn PayFlow AI into a full agentic financial assistant. Not just answering questions, but proactively acting on your behalf:

- **Proactive alerts** — The Brain monitors transactions 24/7 and sends you warnings via email or SMS before problems escalate
- **Multi-account support** — Connect multiple PayPal accounts, bank accounts, and payment processors into one unified view
- **Automated actions** — The AI agent can pause suspicious recurring charges, generate and send invoices, and reconcile payments automatically
- **Team access** — Let your accountant, business partner, or bookkeeper access the Brain with their own permissions
- **Industry benchmarks** — Compare your spending patterns against similar businesses in your industry

The goal is a financial brain that works as a dedicated team member — someone who has all the knowledge of your company's monetary history, proactively prevents problems, and saves the founder hours every week. Like having a CFO on your team who never sleeps.

## Built With

- python
- fastapi
- paypal-api
- google-gemini
- javascript
- html-css
- chart-js
- jspdf
- render
