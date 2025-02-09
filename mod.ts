import cli from './src/cli.js';
export default cli;

// Auto-execute if this is the entry point
if (import.meta.url === new URL(import.meta.resolve('./mod.ts')).href) {
    cli.parse(process.argv);
}
