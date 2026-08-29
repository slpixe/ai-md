import cli, { runCli } from './src/cli.js';

export { aggregateFiles, createCli, runCli } from './src/cli.js';
export default cli;

if ((import.meta as ImportMeta & { main?: boolean }).main) {
  await runCli();
}
