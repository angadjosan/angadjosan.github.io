import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, publication, renderArticle, collectPosts, cleanHtml } from '../scripts/galley.mjs';
const config = { server: 'https://galley.example', publishCheckpoint: 'Publish to angadjosan.com', unpublishCheckpoint: 'Unpublish from angadjosan.com' };
const event = (name, ticket, at = `2026-09-${String(ticket).padStart(2,'0')}T12:00:00Z`) => ({name, ticket, at});
const publicationEvent = event(config.publishCheckpoint, 2);
const render = (content, opts = {}) => renderArticle(content, {server:config.server, assetFiles:new Map(), getImage:async()=>{throw Error('Unexpected image request');}, ...opts});

test('drafts and unrelated checkpoints do not publish; latest publish/unpublish wins', () => {
  assert.equal(publication([],config), null);
  assert.equal(publication([event('Draft',1)],config), null);
  assert.equal(publication([publicationEvent,event(config.unpublishCheckpoint,3)],config),null);
  const result=publication([event(config.publishCheckpoint,4),event(config.unpublishCheckpoint,3),publicationEvent],config);
  assert.equal(result.latest.ticket,4);assert.equal(result.first.ticket,2);
});

test('renders visual-editor text, formatting, lists, tables, links, and code', async () => {
  const post=await render('# Hello **world** & friends\n\nThis is **bold**, *italic*, and a [link](https://example.com).\n\n## Details\n\n- One\n- Two\n\n> Quote\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n- [x] Done');
  assert.equal(post.title,'Hello world & friends');assert.equal(post.summary,'This is bold, italic, and a link.');
  for(const expected of ['<strong>bold</strong>','<em>italic</em>','<h2 id="details">','<table>','<blockquote>','language-js','type="checkbox"','disabled'])assert(post.html.includes(expected),expected);
  assert(!post.html.includes('<h1>'));
});

test('removes scripts, event handlers, unsafe links and editor metadata',async()=>{
  const post=await render('# Safe\n\nHello <!-- @block-id:secret -->\n\n<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="bad()">link</a>\n\n<iframe src="https://example.com"></iframe>');
  assert(!/script|onclick|iframe|@block-id|javascript/.test(post.html));
  assert.equal(cleanHtml('<img src="//evil.example/x" onerror="bad()"><input type="text" value="secret">'),'<input type="checkbox" disabled />');
});

test('copies authenticated images into stable public files; never leaves private asset URLs',async()=>{
  const files=new Map(), seen=[];
  const post=await render('# Picture\n\n![Diagram](/v1/assets/abc123)',{assetFiles:files,getImage:async id=>{seen.push(id);return {bytes:Buffer.from('image'),mediaType:'image/png'}}});
  assert.deepEqual(seen,['abc123']);assert.equal(files.size,1);assert.match(post.html,/src="\/assets\/galley\/[a-f0-9]{64}\.png"/);assert(!post.html.includes('/v1/assets'));
});

test('rejects private/non-HTTPS image paths and unsupported designs instead of broken posts',async()=>{
  for(const source of ['./private.png','http://example.com/a.png','javascript:alert(1)','https://galley.example/private'])await assert.rejects(render(`# Title\n\n![Image](${source})`));
  await assert.rejects(render('# Title\n\n```mermaid\ngraph TD; A-->B\n```'),/Export diagrams/);
  await assert.rejects(render('Missing title'),/Heading 1/);
  await assert.rejects(render('# Title'),/title and a body/);
});

test('imports the selected snapshot, not the current draft, and keeps URLs stable',async()=>{
  const routes=[];
  const api={json:async route=>{
    routes.push(route);
    if(route==='/v1/docs')return {documents:[{docId:'ABC123',title:'Unpublished title'},{docId:'DRAFT',title:'Secret draft'}]};
    if(route==='/v1/docs/ABC123/history?limit=1')return {checkpoints:[publicationEvent]};
    if(route==='/v1/docs/DRAFT/history?limit=1')return {checkpoints:[]};
    if(route==='/v1/docs/ABC123/history/2')return {revision:{ticket:1,content:'# Published title\n\nPublished body'}};
    throw Error(`Unexpected route ${route}`);
  }};
  const result=await collectPosts(api,config);
  assert.equal(result.posts.length,1);assert.equal(result.posts[0].title,'Published title');assert.equal(result.posts[0].slug,'post-abc123');
  assert(!routes.includes('/v1/docs/ABC123'));assert(!JSON.stringify(result).includes('Secret draft'));
});

test('a failed document read fails the whole sync instead of deleting published posts',async()=>{
  const api={json:async route=>{if(route==='/v1/docs')return {documents:[{docId:'ABC'}]};throw Error('HTTP 503')}};
  await assert.rejects(collectPosts(api,config),/503/);
});

test('API requests keep credentials on the configured origin and do not follow redirects',async()=>{
  let request;
  const api=apiClient({server:config.server,token:'test-secret',fetchImpl:async(url,options)=>{request={url:String(url),options};return new Response('{"documents":[]}',{headers:{'content-type':'application/json'}})}});
  await api.json('/v1/docs');assert.equal(request.url,'https://galley.example/v1/docs');assert.equal(request.options.redirect,'error');assert.equal(request.options.headers.Authorization,'Bearer test-secret');
  await assert.rejects(api.json('https://evil.example'),/Invalid/);
});
