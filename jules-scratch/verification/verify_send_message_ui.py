from playwright.sync_api import sync_playwright, expect
import time

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Use a unique email for each run
        unique_email = f"test.user.{int(time.time())}@example.com"

        # Register a new user
        page.goto("http://localhost:3000/register")
        page.get_by_label("Nombre completo").fill("Test User")
        page.get_by_label("Correo electrónico").fill(unique_email)
        page.get_by_label("Contraseña", exact=True).fill("password123")
        page.get_by_label("Confirmar contraseña").fill("password123")
        page.get_by_role("button", name="Crear cuenta").click()

        # Wait for navigation to the login page
        expect(page).to_have_url("http://localhost:3000/login", timeout=15000)

        # Log in
        page.get_by_label("Correo electrónico").fill(unique_email)
        page.get_by_label("Contraseña", exact=True).fill("password123")
        page.get_by_role("button", name="Iniciar sesión").click()

        # Wait for navigation to the dashboard
        expect(page).to_have_url("http://localhost:3000/dashboard", timeout=15000)

        # Go to contacts page
        page.goto("http://localhost:3000/dashboard/contacts")

        # Wait for network to be idle to ensure all data is loaded
        page.wait_for_load_state('networkidle', timeout=15000)

        # Check if there are any contacts. If not, create one.
        if page.get_by_text("Aún no tienes contactos").is_visible():
            page.get_by_role("button", name="Nuevo contacto").click()

            # Modal for new contact appears
            expect(page.get_by_role("heading", name="Nuevo Contacto")).to_be_visible()
            page.get_by_label("Nombre y Apellido").fill("Test Contact")
            page.get_by_label("Teléfono").fill("1234567890")
            page.get_by_role("button", name="Guardar Contacto").click()

            # Wait for the modal to disappear
            expect(page.get_by_role("heading", name="Nuevo Contacto")).not_to_be_visible(timeout=10000)

            # Reload the page to ensure the new contact is listed
            page.reload()
            # Wait for the table to be visible again
            page.wait_for_load_state('networkidle', timeout=15000)
            expect(page.locator("table")).to_be_visible(timeout=10000)

        # Click on the first contact link
        page.locator('a[href^="/dashboard/contacts/"]').first.click()

        # Wait for the details page to load
        expect(page).to_have_url(lambda url: url.startswith("http://localhost:3000/dashboard/contacts/"), timeout=15000)

        # Verify the "Send Message" UI is present
        expect(page.get_by_text("Enviar mensaje directo")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)