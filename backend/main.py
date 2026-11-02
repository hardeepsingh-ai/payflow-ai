import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

    if os.getenv("ANTHROPIC_API_KEY") and not USE_DEMO:
        insights = await generate_insights(transactions, balance)
    else:
        insights = {
            "summary": f"Your business processed ${total_income:,.2f} in income and ${total_expenses:,.2f} in expenses over the last 30 days. Net cash flow is ${net_flow:,.2f}.",
            "alerts": [
                "Marketing spend is 28% of total expenses - review ad ROI",
                "3 invoices over $1,000 received this month",
                "Software subscriptions total $290/month - check for unused tools",
            ],
            "forecast": f"Based on current trends, projected balance in 30 days: ${balance + net_flow:,.2f}",
            "top_saving": "Consider consolidating SaaS subscriptions to save ~$50/month",
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "demo_mode": USE_DEMO}


frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
