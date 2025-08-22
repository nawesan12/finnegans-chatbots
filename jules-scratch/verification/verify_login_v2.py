import time
from playwright.sync_api import sync_playwright, expect
import os
import sys

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

        try:
            # Check for a success toast. Sonner uses role="status" for toasts.
            # We look for any toast that contains the success message.
            success_toast = page.locator('[role="status"]').filter(has_text="Registration successful!")
            expect(success_toast).to_be_visible(timeout=10000)

            # If successful, then check for redirect
            expect(page).to_have_url(f"{base_url}/login", timeout=5000)
            print("Registration successful and redirected to login.")

        except Exception:
            print("Registration did not succeed as expected.", file=sys.stderr)
            # Try to find any error toasts and print their content
            try:
                toasts = page.locator('[role="status"]').all_inner_texts()
                if toasts:
                    print("Found toast messages:", file=sys.stderr)
                    for text in toasts:
                        print(text, file=sys.stderr)
            except Exception as toast_error:
                print(f"Could not retrieve toast messages: {toast_error}", file=sys.stderr)

            # Also print current URL to confirm it hasn't changed
            print(f"Current URL is: {page.url}", file=sys.stderr)

            # Re-raise the exception to fail the test
            raise

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
        print("Successfully logged in and verified dashboard.")

        browser.close()

if __name__ == "__main__":
    run_verification()
