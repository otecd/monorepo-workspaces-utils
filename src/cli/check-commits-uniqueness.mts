#!/usr/bin/env node

import { $, argv, chalk, fs } from 'zx';
import getAllWorkspacesIfAny from '../get-all-workspaces-if-any.mjs';

const [, GIT_REV_TO_COMPARE] = argv._;

if (!GIT_REV_TO_COMPARE) {
  throw new Error('Required argument is missed. You have to type a git revision to compare with it')
}

const { rootIsPackage } = argv;
const origRev = (await $ `git rev-parse --short @`).toString().trim();

await $ `git checkout -f ${GIT_REV_TO_COMPARE}`;
await $ `git checkout -f ${origRev}`;

const workspacesConfig = await getAllWorkspacesIfAny();
const rootPkgName: string = JSON.parse((await $`npm pkg get name --json`).stdout);

if (!workspacesConfig) {
  console.log(chalk.green('OK!'), 'Here is no workspaces in root package.json');
} else {
  let commits: Set<string> = new Set();
  const workspacesParsed = Object.entries(workspacesConfig);
  const output: Record<string, string> = {};
  const updateCommits = ({ pkgName = '', prevCommits = [], newCommits = [] }: {
    pkgName: string,
    prevCommits: string[],
    newCommits: string[],
  }) => {
    const updatedCommits = new Set(prevCommits.concat(newCommits));

    if (updatedCommits.size !== prevCommits.length + newCommits.length) {
      throw new Error(`Duplicated commits were found in ${pkgName} package`);
    }
    return updatedCommits;
  };

  await Promise.all(workspacesParsed.map(async ([name, directory]) => {
    const newCommits = (await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- ${directory}`).toString().trim().split('\n').filter((v) => v);

    commits = updateCommits({ pkgName: name, prevCommits: Array.from(commits), newCommits });
    if (newCommits.length) output[name] = directory;
  }));

  if (rootIsPackage) {
    const excludedDirs = Object.values(workspacesConfig).map(s => `:!${s}`);

    commits = updateCommits({
      pkgName: rootPkgName,
      prevCommits: Array.from(commits),
      newCommits: (await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- . ${excludedDirs}`).toString().trim().split('\n').filter((v) => v),
    });
  }
  console.log(chalk.green('OK!'), 'No duplicated commits here');
  await fs.outputJson('/tmp/check-commits-uniqueness-log.json', output);
}
