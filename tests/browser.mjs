import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#viewport > canvas');await page.waitForTimeout(1500);
 assert.match(await page.locator('#counts').textContent(),/10 件家具/);
 await page.locator('#furniture').selectOption('chair');await page.locator('#plan-expand').click();const planBox=await page.locator('#plan').boundingBox();await page.locator('#plan').click({position:{x:planBox.width/2,y:planBox.height/2}});await page.locator('#plan-zoom-close').click();assert.match(await page.locator('#counts').textContent(),/11 件家具/);
 await page.locator('#undo').click();assert.match(await page.locator('#counts').textContent(),/10 件家具/);
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const file=await downloadPromise;assert.equal(file.suggestedFilename(),'roomform.glb');await file.saveAs('test-results/roomform.glb');
 await page.screenshot({path:'test-results/studio.png',fullPage:true});
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,400,300);x.strokeStyle='black';x.lineWidth=6;x.strokeRect(30,30,340,240);return c.toDataURL().split(',')[1];});
 await page.locator('#upload').setInputFiles({name:'test-plan.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await page.waitForFunction(()=>document.querySelector('#file-name').textContent==='test-plan.png');await page.locator('#analyze').click();await page.waitForFunction(()=>document.querySelector('#source-tag').textContent.includes('牆線辨識'));assert.match(await page.locator('#counts').textContent(),/4 道牆面/);
 await page.locator('#demo').click();await page.locator('#walk').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.keyboard.up('KeyW');await page.evaluate(()=>document.exitPointerLock());await page.waitForTimeout(200);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('Browser checks passed: 3D, furniture/undo, GLB, image conversion, walk mode, responsive layout.');
}finally{await browser.close();}
