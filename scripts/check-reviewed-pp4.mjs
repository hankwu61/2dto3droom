import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);let round=0;
import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {analyzeWithAntigravity} from '../antigravity.js';
import {visionConfig} from '../vision.js';
const bytes=await readFile('public/projects/pp4.jpg');
try{const p=await analyzeWithAntigravity({image:'data:image/jpeg;base64,'+bytes.toString('base64'),width:12,depth:9.744,imageWidth:1000,imageHeight:812,autoScale:true,config:visionConfig(),run:async(...args)=>{const result=await execute(...args);await writeFile(`output/antigravity-round-${++round}.json`,result.stdout);console.log(`Completed CLI call ${round}`);return result;}});await writeFile('output/pp4-antigravity-reviewed.json',JSON.stringify(p,null,2));console.log(JSON.stringify({width:p.width,depth:p.depth,walls:p.walls.length,openings:p.openings.length,furniture:p.furniture.length,scale:p.scale,analysis:p.analysis}));}catch(e){console.error(JSON.stringify({code:e.code,message:e.message}));process.exitCode=1;}
