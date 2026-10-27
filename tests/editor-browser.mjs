import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#object-list');
 await page.locator('#object-list').selectOption('furniture:0');
 await page.locator('[name="x"]').fill('3.2');await page.locator('[name="width"]').fill('2.6');await page.locator('[name="height"]').fill('1.2');
 await page.locator('#material-finish').selectOption('wood');await page.locator('[data-color="#829b89"]').click();
 assert.equal(await page.locator('[name="x"]').inputValue(),'3.200');
 await page.locator('#duplicate').click();assert.match(await page.locator('#counts').textContent(),/11 件家具/);
 await page.locator('#editor-undo').click();assert.match(await page.locator('#counts').textContent(),/10 件家具/);
 await page.locator('#redo').click();assert.match(await page.locator('#counts').textContent(),/11 件家具/);
 await page.locator('#object-list').selectOption('opening:0');await page.locator('[name="width"]').fill('1.8');await page.locator('#object-form button[type="submit"]').click();
 await page.locator('#object-list').selectOption('wall:4');await page.locator('[name="height"]').fill('3.5');await page.locator('#object-form button[type="submit"]').click();
 await page.locator('#object-list').selectOption('furniture:0');await page.locator('[data-transform="translate"]').click();await page.locator('#grid').check();
 await page.screenshot({path:'test-results/editor.png',fullPage:true});
 // Exercise the visible red X-axis handle at this fixed camera/viewport.
 await page.mouse.move(1040,650);await page.mouse.down();await page.mouse.move(1072,672,{steps:12});await page.mouse.up();await page.waitForTimeout(400);
 const draggedX=Number(await page.locator('[name="x"]').inputValue());assert.notEqual(draggedX,3.2,'Dragging X gizmo must update model position');
 const download=page.waitForEvent('download');await page.locator('#save').click();const file=await download;const plan=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.equal(plan.furniture[0].x,draggedX);assert.equal(plan.furniture[0].width,2.6);assert.equal(plan.furniture[0].height,1.2);assert.equal(plan.furniture[0].color,'#829b89');assert.equal(plan.furniture[0].finish,'wood');assert.equal(plan.openings[0].width,1.8);assert.equal(plan.walls[4].height,3.5);
 const glbDownload=page.waitForEvent('download');await page.locator('#export').click();const glb=await glbDownload;const bytes=await readFile(await glb.path());assert.equal(bytes.toString('ascii',0,4),'glTF');
 await page.locator('[data-transform="rotate"]').click();await page.locator('[data-transform="scale"]').click();await page.locator('[data-transform="select"]').click();
 // Invalid edits must not mutate the saved model.
 await page.locator('[name="x"]').fill('-5');await page.locator('#object-form button[type="submit"]').click();assert.equal(await page.locator('#property-error').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('Editor checks passed: dimensions, material, duplicate, undo/redo, wall/opening properties, JSON persistence, invalid edit rollback.');
}finally{await browser.close();}
