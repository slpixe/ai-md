import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,  // Jest-style globals like `describe`, `it`, `expect`
		coverage: {
			reporter: ["text", "json", "html"], // Optional: for coverage reporting
		},
	},
});
