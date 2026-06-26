from curl_cffi import requests
import json
import os

URL = "https://www.idx.co.id/primary/TradingSummary/GetStockSummary?length=9999&start=0"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/companySummaryByKodeEmiten.json")


def fetch_company_summary():
    print(f"Fetching {URL}...")
    try:
        response = requests.get(URL, impersonate="chrome", timeout=30)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                print("Successfully parsed JSON.")

                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)

                record_count = len(data.get("data", []))
                print(f"Saved {record_count} records to {OUTPUT_FILE}")
                return data
            except json.JSONDecodeError:
                print("Failed to decode JSON. Response text snippet:")
                print(response.text[:500])
        else:
            print("Request failed. Response snippet:")
            print(response.text[:500])
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    fetch_company_summary()
