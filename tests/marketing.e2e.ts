import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

describe("RestroNex Marketing & Showcase", () => {
  test("loads the homepage and displays the hero headline and navigation", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/");

    // Assert
    await expect(screen.getByRole("heading", "Restaurant POS That Accelerates Every Service Hour")).toBeVisible();
    await expect(browser).toHaveURL("/");
    await expect(screen.getByText("The Production-Ready Restaurant OS for India")).toBeVisible();
  });

  test("navigates from hero CTA to the pricing plans page", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/");

    // Act
    await screen.getByRole("button", "Compare Plans").click();

    // Assert
    await expect(browser).toHaveURL("/pricing");
    await expect(screen.getByRole("heading", "Transparent SaaS Pricing for Modern Restaurants")).toBeVisible();
    await expect(screen.getByText("Full Feature & Entitlements Comparison")).toBeVisible();
  });

  test("displays pricing plans and allows comparing features", async ({ app, screen }) => {
    // Arrange
    await app.open("/pricing");

    // Assert
    await expect(screen.getByRole("heading", "STARTER")).toBeVisible();
    await expect(screen.getByRole("heading", "GROWTH")).toBeVisible();
    await expect(screen.getByRole("heading", "BUSINESS")).toBeVisible();
    await expect(screen.getByRole("link", "Get Started").first()).toBeVisible();
  });

  test("loads the POS billing showcase page", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/poss");

    // Assert
    await expect(browser).toHaveURL("/poss");
    await expect(screen.getByText("A quick 3-click restaurant billing software")).toBeVisible();
    await expect(screen.getByText("Split bill by item or guest")).toBeVisible();
  });

  test("loads the advanced inventory features page", async ({ app, screen, browser }) => {
    // Arrange
    await app.open("/features/inventory");

    // Assert
    await expect(browser).toHaveURL("/features/inventory");
    await expect(screen.getByText("Real-time raw material consumption on bill settlement")).toBeVisible();
    await expect(screen.getByText("Recipe Bill of Materials (BOM) with sub-recipes")).toBeVisible();
  });
});
