import time
from playwright.sync_api import sync_playwright, expect
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Generate unique user credentials
        unique_id = int(time.time())
        email = f"test_user_{unique_id}@example.com"
        password = "password123"
        name = "Test User"

        base_url = os.environ.get("BASE_URL", "http://localhost:3000")

        # Register a new user
        page.goto(f"{base_url}/register")
        page.get_by_label("Name").fill(name)
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Create account").click()

        # Wait for redirection to the login page
        expect(page).to_have_url(f"{base_url}/login", timeout=10000)

        # Log in with the new user
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Sign in").click()

        # Verify redirection to the dashboard
        expect(page).to_have_url(f"{base_url}/dashboard", timeout=10000)

        # Check for a known element on the dashboard
        dashboard_element = page.get_by_text("Contactos Totales")
        expect(dashboard_element).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/dashboard_after_login.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
