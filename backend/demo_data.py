"""Generate realistic demo transactions matching a health clinic scenario."""
import random
from datetime import datetime, timedelta

TRANSACTION_TEMPLATES = [
    # Revenue - Client payments
    {"name": "Client Payment - Wellness Clinic", "min": 800, "max": 2500, "type": "income", "category": "Revenue - Services"},
    {"name": "Client Payment - Sports Therapy", "min": 400, "max": 1200, "type": "income", "category": "Revenue - Services"},
    {"name": "New Patient Consultation Fee", "min": 60, "max": 120, "type": "income", "category": "Revenue - Services"},
    {"name": "Follow-up Treatment Session", "min": 40, "max": 80, "type": "income", "category": "Revenue - Services"},
    {"name": "Product Sale - Supplements", "min": 15, "max": 65, "type": "income", "category": "Revenue - Product Sales"},
    {"name": "Gift Voucher Purchase", "min": 50, "max": 150, "type": "income", "category": "Revenue - Product Sales"},
    {"name": "Corporate Wellness Package", "min": 1500, "max": 3500, "type": "income", "category": "Revenue - Services"},

    # Instagram Boost Posts - the real problem!
    {"name": "Instagram Boost Post - Auto", "min": 5, "max": 25, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Auto", "min": 8, "max": 30, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Auto", "min": 10, "max": 40, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Promo", "min": 15, "max": 50, "type": "expense", "category": "Marketing & Advertising"},

    # Legitimate marketing
    {"name": "Meta Ads - Lead Generation", "min": 50, "max": 200, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Google Ads - Local Search", "min": 30, "max": 100, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Canva Pro - Monthly", "min": 10, "max": 10, "type": "expense", "category": "Software & SaaS"},

    # Software & subscriptions
    {"name": "Clinic Management Software", "min": 49, "max": 99, "type": "expense", "category": "Software & SaaS"},
    {"name": "Booking System - Monthly", "min": 25, "max": 45, "type": "expense", "category": "Software & SaaS"},
    {"name": "Zoom Pro Subscription", "min": 13, "max": 13, "type": "expense", "category": "Software & SaaS"},
    {"name": "Domain Renewal", "min": 10, "max": 20, "type": "expense", "category": "Software & SaaS"},

    # Operations
    {"name": "Clinic Supplies - Equipment", "min": 80, "max": 350, "type": "expense", "category": "Office Supplies"},
    {"name": "Treatment Table Covers", "min": 25, "max": 60, "type": "expense", "category": "Office Supplies"},
    {"name": "Electricity Bill", "min": 120, "max": 200, "type": "expense", "category": "Utilities & Bills"},
    {"name": "Business Insurance - Monthly", "min": 85, "max": 150, "type": "expense", "category": "Utilities & Bills"},
    {"name": "Water Bill", "min": 30, "max": 50, "type": "expense", "category": "Utilities & Bills"},

    # Staff
    {"name": "Contractor - Receptionist", "min": 300, "max": 600, "type": "expense", "category": "Payroll & Contractors"},
    {"name": "Freelancer - Social Media Manager", "min": 200, "max": 400, "type": "expense", "category": "Payroll & Contractors"},
    {"name": "Cleaning Service - Weekly", "min": 60, "max": 100, "type": "expense", "category": "Professional Services"},

    # Other
    {"name": "Uber - Client Visit", "min": 8, "max": 25, "type": "expense", "category": "Travel & Transport"},
    {"name": "Lunch - Team Meeting", "min": 15, "max": 40, "type": "expense", "category": "Food & Entertainment"},
    {"name": "Refund - Cancelled Appointment", "min": 40, "max": 80, "type": "expense", "category": "Refunds & Chargebacks"},
]


def generate_demo_transactions(count=30):
    transactions = []
    now = datetime.utcnow()
    for i in range(count):
        template = random.choice(TRANSACTION_TEMPLATES)
        amount = round(random.uniform(template["min"], template["max"]), 2)
        if template["type"] == "expense":
            amount = -amount
        days_ago = random.randint(0, 30)
        date = now - timedelta(days=days_ago, hours=random.randint(0, 23))
        transactions.append({
            "id": f"DEMO-{i+1:04d}",
            "name": template["name"],
            "amount": amount,
            "currency": "GBP",
            "type": template["type"],
            "date": date.isoformat() + "Z",
            "status": "COMPLETED",
            "ai_category": template["category"],
        })
    transactions.sort(key=lambda t: t["date"], reverse=True)
    return transactions


def get_demo_balance():
    return round(random.uniform(4500, 8500), 2)
