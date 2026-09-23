import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiClient, credentials, collectPosts } from './galley.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'assets/galley.json'), 'utf8'));
try {
  const result = await collectPosts(apiClient(credentials(config)), config);
  if (!process.argv.includes('--check')) {
    const cache = path.join(root, '.cache');
    fs.mkdirSync(cache, { recursive: true });
    const staging = fs.mkdtempSync(path.join(cache, 'galley-next-'));
    fs.mkdirSync(path.join(staging, 'images'));
    for (const [name, bytes] of result.assetFiles) fs.writeFileSync(path.join(staging, 'images', name), bytes);
    fs.writeFileSync(path.join(staging, 'posts.json'), JSON.stringify(result.posts, null, 2) + '\n');
    fs.writeFileSync(path.join(staging, 'intro.json'), JSON.stringify({ html: result.introHtml }) + '\n');
    const target = path.join(cache, 'galley');
    // All network calls and rendering have succeeded before replacing our generated cache.
    const previous = path.join(cache, 'galley-previous');
    if (fs.existsSync(previous)) fs.rmSync(previous, { recursive: true });
    if (fs.existsSync(target)) fs.renameSync(target, previous);
    try { fs.renameSync(staging, target); }
    catch (error) { if (fs.existsSync(previous)) fs.renameSync(previous, target); throw error; }
    if (fs.existsSync(previous)) fs.rmSync(previous, { recursive: true });
  }
  console.log(`Galley: ${result.posts.length} published posts, ${result.assetFiles.size} images from ${config.project}. INTRO: ${result.introHtml === null ? 'not found; using fallback' : 'synced'}. Portfolio projects are unchanged.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
