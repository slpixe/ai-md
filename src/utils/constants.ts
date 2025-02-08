// src/utils/constants.ts

export const WHITESPACE_DEPENDENT_EXTENSIONS = [
	".py", ".yaml", ".yml", ".jade", ".haml", ".slim", ".coffee", ".pug", ".styl", ".gd"
];

export const DEFAULT_IGNORES = [
	// Node.js
	"node_modules",
	"package-lock.json",
	"npm-debug.log",
	// Yarn
	"yarn.lock",
	"yarn-error.log",
	// pnpm
	"pnpm-lock.yaml",
	// Bun
	"bun.lockb",
	// Deno
	"deno.lock",
	// PHP (Composer)
	"vendor",
	"composer.lock",
	// Python
	"__pycache__",
	"*.pyc",
	"*.pyo",
	"*.pyd",
	".Python",
	"pip-log.txt",
	"pip-delete-this-directory.txt",
	".venv",
	"venv",
	"ENV",
	"env",
	// Godot
	".godot",
	"*.import",
	// Ruby
	"Gemfile.lock",
	".bundle",
	// Java
	"target",
	"*.class",
	// Gradle
	".gradle",
	"build",
	// Maven
	"pom.xml.tag",
	"pom.xml.releaseBackup",
	"pom.xml.versionsBackup",
	"pom.xml.next",
	// .NET
	"bin",
	"obj",
	"*.suo",
	"*.user",
	// Go
	"go.sum",
	// Rust
	"Cargo.lock",
	"target",
	// General
	".git",
	".svn",
	".hg",
	".DS_Store",
	"Thumbs.db",
	// Environment variables
	".env",
	".env.local",
	".env.development.local",
	".env.test.local",
	".env.production.local",
	"*.env",
	"*.env.*",
	// Common framework directories
	".svelte-kit",
	".next",
	".nuxt",
	".vuepress",
	".cache",
	"dist",
	"tmp",
	// Our output file
	"codebase.md",
	// Turborepo cache folder
	".turbo",
	".vercel",
	".netlify",
	"LICENSE",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_SINGLE_FILE_SIZE = 5 * 1024 * 1024; // 5MB
