import { Page } from "@playwright/test";
import { Step } from "@utils/step-decorator";
import { BasePage } from "./base-page";

export class HomePage extends BasePage {
	private readonly getStartedLink;
	private readonly installationHeading;

	constructor(page: Page) {
		super(page);
		this.getStartedLink = this.page.getByRole("link", { name: "Get started" });
		this.installationHeading = this.page.getByRole("heading", { name: "Installation" });
	}

	@Step()
	async clickGetStarted() {
		await this.getStartedLink.click();
	}

	@Step()
	async expectInstallationHeadingVisible() {
		await this.expectElementVisible(this.installationHeading);
	}
}
