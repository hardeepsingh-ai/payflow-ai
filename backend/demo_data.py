"""Generate realistic demo transactions matching Aberdeen Chiropractic Clinic's PayPal."""
import random
from datetime import datetime, timedelta

TRANSACTION_TEMPLATES = [
    # Patient payments - chiropractic treatments
    {"name": "Payment - Chiropractic Adjustment", "min": 45, "max": 65, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Initial Consultation", "min": 60, "max": 85, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Sports Injury Treatment", "min": 50, "max": 75, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Deep Tissue Massage", "min": 40, "max": 60, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Spinal Decompression", "min": 70, "max": 120, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Posture Assessment", "min": 35, "max": 50, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Follow-up Session", "min": 40, "max": 55, "type": "income", "category": "Revenue - Treatments"},
    {"name": "Payment - Rehabilitation Package", "min": 150, "max": 300, "type": "income", "category": "Revenue - Packages"},
    {"name": "Payment - Monthly Wellness Plan", "min": 120, "max": 200, "type": "income", "category": "Revenue - Packages"},
    {"name": "Gift Voucher Purchase", "min": 50, "max": 100, "type": "income", "category": "Revenue - Product Sales"},

    # Instagram Boost Posts - THE PROBLEM (auto-charged without anyone knowing)
    {"name": "Instagram Boost Post - Auto-Charged", "min": 5, "max": 25, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Auto-Charged", "min": 8, "max": 30, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Auto-Charged", "min": 10, "max": 45, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Instagram Boost Post - Auto-Charged", "min": 12, "max": 35, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Facebook Post Boost - Auto", "min": 5, "max": 20, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Facebook Post Boost - Auto", "min": 8, "max": 25, "type": "expense", "category": "Marketing & Advertising"},

    # Legitimate Meta Ads (the ones Hardeep actually managed)
    {"name": "Meta Ads - Lead Generation Campaign", "min": 50, "max": 150, "type": "expense", "category": "Marketing & Advertising"},
    {"name": "Meta Ads - New Patient Campaign", "min": 30, "max": 100, "type": "expense", "category": "Marketing & Advertising"},

    # Clinic operations
    {"name": "Clinic Supplies - Treatment Table Covers", "min": 20, "max": 50, "type": "expense", "category": "Clinic Supplies"},
    {"name": "Clinic Supplies - Massage Oils & Creams", "min": 30, "max": 80, "type": "expense", "category": "Clinic Supplies"},
    {"name": "Clinic Supplies - Resistance Bands", "min": 15, "max": 35, "type": "expense", "category": "Clinic Supplies"},
    {"name": "Clinic Supplies - KT Tape & Supports", "min": 20, "max": 45, "type": "expense", "category": "Clinic Supplies"},

    # Software & subscriptions
    {"name": "Cliniko - Practice Management", "min": 49, "max": 49, "type": "expense", "category": "Software & Subscriptions"},
    {"name": "Online Booking System", "min": 25, "max": 40, "type": "expense", "category": "Software & Subscriptions"},
    {"name": "Canva Pro - Social Media Graphics", "min": 10, "max": 10, "type": "expense", "category": "Software & Subscriptions"},

    # Bills & overheads
    {"name": "Clinic Rent - Monthly", "min": 800, "max": 1200, "type": "expense", "category": "Rent & Utilities"},
    {"name": "Electricity Bill", "min": 90, "max": 160, "type": "expense", "category": "Rent & Utilities"},
    {"name": "Business Insurance", "min": 85, "max": 130, "type": "expense", "category": "Rent & Utilities"},

    # Staff
    {"name": "Receptionist - Weekly Pay", "min": 250, "max": 400, "type": "expense", "category": "Staff & Payroll"},
    {"name": "Cleaning Service", "min": 50, "max": 80, "type": "expense", "category": "Staff & Payroll"},

    # Refunds
    {"name": "Refund - Cancelled Appointment", "min": 40, "max": 65, "type": "expense", "category": "Refunds"},
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
    return round(random.uniform(3500, 7000), 2)
