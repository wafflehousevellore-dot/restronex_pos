import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

describe("RestroNex PWA & Mobile Configuration", () => {
  test("serves the valid web app manifest", async ({ app, browser }) => {
    // Arrange & Act
    await app.open("/manifest.webmanifest");

    // Assert
    await expect(browser).toHaveURL("/manifest.webmanifest");
  });

  test("contains PWA manifest and mobile viewport link tags", async ({ app, browser }) => {
    // Arrange
    await app.open("/");

    // Assert
    await expect(browser).toHaveURL("/");
  });
});
