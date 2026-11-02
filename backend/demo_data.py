"""Generate realistic demo transactions for the PayPal sandbox."""
import random
from datetime import datetime, timedelta

DEMO_TRANSACTIONS = [
    {"name": "Shopify Monthly Plan", "amount": -79.00, "category": "Software & SaaS"},
    {"name": "Google Ads Campaign", "amount": -245.50, "category": "Marketing & Advertising"},
    {"name": "Meta Ads - Lead Gen", "amount": -180.00, "category": "Marketing & Advertising"},
    {"name": "Client Payment - ABC Corp", "amount": 2500.00, "category": "Revenue - Services"},
    {"name": "Freelancer - Logo Design", "amount": -350.00, "category": "Professional Services"},
    {"name": "AWS Hosting", "amount": -42.30, "category": "Software & SaaS"},
    {"name": "Client Payment - XYZ Ltd", "amount": 1800.00, "category": "Revenue - Services"},
    {"name": "Office Supplies - Amazon", "amount": -67.80, "category": "Office Supplies"},
    {"name": "Zoom Pro Subscription", "amount": -13.99, "category": "Software & SaaS"},
    {"name": "Client Payment - Smith Co", "amount": 950.00, "category": "Revenue - Services"},
    {"name": "Canva Pro Annual", "amount": -119.99, "category": "Software & SaaS"},
    {"name": "Train Ticket - London", "amount": -85.00, "category": "Travel & Transport"},
    {"name": "Product Sale #1042", "amount": 45.99, "category": "Revenue - Product Sales"},
    {"name": "Product Sale #1043", "amount": 29.99, "category": "Revenue - Product Sales"},
    {"name": "Mailchimp Email Plan", "amount": -20.00, "category": "Marketing & Advertising"},
    {"name": "Client Payment - Johnson", "amount": 3200.00, "category": "Revenue - Services"},
    {"name": "Uber - Client Meeting", "amount": -18.50, "category": "Travel & Transport"},
    {"name": "Product Sale #1044", "amount": 59.99, "category": "Revenue - Product Sales"},
    {"name": "n8n Cloud Plan", "amount": -24.00, "category": "Software & SaaS"},
    {"name": "Contractor - Dev Work", "amount": -500.00, "category": "Payroll & Contractors"},
    {"name": "Refund - Order #998", "amount": -29.99, "category": "Refunds & Chargebacks"},
    {"name": "Client Payment - Brown LLC", "amount": 1450.00, "category": "Revenue - Services"},
    {"name": "Electricity Bill", "amount": -95.00, "category": "Utilities & Bills"},
    {"name": "Internet - Business Plan", "amount": -55.00, "category": "Utilities & Bills"},
    {"name": "Product Sale #1045", "amount": 39.99, "category": "Revenue - Product Sales"},
    {"name": "LinkedIn Ads", "amount": -150.00, "category": "Marketing & Advertising"},
    {"name": "Client Payment - Tech Solutions", "amount": 4200.00, "category": "Revenue - Services"},
    {"name": "Domain Renewal", "amount": -12.99, "category": "Software & SaaS"},
    {"name": "Product Sale #1046", "amount": 24.99, "category": "Revenue - Product Sales"},
    {"name": "Lunch - Client Meeting", "amount": -42.00, "category": "Food & Entertainment"},
]


def generate_demo_transactions(count=30):
    transactions = []
    now = datetime.utcnow()
    for i in range(count):
        template = DEMO_TRANSACTIONS[i % len(DEMO_TRANSACTIONS)]
        variation = random.uniform(0.85, 1.15)
        amount = round(template["amount"] * variation, 2)
        date = now - timedelta(days=random.randint(0, 29), hours=random.randint(0, 23))
        transactions.append({
            "id": f"TX-{1000 + i}",
            "name": template["name"],
            "amount": amount,
            "currency": "USD",
            "type": "income" if amount > 0 else "expense",
            "date": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ai_category": template["category"],
            "status": "completed",
        })
    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions


def get_demo_balance():
    return round(random.uniform(8500, 12500), 2)
