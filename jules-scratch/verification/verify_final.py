import time
from playwright.sync_api import sync_playwright, expect
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        unique_id = int(time.time())
        email = f"test_user_{unique_id}@example.com"
        password = "password123"
        name = "Test User"

        base_url = os.environ.get("BASE_URL", "http://localhost:3000")

        # Register
        page.goto(f"{base_url}/register")
        page.get_by_label("Name").fill(name)
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Create account").click()

        # Verify redirect to login
        expect(page).to_have_url(f"{base_url}/login", timeout=15000)
        print("Registration successful, redirected to login.")

        # Log in
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Sign in").click()

        # Verify redirect to dashboard
        expect(page).to_have_url(f"{base_url}/dashboard", timeout=15000)
        print("Login successful, redirected to dashboard.")

        dashboard_element = page.get_by_text("Contactos Totales")
        expect(dashboard_element).to_be_visible()
        print("Dashboard content verified.")

        page.screenshot(path="jules-scratch/verification/dashboard_after_login.png")
        print("Successfully logged in and verified dashboard.")

        browser.close()

if __name__ == "__main__":
    run_verification()
