import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanHtml} from './galley.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'assets',name),'utf8'));
const outputArgument=process.argv.indexOf('--out');
const output=outputArgument===-1?root:path.resolve(root,process.argv[outputArgument+1]||'_site');
if(output!==root&&output!==path.join(root,'_site'))throw Error('Build output must be the project root or _site.');
if(output!==root){fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});}
const cache=path.join(root,'.cache/galley');
const imported=fs.existsSync(path.join(cache,'posts.json'))?JSON.parse(fs.readFileSync(path.join(cache,'posts.json'),'utf8')):[];
const projects=read('projects.json'), posts=[...imported,...read('writing.json')];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validate(items,type){const ids=new Set();for(const item of items){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||ids.has(item.slug))throw Error(`Invalid or duplicate ${type} slug`);ids.add(item.slug);if(!item.title||!item.summary)throw Error(`${type} requires title and summary`);if(type==='project'&&!['apps','inference'].includes(item.category))throw Error('Project category must be apps or inference');for(const key of ['image','demo','github','website'])if(item[key]&&!/^(https?:\/\/|\/?[a-zA-Z0-9][a-zA-Z0-9_./-]*$)/.test(item[key]))throw Error(`Invalid ${key}`);}}
validate(projects,'project');validate(posts,'post');
const social=`<nav class="social" aria-label="Social profiles">${read('profiles.json').map(p=>`<a class="profile-link" href="${esc(p.href)}" aria-label="${esc(p.label)}" title="${esc(p.label)}" ${p.href.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''}>${p.svg}</a>`).join('')}</nav>`;
const footer=`<footer class="footer"><span>Angad Singh Josan</span><nav aria-label="Footer"><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy-policy.html">Privacy</a><a href="mailto:angadjosan@outlook.com">Email <span class="arrow diagonal" aria-hidden="true">↗</span></a></nav></footer>`;
const header=current=>`<header class="site-header"><nav class="site-nav" aria-label="Main navigation"><a class="home-link" href="/" ${current==='home'?'aria-current="page"':''}>Home</a><div class="site-nav-links"><a href="/projects.html" ${current==='projects'?'aria-current="page"':''}>Projects</a><a href="/writing.html" ${current==='writing'?'aria-current="page"':''}>Writing</a><a class="resume-link" href="/resume.pdf">Résumé <span class="arrow diagonal" aria-hidden="true">↗</span></a></div></nav></header>`;
function page(title,body,current='',home=false){return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(title)} — Personal portfolio of Angad Singh Josan, EECS at UC Berkeley."><meta name="author" content="Angad Singh Josan"><title>${esc(title)}${home?'':' · Angad Singh Josan'}</title><meta name="theme-color" content="#fcfbf8"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"></head><body><a class="skip" href="#main">Skip to content</a>${header(home?'home':current)}<div class="shell">${body}${footer}</div></body></html>\n`;}
const empty=text=>`<div class="empty"><p>${text}</p></div>`;
const projectLink=p=>`/projects/${p.slug}.html`;
const postLink=p=>`/writing/${p.slug}.html`;
function projectRow(p){return `<article class="project-row"><a class="thumbnail" href="${projectLink(p)}" aria-label="View ${esc(p.title)}">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.imageAlt||p.title+' preview')}" loading="lazy">`:`<span aria-hidden="true">${esc(p.title.slice(0,1))}</span>`}</a><div>${p.date?`<p class="eyebrow">${esc(p.date)}</p>`:''}<h3><a href="${projectLink(p)}">${esc(p.title)}</a></h3><p class="summary">${esc(p.summary)}</p><a class="text-link" href="${p.demo?esc(p.demo):projectLink(p)}">${p.demo?'Watch demo':'View project'} <span class="arrow ${p.demo?'diagonal':''}" aria-hidden="true">${p.demo?'↗':'→'}</span></a></div></article>`;}
function groups(preview=false){return ['apps','inference'].map(category=>{let items=projects.filter(p=>p.category===category);if(preview)items=items.slice(0,2);return `<section class="group ${items.length?'':'group-empty'}" id="${category}" aria-labelledby="${category}-title"><${preview?'h3':'h2'} class="group-title" id="${category}-title">${category==='apps'?'Apps':'Inference'}</${preview?'h3':'h2'}>${items.length?items.map(projectRow).join(''):empty('Projects will appear here soon.')}</section>`}).join('');}
function writing(preview=false){const items=preview?posts.slice(0,3):posts;return items.length?items.map(p=>`<article class="writing-row">${p.date?`<p class="eyebrow">${esc(p.date)}</p>`:''}<h3><a href="${postLink(p)}">${esc(p.title)}</a></h3><p class="summary">${esc(p.summary)}</p><a class="text-link" href="${postLink(p)}">Read post <span class="arrow" aria-hidden="true">→</span></a></article>`).join(''):empty('No posts published yet.');}
function write(name,html){const dest=path.join(output,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);}
write('index.html',page('Angad Singh Josan',`<header class="masthead"><div class="identity"><img class="portrait" src="/images/headshot-4x.jpg" width="176" height="210" alt="Angad Singh Josan"><div><h1>Angad Singh Josan</h1><p class="subtitle">EECS @ UC Berkeley</p>${social}</div></div></header><main id="main"><div class="intro"><p>I’m an entrepreneur and builder studying EECS at UC Berkeley, with a focus on AI across image, voice, text, and agent systems. I like learning quickly and working on meaningful problems. My interests span software engineering, product thinking, business operations, and finance.</p></div><section class="section" aria-labelledby="projects-title"><div class="section-heading"><h2 id="projects-title"><span class="section-number" aria-hidden="true">01</span> Projects</h2><a href="/projects.html">All projects <span class="arrow" aria-hidden="true">→</span></a></div>${groups(true)}</section><section class="section" aria-labelledby="writing-title"><div class="section-heading"><h2 id="writing-title"><span class="section-number" aria-hidden="true">02</span> Writing</h2><a href="/writing.html">All writing <span class="arrow" aria-hidden="true">→</span></a></div>${writing(true)}</section></main>`,'',true));
write('projects.html',page('Projects',`<main class="inner-page" id="main"><div class="page-intro"><h1>Projects</h1><p>Apps and experiments in inference.</p><nav class="subnav" aria-label="Project categories"><a href="#apps">Apps</a><a href="#inference">Inference</a></nav></div><div class="section">${groups()}</div></main>`,'projects'));
write('writing.html',page('Writing',`<main class="inner-page" id="main"><div class="page-intro"><h1>Writing</h1><p>Notes, ideas, and things I’m learning.</p></div><section class="section" aria-label="Blog posts">${writing()}</section></main>`,'writing'));
for(const p of projects){write(`projects/${p.slug}.html`,page(p.title,`<main id="main"><div class="page-intro"><a class="back" href="/projects.html">← All projects</a><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p></div><article class="prose">${p.image?`<img class="detail-image" src="${esc(p.image)}" alt="${esc(p.imageAlt||p.title+' preview')}">`:''}${(p.body||[]).map(t=>`<p>${esc(t)}</p>`).join('')}<div class="project-links">${['demo','github','website'].filter(k=>p[k]).map(k=>`<a href="${esc(p[k])}">${{demo:'Watch demo',github:'GitHub',website:'Visit website'}[k]} ↗</a>`).join('')}</div></article></main>`,'projects'));}
for(const p of posts){write(`writing/${p.slug}.html`,page(p.title,`<main id="main"><div class="page-intro"><a class="back" href="/writing.html">← All writing</a><h1>${esc(p.title)}</h1>${p.date?`<p>${esc(p.date)}</p>`:''}</div><article class="prose">${p.html?cleanHtml(p.html):(p.body||[]).map(t=>`<p>${esc(t)}</p>`).join('')}</article></main>`,'writing'));}
// Only remove obsolete article files produced by this generator.
const writingDir=path.join(output,'writing');
const expectedPosts=new Set(posts.map(p=>`${p.slug}.html`));
if(fs.existsSync(writingDir))for(const name of fs.readdirSync(writingDir)){
  if(!expectedPosts.has(name)&&name.endsWith('.html')&&fs.readFileSync(path.join(writingDir,name),'utf8').includes('<!-- generated-blog -->'))fs.unlinkSync(path.join(writingDir,name));
}
for(const name of expectedPosts){const file=path.join(writingDir,name);fs.appendFileSync(file,'<!-- generated-blog -->\n');}
const imageOutput=path.join(output,'assets/galley');
if(fs.existsSync(imageOutput))fs.rmSync(imageOutput,{recursive:true});
if(fs.existsSync(path.join(cache,'images')))fs.cpSync(path.join(cache,'images'),imageOutput,{recursive:true});
for(const name of ['about.html','contact.html','privacy-policy.html']){
  let html=fs.readFileSync(path.join(root,name),'utf8');
  html=html.replace(/<header class="(?:compact-header|site-header)">[\s\S]*?<\/header>/,'');
  html=html.replace('<div class="shell">',`${header('')}<div class="shell">`);
  write(name,html);
}
// Keep the legacy work URL usable with the same site navigation.
let work=fs.readFileSync(path.join(root,'work.html'),'utf8');
work=work.replace(/<div class="topbar">[\s\S]*?(?=<main)/,header(''));
work=work.replace(/<header class="site-header">[\s\S]*?<\/header>/,header(''));
if(!work.includes('href="/assets/site.css"'))work=work.replace('</head>','<link rel="stylesheet" href="/assets/site.css"></head>');
work=work.replace('class="page" id="top"','class="shell legacy-work" id="top"');
write('work.html',work);
if(output!==root){
  for(const name of ['resume.pdf','CNAME'])fs.copyFileSync(path.join(root,name),path.join(output,name));
  fs.cpSync(path.join(root,'images'),path.join(output,'images'),{recursive:true});
  fs.mkdirSync(path.join(output,'assets'),{recursive:true});
  for(const name of ['site.css','favicon.svg'])fs.copyFileSync(path.join(root,'assets',name),path.join(output,'assets',name));
  fs.writeFileSync(path.join(output,'.nojekyll'),'');
}
console.log(`Built home, projects, writing, ${projects.length} project pages, and ${posts.length} posts.`);
