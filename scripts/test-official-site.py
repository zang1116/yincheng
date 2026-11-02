import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4190"
OUT = Path(__file__).resolve().parent.parent / "test-artifacts" / "official-site"
OUT.mkdir(parents=True, exist_ok=True)
MOCK_COUNT = os.environ.get("MOCK_COUNT", "1") == "1"
ROUTE_SUFFIX = ".html" if "127.0.0.1" in BASE_URL or "localhost" in BASE_URL else ""


def assert_true(value, message):
    if not value:
        raise AssertionError(message)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    )
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
    )
    page = context.new_page()
    errors = []
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    if MOCK_COUNT:
        page.route(
            "**/api/download-count",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"count": 1287, "version": "2.3.5"}),
            ),
        )

    page.goto(BASE_URL, wait_until="networkidle")
    assert_true(page.get_by_role("heading", level=1).inner_text().startswith("把这一学期"), "hero headline")
    displayed_count = page.locator("[data-download-count]").first.inner_text()
    assert_true(displayed_count == "1,287" if MOCK_COUNT else displayed_count.isdigit(), f"download count should render, got {displayed_count}")
    download_links = page.locator('a[data-download][href="/api/download"]')
    assert_true(download_links.count() >= 4, f"expected at least 4 download links, got {download_links.count()}")
    assert_true(page.locator(".site-nav a").count() == 4, "main navigation should expose four pages")
    assert_true(page.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "desktop overflow")
    page.screenshot(path=str(OUT / "desktop-hero.png"), full_page=False)
    page.screenshot(path=str(OUT / "desktop-home.png"), full_page=True)

    base = BASE_URL.rstrip("/")
    page.goto(f"{base}/features{ROUTE_SUFFIX}", wait_until="networkidle")
    assert_true(page.get_by_role("heading", level=1).inner_text().startswith("不是又一个"), "features page")
    assert_true(page.locator(".feature").count() == 3, "features page should present three feature stories")
    page.screenshot(path=str(OUT / "desktop-features.png"), full_page=False)

    page.goto(f"{base}/screens{ROUTE_SUFFIX}", wait_until="networkidle")
    assert_true(page.locator(".screenshot-card").count() == 4, "screenshot page should show all four screens")
    page.locator(".screenshot-card").last.scroll_into_view_if_needed()
    page.wait_for_timeout(450)
    page.evaluate("scrollTo(0, 0)")
    image_ratios = page.locator(".screenshot-frame").evaluate_all(
        """els => els.map(el => {
          const r = el.getBoundingClientRect();
          const img = el.querySelector('img');
          return {
            frame: r.width / r.height,
            source: img.naturalWidth / img.naturalHeight,
            fit: getComputedStyle(img).objectFit
          };
        })"""
    )
    assert_true(
        all(abs(item["frame"] - item["source"]) < 0.01 and item["fit"] == "contain" for item in image_ratios),
        f"screenshots must be complete and uncropped: {image_ratios}",
    )
    page.screenshot(path=str(OUT / "desktop-screens.png"), full_page=False)

    page.goto(f"{base}/guide{ROUTE_SUFFIX}", wait_until="networkidle")
    assert_true(page.locator(".faq details").count() == 6, "guide should include installation and FAQ")
    page.locator(".faq details").first.locator("summary").click()
    assert_true(page.locator(".faq details").first.get_attribute("open") is not None, "FAQ should open")
    page.screenshot(path=str(OUT / "desktop-guide.png"), full_page=False)

    page.set_viewport_size({"width": 390, "height": 844})
    page.reload(wait_until="networkidle")
    page.evaluate("scrollTo(0, 0)")
    assert_true(page.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "390px overflow")
    assert_true(page.locator(".mobile-download-bar").is_visible(), "mobile download bar")
    assert_true(page.locator(".site-nav").is_visible(), "mobile page navigation")
    page.screenshot(path=str(OUT / "mobile-guide.png"), full_page=False)
    page.goto(f"{base}/screens{ROUTE_SUFFIX}", wait_until="networkidle")
    page.evaluate("scrollTo(0, 0)")
    page.locator(".screenshot-grid").scroll_into_view_if_needed()
    page.wait_for_timeout(450)
    images_ok = page.locator(".screenshot-frame img").evaluate_all("els => els.every(img => img.complete && img.naturalWidth > 0)")
    assert_true(images_ok, "all screenshots should load")
    page.screenshot(path=str(OUT / "mobile-screens.png"), full_page=False)

    page.set_viewport_size({"width": 320, "height": 568})
    page.goto(f"{base}/", wait_until="networkidle")
    page.evaluate("scrollTo(0, 0)")
    assert_true(page.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "320px overflow")
    assert_true(page.locator(".mobile-download-bar").is_visible(), "320px download bar")
    assert_true(page.locator(".site-nav").is_visible(), "320px navigation")
    page.screenshot(path=str(OUT / "mobile-320.png"), full_page=False)

    assert_true(not errors, f"browser errors: {errors}")
    browser.close()

print("OK official site visual and interaction checks")
