import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// An isolated fixture proves the complete preview → article pipeline without
// placing sample posts in the real site or writing into the Galley workspace.
test('build publishes blog HTML/previews only, excludes secrets and removes withdrawn articles', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-build-'));
  try {
    fs.cpSync('scripts',path.join(root,'scripts'),{recursive:true});
    fs.cpSync('assets',path.join(root,'assets'),{recursive:true});
    fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
    fs.mkdirSync(path.join(root,'.cache/galley/images'),{recursive:true});
    fs.mkdirSync(path.join(root,'images'));
    for(const name of ['about.html','contact.html','privacy-policy.html','work.html','resume.pdf','CNAME'])fs.copyFileSync(name,path.join(root,name));
    fs.writeFileSync(path.join(root,'.env'),'SECRET=never-publish');
    fs.writeFileSync(path.join(root,'.cache/galley/posts.json'),JSON.stringify([{slug:'post-fixture',title:'Article title',summary:'Preview text',date:'September 21, 2026',html:'<h2>Heading</h2><p>Text <strong>bold</strong>.</p><script>bad()</script>'}]));
    const build=()=>execFileSync(process.execPath,['scripts/build.mjs','--out','_site'],{cwd:root});
    build();
    const output=path.join(root,'_site');
    assert(fs.readFileSync(path.join(output,'index.html'),'utf8').includes('Preview text'));
    assert(fs.readFileSync(path.join(output,'writing.html'),'utf8').includes('Article title'));
    const article=fs.readFileSync(path.join(output,'writing/post-fixture.html'),'utf8');
    assert(article.includes('<strong>bold</strong>'));assert(!article.includes('<script>'));
    assert(!fs.existsSync(path.join(output,'.env')));assert(!fs.existsSync(path.join(output,'.cache')));assert(!fs.existsSync(path.join(output,'node_modules')));
    const projects=fs.readFileSync(path.join(output,'projects.html'),'utf8');
    fs.writeFileSync(path.join(root,'.cache/galley/posts.json'),'[]');build();
    assert(!fs.existsSync(path.join(output,'writing/post-fixture.html')));
    assert.equal(fs.readFileSync(path.join(output,'projects.html'),'utf8'),projects);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
