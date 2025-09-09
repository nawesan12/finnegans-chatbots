from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:3000/login")
        page.get_by_label("Email").fill("test@test.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Sign in").click()

        # Wait for navigation to the dashboard
        expect(page).to_have_url("http://localhost:3000/dashboard")

        # 2. Navigate to flows page
        page.goto("http://localhost:3000/dashboard/flows")

        # 3. Create a new flow
        page.get_by_role("button", name="Crear flujo").click()

        # Wait for the flow builder to appear
        expect(page.get_by_text("Nodos")).to_be_visible()

        # 4. Drag and drop a message node
        source_selector = "div[data-node-type='message']"
        target_selector = ".react-flow__pane"

        source = page.locator(source_selector)
        target = page.locator(target_selector)

        source_bounds = source.bounding_box()
        target_bounds = target.bounding_box()

        if source_bounds and target_bounds:
            page.mouse.move(source_bounds['x'] + source_bounds['width'] / 2, source_bounds['y'] + source_bounds['height'] / 2)
            page.mouse.down()
            page.mouse.move(target_bounds['x'] + 200, target_bounds['y'] + 200)
            page.mouse.up()
        else:
            raise Exception("Could not find source or target for drag and drop")

        # 5. Click the new node to open the inspector
        page.locator(".react-flow__node-message").last.click()

        # 6. Click the switch
        page.get_by_label("Use Template").click()

        # 7. Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
