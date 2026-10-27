import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeImage,parseCompletion,normalizePlan} from '../analyze.js';
import {demoPlan} from '../src/model.js';
import {visionConfig} from '../vision.js';
const config=visionConfig({AI_PROVIDER:'openrouter',OPENROUTER_API_KEY:'fake-test-key'});
const completion=(p,finish_reason='stop')=>({choices:[{finish_reason,message:{content:typeof p==='string'?p:JSON.stringify(p)}}]});
const response=data=>({ok:true,json:async()=>data});
const input={image:'data:image/png;base64,synthetic',width:12,config};

test('normalizes fenced JSON, numeric strings and missing rotation without mutating source',()=>{
 const p=demoPlan();p.width='12';p.openings[0].wall='0';delete p.furniture[0].rotation;
 const result=parseCompletion(completion('```json\n'+JSON.stringify(p)+'\n```'));
 assert.equal(result.plan.width,12);assert.equal(result.plan.openings[0].wall,0);assert.equal(result.plan.furniture[0].rotation,0);
 assert.equal(p.width,'12');assert.equal(result.warnings.length,1);
});
test('fixes only centimetre boundary precision; rejects substantial opening overflow',()=>{
 const p=demoPlan();p.openings=[{wall:0,type:'door',offset:11.105,width:.9}];
 assert.equal(normalizePlan(p).plan.openings[0].offset,11.1);
 p.openings[0].offset=11.2;assert.throws(()=>normalizePlan(p),/第 1 組門窗/);
});
test('rejects invalid wall indices, malformed items and overlapping openings',()=>{
 const p=demoPlan();p.openings[0].wall=.5;assert.throws(()=>normalizePlan(p),/索引/);
 p.openings=[null];assert.throws(()=>normalizePlan(p),/無效物件/);
 const q=demoPlan();q.openings.push({...q.openings[0]});assert.throws(()=>normalizePlan(q),/重疊/);
});
test('repairs invalid geometry with one extra model call and original image context',async()=>{
 const bad=demoPlan();bad.openings[0].offset=99;const requests=[];
 const result=await analyzeImage({...input,fetchImpl:async(url,options)=>{requests.push(JSON.parse(options.body));return response(completion(requests.length===1?bad:demoPlan()));}});
 assert.equal(requests.length,2);assert.equal(result.analysis.repaired,true);assert.equal(result.furniture.length,10);
 assert.equal(requests[0].max_tokens,8192);
 assert.match(requests[1].messages.at(-1).content,/第 1 組門窗/);
 assert.equal(requests[1].messages[1].content[1].image_url.url,input.image);
});
test('stops after one repair failure and reports a useful validation reason',async()=>{
 let calls=0;const bad=demoPlan();bad.openings[0].offset=99;
 await assert.rejects(analyzeImage({...input,fetchImpl:async()=>{calls++;return response(completion(bad));}}),e=>e.status===422&&e.code==='INVALID_PLAN'&&e.message.includes('修正後'));
 assert.equal(calls,2);
});
test('truncated JSON is retried rather than accepted',async()=>{
 let calls=0;const result=await analyzeImage({...input,fetchImpl:async()=>response(++calls===1?completion('{"width":','length'):completion(demoPlan()))});
 assert.equal(calls,2);assert.equal(result.analysis.repaired,true);
});
test('quota and network failures are not retried or mislabeled 422',async()=>{
 let calls=0;
 await assert.rejects(analyzeImage({...input,fetchImpl:async()=>{calls++;return {ok:false,status:429};}}),e=>e.status===429&&e.code==='PROVIDER_ERROR');assert.equal(calls,1);
 await assert.rejects(analyzeImage({...input,fetchImpl:async()=>{throw Error('fetch failed');}}),e=>e.status===502&&e.code==='NETWORK_ERROR');
 await assert.rejects(analyzeImage({...input,fetchImpl:async()=>{throw new DOMException('timeout','TimeoutError');}}),e=>e.status===504&&e.code==='TIMEOUT');
});
test('upstream error payload and unreadable image fail without corrective calls',async()=>{
 assert.throws(()=>parseCompletion({error:{message:'upstream failure'}}),e=>e.status===502);
 let calls=0;await assert.rejects(analyzeImage({...input,fetchImpl:async()=>{calls++;return response(completion({error:'unreadable'}));}}),e=>e.code==='UNREADABLE_IMAGE');assert.equal(calls,1);
});

test('AI receives fixed canvas and wall height, and retries changed scale',async()=>{
 const wrong=demoPlan(),correct=demoPlan(),requests=[];correct.height=2;
 const result=await analyzeImage({...input,depth:9,height:2,fetchImpl:async(url,options)=>{
  requests.push(JSON.parse(options.body));return response(completion(requests.length===1?wrong:correct));
 }});
 assert.equal(requests.length,2);assert.equal(result.height,2);
 assert.match(requests[0].messages[1].content[0].text,/height=2 meters/);
 assert.match(requests[0].messages[0].content,/quarter|swing arcs/);
 assert.match(requests[1].messages.at(-1).content,/樓高/);
});
