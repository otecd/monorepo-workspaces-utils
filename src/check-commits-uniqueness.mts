#!/usr/bin/env zx

import type * as zx from 'zx/globals.d';

$.verbose = false;

const [, GIT_REV_TO_COMPARE] = argv._;

if (!GIT_REV_TO_COMPARE) {
  throw new Error('Required argument is missed. You have to type a git revision to compare with it')
}

const origRev = (await $ `git rev-parse --short @`).toString().trim();
let workspacesConfig: Record<string, string>;
let workspacesParsed: [string, string][];

await $ `git checkout -f ${GIT_REV_TO_COMPARE}`;
await $ `git checkout -f ${origRev}`;

workspacesConfig = JSON.parse((await nothrow($`npm pkg get repository.directory --ws --json`)).stdout) || {};
workspacesParsed = Object.entries(workspacesConfig);

const rootPkgName: string = JSON.parse((await $`npm pkg get name --json`).stdout);

if (!workspacesParsed || !workspacesParsed.length) {
  await $`echo "OK! Here is no workspaces in root package.json"`;
} else {
  let commits: Set<string> = new Set();
  const output: Record<string, string> = {};
  const updateCommits = (pkgName: string, prevCommits: Set<string>, newCommits: Set<string>) => {
    const updatedCommits = new Set(Array.from(prevCommits).concat(Array.from(newCommits)));

    if (updatedCommits.size !== prevCommits.size + newCommits.size) {
      throw new Error(`Duplicated commits were found in ${pkgName} package`);
    }
    return updatedCommits;
  };

  await Promise.all(workspacesParsed.map(async ([name, directory]) => {
    const newCommits = new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- ${directory}`).stdout.split('\n'));

    commits = updateCommits(name, commits, newCommits);

    if (newCommits.size) output[name] = directory;
  }));

  const excludedDirs = Object.values(workspacesConfig).map(s => `:!${s}`);

  commits = updateCommits(rootPkgName, commits, new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- . ${excludedDirs}`).stdout.split('\n')));
  await $`echo "OK! No duplicated commits here"`;
  console.log(JSON.stringify(output));
}
