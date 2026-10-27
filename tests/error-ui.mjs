import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {demoPlan} from '../src/model.js';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();const warnings=[];page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
 await page.route('**/api/status',r=>r.fulfill({json:{vision:true,label:'OpenRouter'}}));
 let fail=true;
 await page.route('**/api/analyze',r=>r.fulfill({status:fail?422:200,json:fail?{error:'第 2 組門窗超出牆面，請修正',code:'INVALID_PLAN',requestId:'test1234'}:{...demoPlan(),analysis:{warnings:['AI 已重新修正配置。']}}}));
 await page.goto('http://127.0.0.1:5173');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=100;return c.toDataURL().split(',')[1];});
 await page.locator('#upload').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='test.png');
 await page.locator('#engine').selectOption('vision');await page.locator('#analyze').click();
 await page.waitForFunction(()=>!document.querySelector('#analyze-error').hidden);
 assert.match(await page.locator('#analyze-error').textContent(),/test1234/);
 assert.equal(await page.locator('#analyze').isEnabled(),true);
 await page.waitForTimeout(4600);assert.equal(await page.locator('#analyze-error').isVisible(),true);
 await page.screenshot({path:'test-results/analysis-error.png',fullPage:true});
 fail=false;await page.locator('#analyze').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('AI 已重新修正配置'));
 assert.equal(await page.locator('#analyze-error').isVisible(),false);
 assert(!warnings.some(w=>w.includes('PCFSoftShadowMap')));
 console.log('UI regression passed: persistent error, request ID, retry recovery, no obsolete shadow warning.');
}finally{await browser.close();}
