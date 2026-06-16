import { TAGS } from "@utils/configuration";
import { test, expect } from "./fixtures/authenticated-fixture";

test.describe("Login", () => {
	test(
		"logs in with encrypted credentials and lands on the products page",
		{ tag: TAGS.SMOKE },
		async ({ authPage }) => {
			await test.step("Verify the products page loaded after login", async () => {
				await expect(authPage.page.locator(".inventory_list")).toBeVisible();
				await expect(authPage.page).toHaveTitle(/Swag Labs/);
			});
		},
	);

	test(
		"shows an error for an invalid password",
		{ tag: TAGS.REGRESSION },
		async ({ page }) => {
			await test.step("Attempt login with wrong password", async () => {
				await page.goto(process.env.APP_LOGIN_URL!);
				await page.locator('[data-test="username"]').fill(process.env.APP_USERNAME!);
				await page.locator('[data-test="password"]').fill("wrong_password");
				await page.locator('[data-test="login-button"]').click();
			});

			await test.step("Verify error message is shown", async () => {
				await expect(page.locator('[data-test="error"]')).toContainText("Username and password do not match");
			});
		},
	);
});
