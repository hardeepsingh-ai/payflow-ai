import os
import anthropic
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
        transactions = _get_transactions()
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
        transactions = _get_transactions()
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

    # Smart alerts -detect real problems like unexpected recurring charges
    alerts = []
    boost_txns = [t for t in transactions if "boost post" in t["name"].lower()]
    boost_total = sum(abs(t["amount"]) for t in boost_txns)
    if boost_txns:
        alerts.append(f"WARNING: {len(boost_txns)} Instagram Boost Posts detected totalling £{boost_total:,.2f} -these may be auto-charged. Review immediately!")
    marketing_spend = sum(abs(t["amount"]) for t in transactions if t.get("ai_category") == "Marketing & Advertising")
    if marketing_spend > 0:
        pct = round(marketing_spend / total_expenses * 100) if total_expenses else 0
        alerts.append(f"Marketing & Advertising is {pct}% of total expenses (£{marketing_spend:,.2f})")
    sub_spend = sum(abs(t["amount"]) for t in transactions if t.get("ai_category") == "Software & SaaS")
    if sub_spend > 100:
        alerts.append(f"Software subscriptions total £{sub_spend:,.2f} this month -check for unused tools")

    if os.getenv("ANTHROPIC_API_KEY") and not USE_DEMO:
        insights = await generate_insights(transactions, balance)
    else:
        insights = {
            "summary": f"Your business processed £{total_income:,.2f} in income and £{total_expenses:,.2f} in expenses over the last 30 days. Net cash flow is £{net_flow:,.2f}.",
            "alerts": alerts,
            "forecast": f"Based on current trends, projected balance in 30 days: £{balance + net_flow:,.2f}",
            "top_saving": "Review Instagram Boost Posts -auto-charges can accumulate without you noticing" if boost_txns else "Consider consolidating SaaS subscriptions to reduce monthly costs",
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


_cached_transactions = None


def _get_transactions():
    global _cached_transactions
    if _cached_transactions is None:
        _cached_transactions = generate_demo_transactions(30)
    return _cached_transactions


@app.post("/api/brain")
async def ask_brain(query: BrainQuery):
    txns = _get_transactions()
    total_income = sum(t["amount"] for t in txns if t["amount"] > 0)
    total_expenses = sum(abs(t["amount"]) for t in txns if t["amount"] < 0)
    categories = {}
    for t in txns:
        cat = t.get("ai_category", "Other")
        categories[cat] = round(categories.get(cat, 0) + abs(t["amount"]), 2)

    top5 = sorted(txns, key=lambda t: abs(t["amount"]), reverse=True)[:10]
    top5_str = "; ".join(f"{t['name']} £{t['amount']:+.2f} ({t.get('ai_category','Other')})" for t in top5)
    auto_charges = [t for t in txns if "boost" in t["name"].lower() or "auto" in t["name"].lower()]
    auto_str = "; ".join(f"{t['name']} £{t['amount']:.2f}" for t in auto_charges) if auto_charges else "None"
    recurring = [t for t in txns if abs(t["amount"]) > 20 and t["amount"] < 0]
    recurring_str = "; ".join(f"{t['name']} £{t['amount']:.2f} ({t.get('ai_category','Other')})" for t in recurring)

    context = (
        f"Financial summary: Income £{total_income:,.2f}, Expenses £{total_expenses:,.2f}, "
        f"Net £{total_income - total_expenses:,.2f}. "
        f"Categories: {categories}. "
        f"Top 10 transactions by size: {top5_str}. "
        f"Auto/recurring charges flagged: {auto_str}. "
        f"All recurring charges over £20: {recurring_str}. "
        f"Total transactions: {len(txns)}."
    )

    system_prompt = (
        "You are PayFlow Brain, an AI financial assistant for Aberdeen Chiropractic Clinic's PayPal account. "
        "You MUST follow these rules in every response:\n"
        "1) Start with a brief greeting identifying yourself.\n"
        "2) ALWAYS show detailed step-by-step calculations with numbered steps.\n"
        "3) For hypothetical/scenario questions: group similar transactions (e.g. '6 Instagram Boost Posts totalling £X'), "
        "show the key totals, then give a clear YES/NO verdict with the final figure.\n"
        "4) Use £ for all currency values.\n"
        "5) If a question has multiple conditions, create a separate numbered section for each.\n"
        "6) End with a concrete, actionable recommendation.\n"
        "7) Flag any unexpected auto-charges like Instagram Boost Posts.\n"
        "8) Keep your response focused and complete — group similar transactions together instead of listing every single one individually.\n"
        "9) CRITICAL: Always finish your response with a final verdict and recommendation. Never leave a response incomplete.\n"
        "10) Keep tables concise — maximum 8 rows. Summarise smaller items into an 'Other' row rather than listing every transaction.\n"
        "11) Your ENTIRE response must fit within 600 words. Be concise but complete."
    )

    groq_key = os.getenv("GROQ_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            chat = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context: {context}\n\nQuestion: {query.question}"}
                ],
                max_tokens=4096,
                temperature=0.7,
            )
            return {"answer": chat.choices[0].message.content}
        except Exception as e:
            print(f"Brain Groq error: {e}")
            return {"answer": "I'm having trouble connecting to the AI engine right now. Please try again in a moment."}
    elif anthropic_key:
        try:
            client = anthropic.Anthropic(api_key=anthropic_key)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Context: {context}\n\nQuestion: {query.question}"
                }],
            )
            return {"answer": message.content[0].text}
        except Exception as e:
            print(f"Brain Anthropic error: {e}")
            return {"answer": "I'm having trouble connecting to the AI engine right now. Please try again in a moment."}
    else:
        return {"answer": "PayFlow Brain requires an AI engine. Please configure the API key to enable intelligent financial analysis."}


@app.get("/api/health")
async def health():
    return {"status": "ok", "demo_mode": USE_DEMO}


frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
