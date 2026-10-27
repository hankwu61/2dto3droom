import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {recognizeRemote,analysisBudget} from '../src/recognition-client.js';
import {streamAnalysis} from '../analysis-stream.js';
import {AnalysisError} from '../analyze.js';
import {demoPlan} from '../src/model.js';
const streamed=text=>new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(text);for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}),{headers:{'content-type':'application/x-ndjson'}});
test('streaming client handles UTF-8 split across chunks and delivers final plan',async()=>{
 const updates=[],plan=demoPlan();let request;
 const result=await recognizeRemote({width:12},{onProgress:e=>updates.push(e.label),fetchImpl:async(url,options)=>{request=options;return streamed(JSON.stringify({type:'progress',label:'第 1 輪：辨識'})+'\n'+JSON.stringify({type:'result',plan}));}});
 assert.deepEqual(result,plan);assert.deepEqual(updates,['第 1 輪：辨識']);assert.match(request.headers.Accept,/ndjson/);
 assert.ok(analysisBudget(600000,true)>4*600000);assert.ok(analysisBudget(900000,false)>3*900000);
});
test('stream errors preserve actionable quota status and request ID; incomplete streams fail',async()=>{
 await assert.rejects(recognizeRemote({},{fetchImpl:async()=>streamed(JSON.stringify({type:'error',code:'CLI_QUOTA',status:429,error:'額度不足',requestId:'test-id'})+'\n')}),e=>e.code==='CLI_QUOTA'&&e.status===429&&e.message.includes('test-id'));
 await assert.rejects(recognizeRemote({},{fetchImpl:async()=>streamed('{"type":"progress"}\n')}),/未收到完整配置/);
 assert.deepEqual(await recognizeRemote({},{fetchImpl:async()=>Response.json(demoPlan())}),demoPlan());
});
function response(){const res=new EventEmitter();res.frames=[];res.setTimeout=()=>{};res.status=()=>res;res.set=()=>res;res.flushHeaders=()=>{};res.write=text=>res.frames.push(JSON.parse(text));res.end=()=>{res.writableEnded=true;};return res;}
test('server streams real phases followed by structured results and errors',async()=>{
 const res=response();await streamAnalysis(null,res,async({onProgress})=>{onProgress({stage:'review',label:'核對'});return demoPlan();},'test');
 assert.equal(res.frames[1].stage,'review');assert.equal(res.frames.at(-1).type,'result');assert.equal(res.writableEnded,true);
 const failed=response();await streamAnalysis(null,failed,async()=>{throw new AnalysisError('額度不足','CLI_QUOTA',429);},'test');assert.equal(failed.frames.at(-1).status,429);
});
test('closing browser response aborts the running CLI',async()=>{
 const res=response();let aborted=false;
 await streamAnalysis(null,res,({signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>{aborted=true;reject(new AnalysisError('取消','CANCELED',499));},{once:true});res.destroyed=true;res.emit('close');
 }),'test');assert.equal(aborted,true);
});
