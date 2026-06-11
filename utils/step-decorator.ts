import { test } from "@playwright/test";

/**
 * Wraps a page-object method in test.step() so it appears as a named step
 * in the Playwright trace viewer and HTML report.
 *
 * Usage:
 *   @Step()                           → "ClassName: methodName"
 *   @Step("Fill login form")          → "Fill login form"
 */
export function Step(stepName?: string) {
	return function (_target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;

		descriptor.value = async function (this: { constructor: { name: string } }, ...args: unknown[]) {
			const name = stepName ?? `${this.constructor.name}: ${propertyKey}`;
			return test.step(name, () => original.apply(this, args));
		};

		return descriptor;
	};
}
