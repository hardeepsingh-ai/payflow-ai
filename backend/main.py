import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from paypal_client import PayPalClient
from ai_analyzer import categorize_transactions, generate_insights
from demo_data import generate_demo_transactions, get_demo_balance

app = FastAPI(title="PayFlow AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

paypal = PayPalClient()

USE_DEMO = not os.getenv("PAYPAL_CLIENT_ID") or os.getenv("USE_DEMO", "true").lower() == "true"


@app.get("/api/transactions")
async def get_transactions():
    if USE_DEMO:
        transactions = generate_demo_transactions(30)
    else:
        raw = await paypal.get_transactions()
        transactions = []
        for td in raw.get("transaction_details", []):
            info = td.get("transaction_info", {})
            payer = td.get("payer_info", {})
            amount_val = float(info.get("transaction_amount", {}).get("value", 0))
            transactions.append({
                "id": info.get("transaction_id", ""),
                "name": payer.get("payer_name", {}).get("alternate_full_name", "Unknown"),
                "amount": amount_val,
                "currency": info.get("transaction_amount", {}).get("currency_code", "USD"),
                "type": "income" if amount_val > 0 else "expense",
                "date": info.get("transaction_initiation_date", ""),
                "status": info.get("transaction_status", ""),
            })
        if os.getenv("ANTHROPIC_API_KEY"):
            transactions = await categorize_transactions(transactions)
    return {"transactions": transactions, "total": len(transactions)}


@app.get("/api/dashboard")
async def get_dashboard():
    if USE_DEMO:
        transactions = generate_demo_transactions(30)
        balance = get_demo_balance()
    else:
        raw = await paypal.get_transactions()
        transactions = []
        for td in raw.get("transaction_details", []):
            info = td.get("transaction_info", {})
            amount_val = float(info.get("transaction_amount", {}).get("value", 0))
            transactions.append({
                "id": info.get("transaction_id", ""),
                "name": info.get("transaction_subject", "Unknown"),
                "amount": amount_val,
                "currency": info.get("transaction_amount", {}).get("currency_code", "USD"),
                "type": "income" if amount_val > 0 else "expense",
                "date": info.get("transaction_initiation_date", ""),
                "ai_category": "Other",
            })
        balances = await paypal.get_balances()
        balance = float(balances.get("balances", [{}])[0].get("value", 0)) if balances.get("balances") else 0

    total_income = sum(t["amount"] for t in transactions if t["amount"] > 0)
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
    net_flow = total_income - total_expenses

    categories = {}
    for t in transactions:
        cat = t.get("ai_category", "Other")
        categories[cat] = round(categories.get(cat, 0) + abs(t["amount"]), 2)

    # Smart alerts — detect real problems like unexpected recurring charges
    alerts = []
    boost_txns = [t for t in transactions if "boost post" in t["name"].lower()]
    boost_total = sum(abs(t["amount"]) for t in boost_txns)
    if boost_txns:
        alerts.append(f"WARNING: {len(boost_txns)} Instagram Boost Posts detected totalling £{boost_total:,.2f} — these may be auto-charged. Review immediately!")
    marketing_spend = sum(abs(t["amount"]) for t in transactions if t.get("ai_category") == "Marketing & Advertising")
    if marketing_spend > 0:
        pct = round(marketing_spend / total_expenses * 100) if total_expenses else 0
        alerts.append(f"Marketing & Advertising is {pct}% of total expenses (£{marketing_spend:,.2f})")
    sub_spend = sum(abs(t["amount"]) for t in transactions if t.get("ai_category") == "Software & SaaS")
    if sub_spend > 100:
        alerts.append(f"Software subscriptions total £{sub_spend:,.2f} this month — check for unused tools")

    if os.getenv("ANTHROPIC_API_KEY") and not USE_DEMO:
        insights = await generate_insights(transactions, balance)
    else:
        insights = {
            "summary": f"Your business processed £{total_income:,.2f} in income and £{total_expenses:,.2f} in expenses over the last 30 days. Net cash flow is £{net_flow:,.2f}.",
            "alerts": alerts,
            "forecast": f"Based on current trends, projected balance in 30 days: £{balance + net_flow:,.2f}",
            "top_saving": "Review Instagram Boost Posts — auto-charges can accumulate without you noticing" if boost_txns else "Consider consolidating SaaS subscriptions to reduce monthly costs",
        }

    return {
        "balance": round(balance, 2),
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_flow": round(net_flow, 2),
        "transaction_count": len(transactions),
        "transactions": transactions,
        "categories": categories,
        "insights": insights,
    }


class BrainQuery(BaseModel):
    question: str


_last_transactions = []


@app.post("/api/brain")
async def ask_brain(query: BrainQuery):
    txns = _last_transactions or generate_demo_transactions(30)
    total_income = sum(t["amount"] for t in txns if t["amount"] > 0)
    total_expenses = sum(abs(t["amount"]) for t in txns if t["amount"] < 0)
    categories = {}
    for t in txns:
        cat = t.get("ai_category", "Other")
        categories[cat] = round(categories.get(cat, 0) + abs(t["amount"]), 2)

    context = (
        f"Financial data: Income £{total_income:,.2f}, Expenses £{total_expenses:,.2f}, "
        f"Net £{total_income - total_expenses:,.2f}. "
        f"Categories: {categories}. "
        f"Recent transactions: {[{'name': t['name'], 'amount': t['amount'], 'category': t.get('ai_category', 'Other')} for t in txns[:15]]}"
    )

    if os.getenv("ANTHROPIC_API_KEY"):
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system="You are PayFlow Brain, an AI financial assistant. Answer questions about the business's PayPal transactions concisely. Use £ for currency.",
            messages=[{"role": "user", "content": f"Context: {context}\n\nQuestion: {query.question}"}],
        )
        answer = msg.content[0].text
    else:
        q = query.question.lower()
        if "boost" in q or "instagram" in q:
            boost_txns = [t for t in txns if "boost post" in t["name"].lower()]
            boost_total = sum(abs(t["amount"]) for t in boost_txns)
            answer = f"I found {len(boost_txns)} Instagram Boost Post charges totalling £{boost_total:,.2f}. These appear to be auto-charged from a connected Instagram account. I'd recommend disconnecting PayPal from Instagram's boost feature to prevent further unexpected charges."
        elif "spend" in q or "expense" in q:
            top = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
            answer = f"Your top spending categories are: {', '.join(f'{c}: £{v:,.2f}' for c, v in top)}. Total expenses this month: £{total_expenses:,.2f}."
        elif "income" in q or "revenue" in q or "earn" in q:
            answer = f"Total income this month: £{total_income:,.2f}. Net cash flow: £{total_income - total_expenses:,.2f}."
        elif "marketing" in q or "ads" in q:
            m = categories.get("Marketing & Advertising", 0)
            answer = f"Marketing & Advertising spend: £{m:,.2f}. This includes Meta Ads, Google Ads, and Instagram Boost Posts. Check if all boost posts are intentional."
        else:
            answer = f"Your business has £{total_income:,.2f} income and £{total_expenses:,.2f} expenses this month (net: £{total_income - total_expenses:,.2f}). Ask me about specific categories, spending patterns, or alerts."

    return {"answer": answer}


@app.get("/api/health")
async def health():
    return {"status": "ok", "demo_mode": USE_DEMO}


frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
