import os
import json
import anthropic


CATEGORIES = [
    "Software & SaaS",
    "Marketing & Advertising",
    "Office Supplies",
    "Travel & Transport",
    "Food & Entertainment",
    "Professional Services",
    "Utilities & Bills",
    "Payroll & Contractors",
    "Revenue - Product Sales",
    "Revenue - Services",
    "Revenue - Subscriptions",
    "Refunds & Chargebacks",
    "Other",
]


async def categorize_transactions(transactions: list[dict]) -> list[dict]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not transactions:
        return transactions

    client = anthropic.Anthropic(api_key=api_key)
    tx_summaries = []
    for tx in transactions[:50]:
        tx_summaries.append({
            "id": tx.get("id", ""),
            "name": tx.get("name", "Unknown"),
            "amount": tx.get("amount", 0),
            "currency": tx.get("currency", "USD"),
            "type": tx.get("type", ""),
            "date": tx.get("date", ""),
        })

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Categorize each transaction into one of these categories: {json.dumps(CATEGORIES)}

Transactions:
{json.dumps(tx_summaries, indent=2)}

Return a JSON array where each item has "id" and "category". Only return the JSON array, nothing else."""
        }],
    )

    try:
        result = json.loads(message.content[0].text)
        category_map = {item["id"]: item["category"] for item in result}
        for tx in transactions:
            tx["ai_category"] = category_map.get(tx.get("id", ""), "Other")
    except (json.JSONDecodeError, KeyError):
        for tx in transactions:
            tx["ai_category"] = "Other"

    return transactions


async def generate_insights(transactions: list[dict], balance: float) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"summary": "AI insights unavailable", "alerts": [], "forecast": ""}

    total_in = sum(t["amount"] for t in transactions if t["amount"] > 0)
    total_out = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
    categories = {}
    for t in transactions:
        cat = t.get("ai_category", "Other")
        categories[cat] = categories.get(cat, 0) + abs(t["amount"])

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""You are a financial advisor for a small business. Analyze this data:

Current balance: ${balance:.2f}
Total income (30 days): ${total_in:.2f}
Total expenses (30 days): ${total_out:.2f}
Net cash flow: ${total_in - total_out:.2f}
Spending by category: {json.dumps(categories, indent=2)}

Return a JSON object with:
- "summary": 2-3 sentence overview of financial health
- "alerts": array of 1-3 urgent items (strings) the business owner should know
- "forecast": 1 sentence cash flow prediction for next 30 days
- "top_saving": 1 sentence suggestion for reducing expenses

Only return JSON, nothing else."""
        }],
    )

    try:
        return json.loads(message.content[0].text)
    except json.JSONDecodeError:
        return {
            "summary": f"Your business had ${total_in:.2f} income and ${total_out:.2f} expenses over the last 30 days.",
            "alerts": [],
            "forecast": "Insufficient data for forecast.",
            "top_saving": "",
        }
