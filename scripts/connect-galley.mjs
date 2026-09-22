import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { apiClient, credentials } from './galley.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'assets/galley.json'), 'utf8'));
  const saved = credentials(config);
  await apiClient(saved).json('/v1/docs');
  // stdin avoids ever putting the token in shell arguments, logs, or the repository.
  const result = spawnSync('gh', ['secret', 'set', 'GALLEY_TOKEN', '--repo', 'angadjosan/angadjosan.github.io'], { input: saved.token, encoding: 'utf8' });
  if (result.error) throw new Error('Install and sign in to the GitHub CLI before connecting.');
  if (result.status !== 0) throw new Error('GitHub could not save the Galley connection. Check gh auth status and repository access.');
  console.log('Galley connection saved as the GALLEY_TOKEN repository secret.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
