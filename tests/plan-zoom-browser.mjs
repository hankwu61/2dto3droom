import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {demoPlan} from '../src/model.js';
import {sandboxProjects} from './project-sandbox.mjs';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await sandboxProjects(page,{id:'zoom-test',name:'放大測試',updatedAt:Date.now(),plan:demoPlan(),image:null,title:'放大測試',fileName:'示範配置',tag:'測試',engine:'local'});
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.body.dataset.projectsReady==='true');
 const counts=await page.locator('#counts').textContent(),small=await page.locator('#plan').boundingBox();
 await page.locator('#plan').click();await page.waitForSelector('#plan-zoom[open]');
 const big=await page.locator('#plan').boundingBox();assert.ok(big.width>small.width*2);
 assert.equal(await page.locator('#counts').textContent(),counts,'opening must not add an object');
 async function clickPoint(x,z){
  const point=await page.locator('#plan').evaluate((c,{x,z})=>{
   const pad=18,s=Math.min((c.width-pad*2)/12,(c.height-pad*2)/9),ox=(c.width-12*s)/2,oy=(c.height-9*s)/2,r=c.getBoundingClientRect();
   return {x:(ox+x*s)/c.width*r.width,y:(oy+z*s)/c.height*r.height};
  },{x,z});await page.locator('#plan').click({position:point});
 }
 await clickPoint(2.3,2);assert.equal(await page.locator('#object-list').inputValue(),'furniture:0');
 await page.locator('[data-plan-tool="wall"]').click();await clickPoint(4,3);await clickPoint(6,3);
 assert.match(await page.locator('#counts').textContent(),/7 道牆面/);
 await page.screenshot({path:'test-results/plan-zoom-desktop.png',fullPage:true});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#plan-zoom').open);
 assert.equal(await page.locator('#plan').evaluate(c=>c.width),420);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'plan-expand');
 await page.locator('#undo').click();assert.equal(await page.locator('#counts').textContent(),counts);
 await page.locator('#plan-expand').click();await page.locator('#plan-zoom-close').click();
 await page.locator('#plan').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#plan-zoom').evaluate(d=>d.open),true);
 await page.mouse.click(5,5);await page.waitForFunction(()=>!document.querySelector('#plan-zoom').open);
 await page.setViewportSize({width:390,height:844});await page.locator('#plan-expand').click();
 const bounds=await page.locator('#plan-zoom').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844);
 const mobile=await page.locator('#plan').boundingBox();assert.ok(mobile.width>0&&mobile.height>0);
 await page.screenshot({path:'test-results/plan-zoom-mobile.png',fullPage:true});
 await page.locator('#plan-zoom-close').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('Plan zoom passed: click/button/keyboard entry, high-resolution resizing, object selection, wall editing, undo, Escape/backdrop/close, focus restoration and mobile layout.');
}finally{await browser.close();}
