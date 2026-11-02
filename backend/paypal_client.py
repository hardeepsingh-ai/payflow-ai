import httpx
import os
from datetime import datetime, timedelta


class PayPalClient:
    def __init__(self):
        self.client_id = os.getenv("PAYPAL_CLIENT_ID")
        self.client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
        self.base_url = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
        self.access_token = None
        self.token_expires = None

    async def _get_access_token(self):
        if self.access_token and self.token_expires and datetime.now() < self.token_expires:
            return self.access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data["access_token"]
            self.token_expires = datetime.now() + timedelta(seconds=data.get("expires_in", 3600) - 60)
            return self.access_token

    async def get_transactions(self, start_date=None, end_date=None):
        token = await self._get_access_token()
        if not end_date:
            end_date = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/transactions",
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "fields": "all",
                    "page_size": 100,
                },
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            if response.status_code == 200:
                return response.json()
            return {"transaction_details": [], "total_items": 0}

    async def get_balances(self):
        token = await self._get_access_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/balances",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            if response.status_code == 200:
                return response.json()
            return {"balances": []}
