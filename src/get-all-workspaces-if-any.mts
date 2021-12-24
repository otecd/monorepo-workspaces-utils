import { $, chalk } from 'zx';

export default async () => {
  let workspacesConfig: Record<string, string>|null|undefined;

  try {
    workspacesConfig = JSON.parse((await $`npm pkg get repository.directory --ws --json`).toString().trim());
    if (typeof workspacesConfig !== 'object') workspacesConfig = null;
  } catch (error) {
    console.warn(chalk.yellow('Warning!'), error.message);
  }

  return workspacesConfig;
};
