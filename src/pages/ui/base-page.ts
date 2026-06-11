import { Locator, Page, expect, test } from "@playwright/test";

export class BasePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	protected async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
		return test.step(name, fn);
	}

	async navigate(url: string) {
		await this.page.goto(url);
	}

	async expectToHaveTitle(text: RegExp | string) {
		await expect(this.page).toHaveTitle(text);
	}

	async expectToHaveText(locator: Locator, text: string | string[]) {
		await expect(locator).toHaveText(text);
	}

	async expectToContainText(locator: Locator, text: string) {
		await expect(locator).toContainText(text);
	}

	async expectElementVisible(locator: Locator) {
		await expect(locator).toBeVisible();
	}
}
