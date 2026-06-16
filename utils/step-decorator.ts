import { test } from "@playwright/test";

/**
 * Wraps a page-object method in test.step() so it appears as a named step
 * in the Playwright trace viewer and HTML report.
 *
 * Usage:
 *   @Step()                       → "ClassName: methodName"
 *   @Step("Fill login form")      → "Fill login form"
 */
export function Step(stepName?: string) {
	return function (
		originalMethod: (...args: unknown[]) => Promise<unknown>,
		context: ClassMethodDecoratorContext,
	) {
		const methodName = String(context.name);
		return async function (this: { constructor: { name: string } }, ...args: unknown[]) {
			const name = stepName ?? `${this.constructor.name}: ${methodName}`;
			return test.step(name, () => originalMethod.apply(this, args));
		};
	};
}
