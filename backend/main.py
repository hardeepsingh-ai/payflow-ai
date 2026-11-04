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

    system_prompt = "You are PayFlow Brain, an AI financial assistant for Aberdeen Chiropractic Clinic's PayPal account. Answer questions about the business's transactions concisely and helpfully. Use £ for currency. If you spot issues like unexpected auto-charges, flag them."

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{system_prompt}\n\nContext: {context}\n\nQuestion: {query.question}"}]}],
                "generationConfig": {"maxOutputTokens": 400, "temperature": 0.7}
            }
            resp = httpx.post(url, json=payload, timeout=15)
            data = resp.json()
            answer = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"answer": answer}
        except Exception:
            pass
    else:
        pass
    if os.getenv("ANTHROPIC_API_KEY"):
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Context: {context}\n\nQuestion: {query.question}"}],
        )
        answer = msg.content[0].text
    else:
        q = query.question.lower()
        top_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        expense_cats = {k: v for k, v in top_cats if not k.startswith("Revenue")}
        income_cats = {k: v for k, v in top_cats if k.startswith("Revenue")}
        boost_txns = [t for t in txns if "boost post" in t["name"].lower()]
        boost_total = sum(abs(t["amount"]) for t in boost_txns)
        highest = sorted(txns, key=lambda t: abs(t["amount"]), reverse=True)[:5]
        recent = txns[:5]

        if "boost" in q or "instagram" in q:
            answer = f"I found {len(boost_txns)} Instagram Boost Post charges totalling £{boost_total:,.2f}. These appear to be auto-charged from a connected Instagram account. I'd recommend disconnecting PayPal from Instagram's boost feature to prevent further unexpected charges."
        elif "highest" in q or "biggest" in q or "largest" in q or "top" in q:
            lines = [f"  • {t['name']}: £{abs(t['amount']):,.2f}" for t in highest]
            answer = f"Your highest transactions:\n" + "\n".join(lines)
        elif "recent" in q or "latest" in q or "last" in q:
            lines = [f"  • {t['name']}: £{t['amount']:+,.2f} ({t.get('ai_category', 'Other')})" for t in recent]
            answer = f"Most recent transactions:\n" + "\n".join(lines)
        elif "spend" in q or "expense" in q or "cost" in q or "paid" in q or "paying" in q:
            top3 = list(expense_cats.items())[:3]
            answer = f"Your top spending categories: {', '.join(f'{c}: £{v:,.2f}' for c, v in top3)}. Total expenses: £{total_expenses:,.2f}."
        elif "income" in q or "revenue" in q or "earn" in q or "payment" in q or "money coming" in q:
            lines = [f"  • {c}: £{v:,.2f}" for c, v in income_cats.items()]
            answer = f"Total income: £{total_income:,.2f}. Breakdown:\n" + "\n".join(lines) if lines else f"Total income: £{total_income:,.2f}."
        elif "marketing" in q or "ads" in q or "meta" in q or "facebook" in q:
            m = categories.get("Marketing & Advertising", 0)
            pct = (m / total_expenses * 100) if total_expenses else 0
            answer = f"Marketing & Advertising: £{m:,.2f} ({pct:.0f}% of expenses). This includes {len(boost_txns)} auto-charged Instagram Boost Posts (£{boost_total:,.2f}). Review these -they may be unauthorised."
        elif "rent" in q or "utilit" in q or "bill" in q:
            r = categories.get("Rent & Utilities", 0)
            answer = f"Rent & Utilities: £{r:,.2f}. This covers clinic rent, electricity, and business insurance."
        elif "staff" in q or "payroll" in q or "employee" in q or "receptionist" in q:
            s = categories.get("Staff & Payroll", 0)
            answer = f"Staff & Payroll: £{s:,.2f}. This covers receptionist pay and cleaning services."
        elif "suppli" in q or "inventory" in q:
            c = categories.get("Clinic Supplies", 0)
            answer = f"Clinic Supplies: £{c:,.2f}. Includes treatment table covers, massage oils, resistance bands, and KT tape."
        elif "software" in q or "subscription" in q or "cliniko" in q:
            sw = categories.get("Software & Subscriptions", 0)
            answer = f"Software & Subscriptions: £{sw:,.2f}. Includes Cliniko (practice management), online booking system, and Canva Pro."
        elif "save" in q or "saving" in q or "cut" in q or "reduce" in q:
            answer = f"Top saving opportunities: 1) Review {len(boost_txns)} Instagram auto-charges (£{boost_total:,.2f}) -these may be unauthorised. 2) Compare clinic supply vendors for better rates. 3) Your marketing is {categories.get('Marketing & Advertising', 0) / total_expenses * 100:.0f}% of spend -audit ROI per channel."
        elif "profit" in q or "net" in q or "cash flow" in q or "balance" in q:
            net = total_income - total_expenses
            status = "positive" if net >= 0 else "negative"
            answer = f"Net cash flow: £{net:,.2f} ({status}). Income: £{total_income:,.2f}, Expenses: £{total_expenses:,.2f}. {'Your expenses exceed income -review discretionary spending.' if net < 0 else 'Healthy position -consider setting aside reserves.'}"
        elif "categor" in q or "breakdown" in q or "summary" in q or "overview" in q:
            lines = [f"  • {c}: £{v:,.2f}" for c, v in top_cats]
            answer = f"Full category breakdown:\n" + "\n".join(lines)
        elif "alert" in q or "warning" in q or "problem" in q or "issue" in q or "wrong" in q:
            alerts = []
            if boost_total > 0:
                alerts.append(f"{len(boost_txns)} Instagram auto-charges totalling £{boost_total:,.2f}")
            if total_expenses > total_income:
                alerts.append(f"Expenses (£{total_expenses:,.2f}) exceed income (£{total_income:,.2f})")
            mkt = categories.get("Marketing & Advertising", 0)
            if mkt > total_expenses * 0.2:
                alerts.append(f"Marketing is {mkt/total_expenses*100:.0f}% of expenses")
            answer = "Alerts:\n" + "\n".join(f"  ⚠️ {a}" for a in alerts) if alerts else "No critical alerts right now. Your account looks healthy."
        elif "help" in q or "what can" in q or "how" in q:
            answer = "I can help with: transaction analysis, spending breakdowns, income reports, alerts & warnings, category summaries, saving tips, cash flow forecasts, and marketing spend analysis. Just ask!"
        else:
            net = total_income - total_expenses
            answer = f"Here's your overview: Income £{total_income:,.2f}, Expenses £{total_expenses:,.2f}, Net £{net:,.2f}. Top expense: {list(expense_cats.keys())[0] if expense_cats else 'N/A'} (£{list(expense_cats.values())[0] if expense_cats else 0:,.2f}). {len(boost_txns)} Instagram auto-charges found (£{boost_total:,.2f}). Ask me about any category, alerts, savings, or specific transactions!"

    return {"answer": answer}


@app.get("/api/health")
async def health():
    return {"status": "ok", "demo_mode": USE_DEMO}


frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
