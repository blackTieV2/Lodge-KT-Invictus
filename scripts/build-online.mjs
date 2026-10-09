// Allowlist only. Never publish the repository root or private sources as assets.
import { mkdir, rm, copyFile, readdir } from 'node:fs/promises';
const base=new URL('../',import.meta.url),target=new URL('online-dist/',base);
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const [source,dest] of [['web/index.html','index.html'],['web/ui.js','ui.js'],['web/online.css','online.css'],['app/core.js','core.js'],['app/styles.css','styles.css']]) await copyFile(new URL(source,base),new URL(dest,target));
if((await readdir(target)).length!==5)throw Error('Unexpected public asset.');
console.log('Online asset bundle built: 5 code-only files. No private data bundled.');
