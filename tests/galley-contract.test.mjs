import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { apiClient, collectPosts } from '../scripts/galley.mjs';

test('real Galley server: publish snapshot, preserve draft, copy image, then unpublish', { skip: !process.env.GALLEY_CHECKOUT }, async () => {
  const checkout = process.env.GALLEY_CHECKOUT;
  const require = createRequire(path.join(checkout, 'package.json'));
  const { register } = await import(pathToFileURL(require.resolve('tsx/esm/api')).href);
  const unregister = register();
  const { build } = await import(pathToFileURL(path.join(checkout, 'packages/server/src/server.ts')).href);
  const server = build({ file: ':memory:' });
  try {
    await server.app.ready();
    server.store.createWorkspace('default', 'Publisher test');
    server.store.upsertPrincipal({ id:'writer', workspaceId:'default', kind:'human', name:'Test writer' });
    server.store.setGrants('writer',[{path:'/',capability:'admin'}]);
    const writer=server.auth.issueForHuman('writer',{label:'fixture',scope:[{path:'/',capability:'admin'}]});
    const reader=server.auth.issueForHuman('writer',{label:'publisher',scope:[{path:'/',capability:'read'}]});
    async function mutate(url,body) {
      const response=await server.app.inject({method:'POST',url,headers:{authorization:`Bearer ${writer}`},payload:body});
      assert(response.statusCode<300,`${response.statusCode}: ${response.body}`);return response.json();
    }
    const doc=await mutate('/v1/docs',{path:'blog/fixture',content:'# Published title\n\nThe published paragraph.'});
    const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    const asset=await mutate(`/v1/docs/${doc.docId}/assets`,{data:png});
    await mutate(`/v1/docs/${doc.docId}/ingest`,{content:`# Published title\n\nThe published paragraph.\n\n![Picture](${asset.url})`});
    const config={server:'http://127.0.0.1',publishCheckpoint:'Publish to angadjosan.com',unpublishCheckpoint:'Unpublish from angadjosan.com'};
    await mutate(`/v1/docs/${doc.docId}/checkpoints`,{name:config.publishCheckpoint});
    await mutate(`/v1/docs/${doc.docId}/ingest`,{content:'# Private draft title\n\nDo not publish this text.'});
    const api=apiClient({server:config.server,token:reader,fetchImpl:async(url,init)=>{
      const response=await server.app.inject({method:'GET',url:new URL(url).pathname+new URL(url).search,headers:init.headers});
      return new Response(response.rawPayload,{status:response.statusCode,headers:response.headers});
    }});
    const result=await collectPosts(api,config);
    assert.equal(result.posts.length,1);assert.equal(result.posts[0].title,'Published title');assert(result.posts[0].html.includes('published paragraph'));
    assert(!result.posts[0].html.includes('Do not publish'));assert.equal(result.assetFiles.size,1);
    await mutate(`/v1/docs/${doc.docId}/checkpoints`,{name:config.unpublishCheckpoint});
    assert.equal((await collectPosts(api,config)).posts.length,0);
  } finally { await server.close(); unregister(); }
});
