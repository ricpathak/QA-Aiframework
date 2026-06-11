import { test as base } from "@playwright/test";
import { AuthPage } from "pages/ui";

type AuthFixture = {
	authPage: AuthPage;
};

export const test = base.extend<AuthFixture>({
	authPage: async ({ page }, use) => {
		const loginUrl = process.env.APP_LOGIN_URL;
		if (!loginUrl) {
			throw new Error("APP_LOGIN_URL must be set in the environment");
		}
		const authPage = new AuthPage(page, loginUrl);
		await test.step("Login with credentials from environment", async () => {
			await authPage.loginWithEnvCredentials();
		});
		await use(authPage);
	},
});

export { expect } from "@playwright/test";
