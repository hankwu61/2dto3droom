import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {demoPlan} from '../src/model.js';
import {sandboxProjects} from './project-sandbox.mjs';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await sandboxProjects(page);
 await page.route('**/api/status',r=>r.fulfill({json:{vision:true,provider:'codex',label:'Codex CLI',model:null,cliTimeoutMs:600000}}));
 await page.addInitScript(plan=>{
  const nativeFetch=window.fetch;let count=0;
  window.fetch=(url,options)=>{
   if(url!=='/api/analyze')return nativeFetch(url,options);
   window.lastAnalysis=JSON.parse(options.body);const attempt=++count,encoder=new TextEncoder();
   return Promise.resolve(new Response(new ReadableStream({start(controller){
    controller.enqueue(encoder.encode(JSON.stringify({type:'progress',label:'Codex 第 1 輪：辨識牆面、門窗與家具',elapsedMs:10000,timeoutMs:600000})+'\n'));
    setTimeout(()=>{
     const event=attempt===1?{type:'result',plan}:{type:'error',status:429,code:'CLI_QUOTA',error:'Codex 帳戶額度不足',requestId:'quota-test'};
     controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));controller.close();
    },1800);
   }}),{headers:{'content-type':'application/x-ndjson'}}));
  };
 },{...demoPlan(),analysis:{provider:'codex',rounds:[{},{}],warnings:['請核對尺寸']}});
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>document.body.dataset.projectsReady==='true');
 await page.locator('#upload').setInputFiles('public/projects/pp4.jpg');
 await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='pp4.jpg');
 assert.match(await page.locator('#trigger-antigravity').textContent(),/Codex CLI/);
 await page.locator('#trigger-antigravity').click();
 await page.waitForFunction(()=>document.querySelector('#analyze').textContent.includes('Codex 第 1 輪'));
 assert.match(await page.locator('#status').textContent(),/10 秒.*600 秒/);
 assert.equal(await page.locator('#analyze').isDisabled(),true);
 await page.waitForFunction(()=>document.querySelector('#source-tag').textContent==='AI 辨識 · 請核對');
 assert.equal((await page.evaluate(()=>window.lastAnalysis)).autoScale,true);
 assert.match(await page.locator('#review-summary').textContent(),/核對 2 輪/);
 const counts=await page.locator('#counts').textContent();
 await page.screenshot({path:'test-results/codex-workflow.png',fullPage:true});
 await page.locator('#analyze').click();
 await page.waitForFunction(()=>!document.querySelector('#analyze-error').hidden);
 assert.match(await page.locator('#analyze-error').textContent(),/Codex 帳戶額度不足.*quota-test/);
 assert.equal(await page.locator('#counts').textContent(),counts);
 assert.equal(await page.locator('#analyze').isDisabled(),false);
 assert.deepEqual(errors,[]);
 console.log('Codex UI checks passed: provider selection, automatic scale request, streamed phase/timing, 3D result, quota errors and preservation of the prior model.');
}finally{await browser.close();}
