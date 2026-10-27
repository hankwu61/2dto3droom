import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {analyzeWithCodex,codexCommand,codexFailure,executeCodex} from '../codex.js';
import {visionConfig} from '../vision.js';
import {demoPlan} from '../src/model.js';
const config=visionConfig({AI_PROVIDER:'codex'}),command={file:'test-codex.exe',prefix:[]};
const input={image:'data:image/png;base64,aGVsbG8=',width:12,depth:9,config,command};
const resultFile=args=>args[args.indexOf('--output-last-message')+1];
test('real CLI subprocess receives stdin EOF instead of waiting for the process timeout',async()=>{
 const {stdout}=await executeCodex(process.execPath,['-e',"process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('EOF received'));"],{timeout:3000,encoding:'utf8',windowsHide:true});
 assert.equal(stdout,'EOF received');
});
test('Codex uses saved CLI configuration without selecting a model or API key',()=>{
 assert.equal(config.provider,'codex');assert.equal(config.key,undefined);assert.equal(config.model,null);assert.equal(config.timeoutMs,600000);
 assert.equal(visionConfig({AI_PROVIDER:'codex',CODEX_MODEL:'user-model',CODEX_TIMEOUT_SECONDS:'900'}).model,'user-model');
 assert.throws(()=>visionConfig({AI_PROVIDER:'codex',CODEX_TIMEOUT_SECONDS:'0'}));
});
test('Codex executable discovery supports explicit native and npm JS paths',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'roomform-codex-'));
 try{const exe=path.join(root,'codex.exe'),js=path.join(root,'codex.js');await writeFile(exe,'');await writeFile(js,'');
  assert.deepEqual(codexCommand({CODEX_CLI_PATH:exe}),{file:exe,prefix:[]});
  assert.deepEqual(codexCommand({CODEX_CLI_PATH:js}),{file:process.execPath,prefix:[js]});
  assert.equal(codexCommand({CODEX_CLI_PATH:path.join(root,'missing')}),null);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Codex attaches image, uses read-only mode, verifies twice and cleans up',async()=>{
 let directory,calls=0;const phases=[];
 const plan=await analyzeWithCodex({...input,onProgress:p=>phases.push(p.stage),run:async(file,args,options)=>{
  calls++;directory=options.cwd;assert.equal(file,command.file);assert.equal(options.windowsHide,true);assert.equal(options.timeout,600000);
  assert.equal(args[args.indexOf('--sandbox')+1],'read-only');assert.ok(args.includes('--ephemeral'));assert.ok(!args.includes('--model'));assert.ok(!args.some(a=>a.includes('bypass')));
  assert.equal(options.env.OPENAI_API_KEY,undefined);assert.equal(options.env.CODEX_API_KEY,undefined);
  assert.equal(await readFile(args[args.indexOf('--image')+1],'utf8'),'hello');
  await writeFile(resultFile(args),JSON.stringify(demoPlan()));return {stdout:'events are not final JSON'};
 }});
 assert.equal(calls,2);assert.deepEqual(phases,['plan','review']);assert.equal(plan.analysis.provider,'codex');await assert.rejects(access(directory));
});
test('Codex corrects invalid geometry and never falls back to an older valid draft',async()=>{
 let calls=0;const bad=demoPlan();bad.openings[0].offset=90;
 await assert.rejects(analyzeWithCodex({...input,run:async(file,args)=>{
  calls++;await writeFile(resultFile(args),JSON.stringify(calls===1?demoPlan():bad));return {};
 }}),e=>e.code==='INVALID_PLAN');assert.equal(calls,3);
});
test('Codex automatic scale uses anchors before plan review',async()=>{
 let calls=0;const anchors=[{label:'門',x1:0,y1:0,x2:.1,y2:0,assumedMeters:1.2},{label:'床',x1:.1,y1:.2,x2:.3,y2:.2,assumedMeters:2.4}];
 const p=await analyzeWithCodex({...input,autoScale:true,imageWidth:1200,imageHeight:900,run:async(file,args)=>{
  await writeFile(resultFile(args),JSON.stringify(++calls===1?{anchors}:demoPlan()));return {};
 }});assert.equal(calls,3);assert.ok(Math.abs(p.scale.width-12)<1e-8);assert.equal(p.analysis.estimatedScale,true);
});
test('Codex failures distinguish quota, login, timeout, cancel and buffer overflow',()=>{
 assert.equal(codexFailure({stderr:'usage_limit_reached'},null,600000).status,429);
 assert.equal(codexFailure({stderr:'Not logged in'},null,600000).code,'CLI_AUTH');
 assert.equal(codexFailure({killed:true},null,600000).status,504);
 assert.equal(codexFailure({name:'AbortError'},null,600000).code,'CANCELED');
 assert.equal(codexFailure({code:'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',killed:true},null,600000).code,'CLI_OUTPUT_LIMIT');
});
