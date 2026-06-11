import { Page } from "@playwright/test";
import { BasePage } from "./base-page";

export class AuthPage extends BasePage {
	private readonly usernameInput = this.page.locator('[data-testid="username"], #username, input[name="username"]').first();
	private readonly passwordInput = this.page.locator('[type="password"]').first();
	private readonly submitButton = this.page.locator('[data-testid="login-submit"], button[type="submit"]').first();
	private readonly errorMessage = this.page.locator('[data-testid="error"], [role="alert"], .error-message').first();

	constructor(
		page: Page,
		private readonly loginUrl: string,
	) {
		super(page);
	}

	async login(username: string, password: string): Promise<void> {
		await this.navigate(this.loginUrl);
		await this.usernameInput.fill(username);
		await this.passwordInput.fill(password);
		await this.submitButton.click();
	}

	async loginWithEnvCredentials(): Promise<void> {
		const username = process.env.APP_USERNAME;
		const password = process.env.APP_PASSWORD;
		if (!username || !password) {
			throw new Error("APP_USERNAME and APP_PASSWORD must be set in the environment");
		}
		await this.login(username, password);
	}

	async expectLoginError(message: string): Promise<void> {
		await this.expectToContainText(this.errorMessage, message);
	}

	async expectLoggedIn(expectedUrl?: RegExp | string): Promise<void> {
		if (expectedUrl) {
			await this.page.waitForURL(expectedUrl);
		}
	}
}
