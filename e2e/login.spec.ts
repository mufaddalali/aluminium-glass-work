import { expect, test } from "@playwright/test";

test("login page validates required fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await page.getByLabel("Show password").click();
  await expect(page.getByRole("textbox", { name: "Password" })).toHaveAttribute("type", "text");
});
