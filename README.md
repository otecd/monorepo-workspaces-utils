# monorepo-workspaces-utils
Helpful scripts to work with workspaces packages on monorepo

## Requirements
- nodejs: v16

## How to use
### __check-commits-uniqueness__
Check commits history between workspaces and optionally root package.
#### Arguments
- --rootIsPackage - let script to check root pkg commits history separately too

#### Example:
```sh
$ npx -p monorepo-workspaces-utils@1.3.0 check-commits-uniqueness main
```
