// Explicit opt-in integration test: sends a synthetic image to the configured API.
// Run with the local dev server active: node tests/antigravity-smoke.mjs
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {validatePlan} from '../src/model.js';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>!document.querySelector('#engine option[value="vision"]').disabled);
 assert.match(await page.locator('#engine option[value="vision"]').textContent(),/Antigravity/);
 const image=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');
  x.fillStyle='white';x.fillRect(0,0,640,480);x.strokeStyle='black';x.lineWidth=8;x.strokeRect(40,40,560,400);
  x.fillStyle='white';x.fillRect(140,432,90,16);x.lineWidth=2;x.beginPath();x.moveTo(140,440);x.lineTo(140,350);x.stroke();x.beginPath();x.arc(140,440,90,-Math.PI/2,0);x.stroke();
  x.fillRect(220,32,180,16);x.strokeStyle='#247aa0';x.strokeRect(220,36,180,8);
  x.strokeStyle='black';x.lineWidth=2;x.strokeRect(410,110,120,180);x.strokeRect(420,120,45,30);x.strokeRect(475,120,45,30);x.beginPath();x.moveTo(410,170);x.lineTo(530,170);x.stroke();
  x.fillStyle='black';x.font='18px sans-serif';x.fillText('BED',450,230);x.fillText('WINDOW',265,75);x.fillText('DOOR',155,470);
  return c.toDataURL('image/png');
 });
 await page.locator('#upload').setInputFiles({name:'antigravity-test-plan.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});
 await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='antigravity-test-plan.png');
 await page.locator('#engine').selectOption('vision');await page.locator('#width').fill('8');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/analyze'),{timeout:165000});
 await page.locator('#analyze').click();const response=await responsePromise;const result=await response.json();
 if(!response.ok())throw new Error(`Live vision failed (${response.status()}): ${result.error}`);
 const p=validatePlan(result);assert(p.openings.some(o=>o.type==='door'));assert(p.openings.some(o=>o.type==='window'));assert(p.furniture.some(f=>f.type==='bed'));
 await page.waitForFunction(()=>document.querySelector('#source-tag').textContent==='AI 辨識 · 請核對');
 console.log(JSON.stringify({status:response.status(),walls:p.walls.length,doors:p.openings.filter(o=>o.type==='door').length,windows:p.openings.filter(o=>o.type==='window').length,furniture:p.furniture.length}));
 await page.screenshot({path:'test-results/antigravity-vision.png',fullPage:true});
} finally {await browser.close();}
