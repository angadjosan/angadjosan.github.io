import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import he from 'he';

const markdown = new Marked({ gfm: true });
const imageTypes = new Map([['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/gif', 'gif'], ['image/webp', 'webp'], ['image/avif', 'avif']]);
const maxDocumentBytes = 4 * 1024 * 1024;
const maxImageBytes = 15 * 1024 * 1024;

export function credentials(config, env = process.env) {
  if (env.GALLEY_TOKEN) return { server: config.server, token: env.GALLEY_TOKEN };
  // CI must never accidentally fall back to a developer's credentials.
  if (env.CI) throw new Error('Set the GALLEY_TOKEN repository secret before syncing Galley.');
  const filename = env.GALLEY_CONFIG || path.join(os.homedir(), '.galley/config.json');
  if (!fs.existsSync(filename)) throw new Error('Sign in with Galley’s CLI first, or set GALLEY_TOKEN.');
  const saved = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (new URL(saved.server).origin !== new URL(config.server).origin) throw new Error('Saved Galley login belongs to a different server.');
  if (!saved.token) throw new Error('The saved Galley login has no token.');
  return { server: config.server, token: saved.token };
}

export function apiClient({ server, token, fetchImpl = fetch }) {
  const base = new URL(server);
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Galley requires HTTPS.');
  async function request(route, limit) {
    if (!route.startsWith('/v1/')) throw new Error('Invalid Galley API route.');
    const response = await fetchImpl(new URL(route, base), {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Galley returned HTTP ${response.status}; the existing site has not been changed.`);
    if (Number(response.headers.get('content-length')) > limit) throw new Error('Galley response exceeds the size limit.');
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.byteLength;
      if (length > limit) throw new Error('Galley response exceeds the size limit.');
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), mediaType: response.headers.get('content-type')?.split(';')[0] };
  }
  return {
    async json(route) { const { bytes } = await request(route, maxDocumentBytes); return JSON.parse(bytes.toString('utf8')); },
    async image(id) { return request(`/v1/assets/${encodeURIComponent(id)}`, maxImageBytes); },
  };
}

export function publication(checkpoints, config) {
  const events = checkpoints.filter(c => [config.publishCheckpoint, config.unpublishCheckpoint].includes(c.name));
  for (const c of events) {
    if (!Number.isFinite(Date.parse(c.at)) || !Number.isSafeInteger(c.ticket) || c.ticket < 0) throw new Error('Invalid Galley publication version.');
  }
  // Array order breaks ties: Galley's checkpoints are returned in insertion order.
  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.ticket - b.ticket);
  const latest = events.at(-1);
  if (!latest || latest.name === config.unpublishCheckpoint) return null;
  return { latest, first: events.find(c => c.name === config.publishCheckpoint) };
}

export function cleanHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup', 'br', 'hr', 'a', 'img', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input'],
    allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'title', 'loading', 'decoding'], ol: ['start'], th: ['align'], td: ['align'], code: ['class'], input: ['type', 'checked', 'disabled'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'] },
    allowedClasses: { code: [/^language-[a-z0-9_-]+$/] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      h1: 'h2',
      a: (tagName, attrs) => ({ tagName, attribs: { ...attrs, rel: 'noopener noreferrer' } }),
      input: (tagName, attrs) => ({ tagName, attribs: { type: 'checkbox', disabled: '', ...(Object.hasOwn(attrs, 'checked') ? { checked: '' } : {}) } }),
      img: (tagName, attrs) => ({ tagName, attribs: { ...attrs, loading: 'lazy', decoding: 'async' } }),
    },
    // An imported image must be a copied Galley asset or an HTTPS public image.
    exclusiveFilter: frame => frame.tag === 'img' && !/^(?:https:\/\/|\/assets\/galley\/)/.test(frame.attribs.src || ''),
  });
}

export function cleanIntroHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup', 'code'],
    allowedAttributes: { a: ['href', 'title', 'rel'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { a: (tagName, attrs) => ({ tagName, attribs: { ...attrs, rel: 'noopener noreferrer' } }) },
  });
}

// Galley's clean Markdown still includes its YAML identity/owner preamble.
// Remove only a delimited block at the start; preserve body horizontal rules.
function documentBody(content) {
  return content.replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/, '');
}

export function renderIntro(content, name = 'INTRO') {
  if (typeof content !== 'string') throw new Error('Galley returned an invalid INTRO document.');
  const tokens = markdown.lexer(documentBody(content));
  const first = tokens.find(t => t.type !== 'space');
  // Galley uses the first heading as the document name. It is not intro copy.
  if (first?.type === 'heading' && plainInline(first.text).toLowerCase() === name.toLowerCase()) tokens.splice(tokens.indexOf(first), 1);
  const html = cleanIntroHtml(markdown.parser(tokens));
  if (!sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim()) throw new Error('INTRO needs some introduction text before it can be published.');
  return html;
}

function plainInline(text) {
  return he.decode(sanitizeHtml(markdown.parseInline(text), { allowedTags: [], allowedAttributes: {} })).replace(/\s+/g, ' ').trim();
}

export async function renderArticle(content, { server, getImage, assetFiles }) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('The published Galley version is empty.');
  const tokens = markdown.lexer(documentBody(content));
  const first = tokens.find(t => t.type !== 'space');
  // Title comes from the published snapshot, never from a later draft's metadata.
  if (first?.type !== 'heading' || first.depth !== 1) throw new Error('Give the article a Heading 1 title in Galley before publishing.');
  const title = plainInline(first.text);
  tokens.splice(tokens.indexOf(first), 1);
  const paragraph = tokens.find(t => t.type === 'paragraph' && plainInline(t.text));
  const summaryText = paragraph ? plainInline(paragraph.text) : title;
  const summary = summaryText.length > 200 ? summaryText.slice(0, 197).replace(/\s+\S*$/, '') + '…' : summaryText;
  const headingIds = new Set();
  const headingRenderer = new Marked({ gfm: true, renderer: {
    heading({ tokens: inlineTokens, depth, text }) {
      const base = plainInline(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
      let id = base, n = 2;
      while (headingIds.has(id)) id = `${base}-${n++}`;
      headingIds.add(id);
      const level = Math.max(2, depth);
      return `<h${level} id="${id}">${this.parser.parseInline(inlineTokens)}</h${level}>\n`;
    },
  } });
  const work = [];
  markdown.walkTokens(tokens, token => {
    if (token.type === 'code' && /^(mermaid|galley-design|design)(?:\s|$)/i.test(token.lang || '')) {
      throw new Error('Export diagrams or design canvases as an image before publishing this article.');
    }
    if (token.type !== 'image') return;
    const target = new URL(token.href, server);
    const ownAsset = target.origin === new URL(server).origin && /^\/v1\/assets\/[a-zA-Z0-9_-]+$/.test(target.pathname) && !target.search;
    if (ownAsset) {
      const id = target.pathname.split('/').at(-1);
      work.push((async () => {
        const image = await getImage(id);
        const extension = imageTypes.get(image.mediaType);
        if (!extension) throw new Error('A Galley image has an unsupported format. Use PNG, JPEG, GIF, WebP, or AVIF.');
        const name = `${createHash('sha256').update(image.bytes).digest('hex')}.${extension}`;
        assetFiles.set(name, image.bytes);
        token.href = `/assets/galley/${name}`;
      })());
    } else if (!/^https:\/\//.test(token.href) || target.origin === new URL(server).origin || target.username || target.password) {
      throw new Error('Use an image uploaded to Galley or a public HTTPS image URL.');
    }
  });
  await Promise.all(work);
  const html = cleanHtml(headingRenderer.parser(tokens));
  if (!title || !html.trim()) throw new Error('A blog post needs a title and a body.');
  return { title, summary, html };
}

export async function collectPosts(api, config) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.project || '')) throw new Error('Set the Galley project path before syncing.');
  const { projects } = await api.json('/v1/projects');
  if (!Array.isArray(projects) || !projects.some(p => p.path === config.project)) throw new Error(`Galley project "${config.project}" is missing or inaccessible. The existing site has not been changed.`);
  const prefix = `${config.project}/`;
  const { documents } = await api.json(`/v1/docs?prefix=${encodeURIComponent(prefix)}`);
  if (!Array.isArray(documents)) throw new Error('Galley returned an invalid document list.');
  const posts = [], assetFiles = new Map(), ids = new Set();
  const scoped = documents.filter(doc => typeof doc.path === 'string' && doc.path.startsWith(prefix));
  const introName = config.introDocument || 'INTRO';
  const intros = scoped.filter(doc => doc.title?.trim().toLowerCase() === introName.toLowerCase() || doc.path.slice(prefix.length).replace(/\.md$/i, '').toLowerCase() === introName.toLowerCase());
  if (intros.length > 1) throw new Error(`Keep exactly one ${introName} document in the ${config.project} project.`);
  let introHtml = null;
  for (const doc of scoped) {
    if (!/^[a-zA-Z0-9_-]+$/.test(doc.docId) || ids.has(doc.docId)) throw new Error('Invalid or duplicate Galley document id.');
    ids.add(doc.docId);
    const ref = encodeURIComponent(doc.docId);
    if (doc === intros[0]) {
      const snapshot = await api.json(`/v1/docs/${ref}`);
      introHtml = renderIntro(snapshot.content, introName);
      continue;
    }
    const history = await api.json(`/v1/docs/${ref}/history?limit=1`);
    if (!Array.isArray(history.checkpoints)) throw new Error('Galley returned an invalid publication history.');
    const selected = publication(history.checkpoints, config);
    if (!selected) continue;
    const { revision } = await api.json(`/v1/docs/${ref}/history/${selected.latest.ticket}`);
    if (!revision || typeof revision.content !== 'string' || !Number.isSafeInteger(revision.ticket) || revision.ticket > selected.latest.ticket) throw new Error('Galley could not resolve the published version.');
    const article = await renderArticle(revision.content, { server: config.server, getImage: id => api.image(id), assetFiles });
    // The document id is immutable even when the writer changes the title.
    posts.push({ ...article, slug: `post-${doc.docId.toLowerCase()}`, publishedAt: selected.first.at, updatedAt: selected.latest.at,
      date: new Date(selected.first.at).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }) });
  }
  posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
  return { posts, assetFiles, introHtml };
}
