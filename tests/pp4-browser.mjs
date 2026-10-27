import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
await mkdir('output',{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/?project=pp4');await page.waitForFunction(()=>document.querySelector('#counts')?.textContent.includes('43 件家具'));await page.waitForTimeout(1200);
 await page.locator('#viewport').screenshot({path:'output/pp4-perspective.png'});
 await page.locator('#cutaway').check();await page.waitForTimeout(400);await page.locator('#viewport').screenshot({path:'output/pp4-cutaway.png'});await page.locator('#cutaway').uncheck();
 await page.locator('#top').click();await page.waitForTimeout(500);await page.locator('#viewport').screenshot({path:'output/pp4-top.png'});
 let pending=page.waitForEvent('download');await page.locator('#export').click();await(await pending).saveAs('output/pp4-estimated.glb');
 pending=page.waitForEvent('download');await page.locator('#save').click();await(await pending).saveAs('output/pp4-estimated.json');
 await page.locator('#reference-length').fill('2');await page.locator('#calibrate').click();
 pending=page.waitForEvent('download');await page.locator('#save').click();const dl=await pending;const calibrated=JSON.parse(await readFile(await dl.path(),'utf8'));assert.ok(Math.abs(calibrated.scale.referenceLength-2)<1e-8);assert.equal(calibrated.height,2.8);assert.ok(Math.abs(calibrated.width-12.6*2/1.962)<1e-8);
 await page.locator('#editor-undo').click();
 await page.locator('#walk').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.keyboard.up('KeyW');await page.evaluate(()=>document.exitPointerLock());
 assert.deepEqual(errors,[]);console.log('pp4 model, scale calibration, undo, GLB/JSON export and walking passed.');
}finally{await browser.close();}
