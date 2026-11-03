# PayFlow AI — Devpost Project Story

## Inspiration

I worked as a social media manager for a chiropractic clinic, and one of the doctors connected their PayPal to Instagram without realising what would happen. Instagram started auto-charging for boosted posts — £400 to £600 went out without anyone knowing. The clinic owner thought the money was being spent on Meta Ads by me, but it was actually random Instagram boost posts running on autopilot. The charges hit so fast that the bank thought it was fraud and froze the entire business account.

That moment made me think — if there had been a smart dashboard that flagged unusual PayPal charges instantly, this whole mess could have been avoided. That's why I built PayFlow AI.

## What it does

PayFlow AI is an AI-powered payment intelligence dashboard that connects to your PayPal account and gives you a complete picture of your finances:

- **Smart Alerts** — Detects unusual charges like auto-recurring Instagram boost posts and warns you immediately
- **AI Categorisation** — Automatically sorts every transaction into categories (Marketing, Software, Utilities, Payroll, etc.)
- **Cash Flow Analysis** — Shows income vs expenses over time with interactive charts
- **PayFlow Brain** — An AI chat where you can ask questions about your money in plain English ("What are the Instagram charges?", "Where am I spending the most?")
- **30-Day Forecast** — Predicts your balance based on current spending trends

## How I built it

- **Backend:** Python with FastAPI, serving both the API and frontend
- **PayPal Integration:** PayPal REST API v1 with OAuth2 authentication (sandbox mode)
- **AI Engine:** Anthropic Claude API for transaction categorisation and financial insights
- **Frontend:** HTML, CSS, JavaScript with Chart.js for interactive doughnut and bar charts
- **Smart Detection:** Custom alert system that specifically catches patterns like auto-charged boost posts

The whole app runs as a single deployment — the FastAPI backend serves the frontend as static files, so there's one URL for everything.

## Challenges I ran into

The hardest part wasn't the code — I've built dashboards and automation systems before. The real challenge was finding a genuine problem worth solving. I needed something that connected my real-world experience to what PayPal's API could do. Once I connected the clinic's PayPal disaster to the idea of smart transaction alerts, everything clicked into place.

## Accomplishments that I'm proud of

The PayFlow Brain feature — it's not just a dashboard that shows numbers, it's a brain that understands your business. You can ask it questions like "What are the Instagram boost charges?" and it finds them, tells you the total, and recommends disconnecting PayPal from Instagram's boost feature. That's the kind of insight that would have saved the clinic from having their bank account frozen.

## What I learned

Data tracking is everything. Just like tracking your weights at the gym to measure progress, businesses need to track every transaction to understand where their money goes. PayPal shows you a list of transactions, but it doesn't tell you what to do about them. The difference between seeing data and understanding data is what PayFlow AI bridges.

## What's next for PayFlow AI

My vision is to turn PayFlow AI into a full company-specific financial brain. Not just AI, but a brain that's customised for each business — it knows everything about the company's finances, proactively alerts the owner when something goes wrong, and answers any payment question without needing to dig through old statements. Like having a dedicated financial person on your team who has all the knowledge of your company's monetary history, working 24/7. The brain should work as a person in the company who saves the founder time and prevents problems before they happen.

## Built With

- python
- fastapi
- paypal-api
- anthropic-claude
- javascript
- html-css
- chart-js
