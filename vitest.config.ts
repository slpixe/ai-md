import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		// Optional: when you want to run tests only in certain files
		globals: true,  // Jest-style globals like `describe`, `it`, `expect`
		coverage: {
			reporter: ["text", "json", "html"], // Optional: for coverage reporting
		},
	},
});
