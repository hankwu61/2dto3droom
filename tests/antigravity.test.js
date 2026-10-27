import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {accountOnlyEnv,analyzeWithAntigravity,parseAntigravityOutput} from '../antigravity.js';
import {demoPlan} from '../src/model.js';
import {visionConfig} from '../vision.js';
test('Antigravity configuration never selects an API credential',()=>{
 const c=visionConfig({AI_PROVIDER:'antigravity',GEMINI_API_KEY:'private'});assert.equal(c.key,undefined);assert.equal(c.model,'claude-opus-4-6-thinking');
 assert.deepEqual(accountOnlyEnv({PATH:'path',GEMINI_API_KEY:'x',OPENROUTER_API_KEY:'y',LOCALAPPDATA:'local'}),{PATH:'path',LOCALAPPDATA:'local'});
});
test('official CLI result validates geometry and rejects non-success',()=>{
 assert.equal(parseAntigravityOutput(JSON.stringify({status:'SUCCESS',response:JSON.stringify(demoPlan())})).plan.walls.length,6);
 assert.throws(()=>parseAntigravityOutput(JSON.stringify({status:'WAITING',response:''})),/任務未完成/);
 assert.throws(()=>parseAntigravityOutput('not JSON'),/格式無效/);
 assert.throws(()=>parseAntigravityOutput(JSON.stringify({status:'SUCCESS',response:'',denied_actions:[{action:'read_file'}]})),e=>e.code==='CLI_PERMISSION');
});
test('CLI commentary is accepted but only the final JSON draft is validated',()=>{
 const content='Image analysis.\n```json\n'+JSON.stringify(demoPlan())+'\n```\nDone.';
 assert.equal(parseAntigravityOutput(JSON.stringify({status:'SUCCESS',response:content})).plan.walls.length,6);
 assert.throws(()=>parseAntigravityOutput(JSON.stringify({status:'SUCCESS',response:content+'\n```json\n{"walls":[]}\n```'})));
});
test('CLI receives a scoped image workspace, pinned model, no auto-approval, and cleans up',async()=>{
 let directory;
 const config=visionConfig({AI_PROVIDER:'antigravity'});
 const result=await analyzeWithAntigravity({image:'data:image/png;base64,aGVsbG8=',width:12,config,run:async(file,args,options)=>{
  directory=options.cwd;assert(args.includes('claude-opus-4-6-thinking'));assert(!args.includes('--dangerously-skip-permissions'));assert.equal(options.windowsHide,true);
  assert.equal(await readFile(path.join(directory,'floorplan.png'),'utf8'),'hello');assert.equal(options.env.GEMINI_API_KEY,undefined);
  return {stdout:JSON.stringify({status:'SUCCESS',response:JSON.stringify(demoPlan())})};
 }});
 assert.equal(result.analysis.provider,'antigravity');await assert.rejects(access(directory));
});
test('CLI timeout and installation errors are actionable',async()=>{
 const args={image:'data:image/png;base64,aGVsbG8=',width:12,config:visionConfig({AI_PROVIDER:'antigravity'})};
 await assert.rejects(analyzeWithAntigravity({...args,run:async()=>{throw Object.assign(Error(),{killed:true});}}),e=>e.status===504);
 await assert.rejects(analyzeWithAntigravity({...args,run:async()=>{throw Object.assign(Error(),{code:'ENOENT'});}}),e=>e.code==='CLI_MISSING');
});
test('CLI error exit reports quota separately and timeout follows provider configuration',async()=>{
 const config=visionConfig({AI_PROVIDER:'antigravity',ANTIGRAVITY_TIMEOUT_SECONDS:'900'});
 await assert.rejects(analyzeWithAntigravity({image:'data:image/png;base64,aGVsbG8=',width:12,config,run:async(file,args,options)=>{
  assert.equal(options.timeout,905000);assert.equal(args[args.indexOf('--print-timeout')+1],'900s');
  throw Object.assign(Error(),{code:3,stdout:JSON.stringify({status:'ERROR',error:'Individual quota reached. Resets in 2h.'})});
 }}),e=>e.code==='CLI_QUOTA'&&e.status===429);
 assert.throws(()=>parseAntigravityOutput(JSON.stringify({status:'RUNNING',response:''})),e=>e.code==='TIMEOUT');
});
