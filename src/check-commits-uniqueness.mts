#!/usr/bin/env zx

import type * as zx from 'zx/globals.d';

$.verbose = false;

const [, GIT_REV_TO_COMPARE] = argv._;

if (!GIT_REV_TO_COMPARE) {
  console.error(chalk.red('Error!') + ' Required argument is missed. You have to type a git revision to compare with it');
  process.exit(1);
}

const origRev = (await $ `git rev-parse --short @`).toString().trim();
let workspacesConfig: Record<string, string>;
let workspacesParsed: [string, string][];

await $ `git checkout -f ${GIT_REV_TO_COMPARE}`;
await $ `git checkout -f ${origRev}`;

try {
  workspacesConfig = JSON.parse((await $`npm pkg get repository.directory --ws --json`).stdout);
  workspacesParsed = Object.entries(workspacesConfig);

  if (!workspacesParsed || !workspacesParsed.length) throw new Error();
} catch (error) {
  console.log('Here is no workspaces in root package.json');
  process.exit();
}

let commits: Set<string> = new Set();
const updateCommits = (pkgName: string, prevCommits: Set<string>, newCommits: Set<string>) => {
  const updatedCommits = new Set(Array.from(prevCommits).concat(Array.from(newCommits)));

  if (updatedCommits.size !== prevCommits.size + newCommits.size) {
    throw new Error(`Duplicated commits were found in ${pkgName} package`);
  }
  return updatedCommits;
};

try {
  await Promise.all(workspacesParsed.map(async ([name, directory]) => {
    commits = updateCommits(name, commits, new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- ${directory}`).stdout.split('\n')));
  }));
  
  const excludedDirs = Object.values(workspacesConfig).map(s => `:!${s}`);
  const rootPkgName: string = JSON.parse((await $`npm pkg get name --json`).stdout);

  commits = updateCommits(rootPkgName, commits, new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- . ${excludedDirs}`).stdout.split('\n')));
} catch (error) {
  console.error(chalk.red('Error!') + ' ' + error.message);
  process.exit(228);
}

console.log('Ok! No duplicated commits here');
