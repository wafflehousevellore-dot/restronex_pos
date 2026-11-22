import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

describe("RestroNex Vertical Industry Solutions", () => {
  test("renders the Cafe & Roastery solution page with specialized capabilities", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/solutions/cafes");

    // Assert
    await expect(browser).toHaveURL("/solutions/cafes");
    await expect(screen.getByText("CAFE & COFFEE SHOP POS")).toBeVisible();
    await expect(screen.getByRole("heading", "Designed for Fast-Paced Cafes & Roasteries")).toBeVisible();
  });

  test("renders the QSR solution page with rapid billing features", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/solutions/qsr");

    // Assert
    await expect(browser).toHaveURL("/solutions/qsr");
    await expect(screen.getByText("QUICK SERVICE RESTAURANTS")).toBeVisible();
    await expect(screen.getByRole("heading", "High-Speed 3-Second Billing for QSRs")).toBeVisible();
    await expect(screen.getByRole("link", "Schedule QSR Demo →")).toBeVisible();
  });
});
