#!/usr/bin/env zx

import { $, argv, nothrow, fs } from 'zx';

const [, GIT_REV_TO_COMPARE] = argv._;

if (!GIT_REV_TO_COMPARE) {
  throw new Error('Required argument is missed. You have to type a git revision to compare with it')
}

const origRev = (await $ `git rev-parse --short @`).toString().trim();

await $ `git checkout -f ${GIT_REV_TO_COMPARE}`;
await $ `git checkout -f ${origRev}`;

const workspacesConfig: Record<string, string> = JSON.parse((await nothrow($`npm pkg get repository.directory --ws --json`)).stdout) || {};
const workspacesParsed = Object.entries(workspacesConfig);
const rootPkgName: string = JSON.parse((await $`npm pkg get name --json`).stdout);

if (!workspacesParsed || !workspacesParsed.length) {
  await $`echo "OK! Here is no workspaces in root package.json"`;
} else {
  let commits: Set<string> = new Set();
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
    const newCommits = Array.from(new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- ${directory}`).stdout.split('\n')));

    commits = updateCommits({ pkgName: name, prevCommits: Array.from(commits), newCommits });
    if (newCommits.length) output[name] = directory;
  }));

  const excludedDirs = Object.values(workspacesConfig).map(s => `:!${s}`);

  commits = updateCommits({
    pkgName: rootPkgName,
    prevCommits: Array.from(commits),
    newCommits: Array.from(new Set((await $`git log @...${GIT_REV_TO_COMPARE} --pretty=format:"%h" -- . ${excludedDirs}`).stdout.split('\n'))),
  });
  await $`echo "OK! No duplicated commits here"`;
  await fs.outputJson('/tmp/check-commits-uniqueness-log.json', output);
}
