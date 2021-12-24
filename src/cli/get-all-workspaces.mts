#!/usr/bin/env node

import { fs } from 'zx';
import getAllWorkspacesIfAny from '../get-all-workspaces-if-any.mjs';

const workspacesConfig = await getAllWorkspacesIfAny();

if (workspacesConfig) {
  await fs.outputJson('/tmp/all-workspaces.json', workspacesConfig);
}
