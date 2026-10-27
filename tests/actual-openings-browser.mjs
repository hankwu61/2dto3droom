import {chromium} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {loadGlbGeometry} from './glb-geometry.mjs';
import {openingGeometry} from '../src/openings.js';
import {sandboxProjects} from './project-sandbox.mjs';

// Regression for the actual reported plan, without changing the user's DB.
const db=new DatabaseSync('data/projects.sqlite',{readOnly:true});
const id=process.argv[2]??db.prepare("SELECT value FROM settings WHERE key='active'").get().value;
const row=JSON.parse(db.prepare('SELECT payload FROM projects WHERE id=?').get(id).payload);db.close();
assert.equal(row.name,'室內平面圖1','select the reported floor plan');
await writeFile('test-results/actual-project-before.json',JSON.stringify(row,null,2));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const rows=await sandboxProjects(page,row);
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>document.body.dataset.projectsReady==='true');
 await page.locator('#engine').selectOption('local');await page.locator('#analyze').click();
 await page.waitForFunction(()=>document.querySelector('#source-tag').textContent.includes('門窗自動定位'));
 assert.equal(await page.locator('#analyze-error').isVisible(),false);
 const download=page.waitForEvent('download');await page.locator('#save').click();
 const file=await download,plan=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.equal(plan.openings.filter(o=>o.type==='door').length,3);
 assert.equal(plan.openings.filter(o=>o.type==='window').length,2);
 const expected=[
  {type:'door',style:'hinged',x:30,y:395.5,width:77},
  {type:'door',style:'sliding',x:434,y:413,width:98},
  {type:'door',style:'sliding',x:488,y:241.5,width:99},
  {type:'window',x:207.5,y:21,width:99},
  {type:'window',x:197.5,y:620,width:99}
 ];
 const s=12/776;
 for(const e of expected){
  const o=plan.openings.find(o=>{const g=openingGeometry(plan,o);return o.type===e.type&&(!e.style||o.style===e.style)&&Math.hypot(g.x-e.x*s,g.z-e.y*s)<.12;});
  assert.ok(o,JSON.stringify(e));assert.ok(Math.abs(o.width-e.width*s)<.12);
 }
 const glbPromise=page.waitForEvent('download');await page.locator('#export').click();const glb=await glbPromise;
 const bytes=await readFile(await glb.path());
 const parsed=await loadGlbGeometry(bytes);
 const model=parsed.scene.getObjectByName('ROOMFORM');model.updateMatrixWorld(true);
 const rendered=model.children.filter(g=>g.userData.entity?.kind==='opening');
 assert.equal(rendered.length,5);
 for(const [i,o] of plan.openings.entries()){
  const g=openingGeometry(plan,o),part=rendered.find(r=>r.userData.entity.i===i);
  assert.ok(Math.abs(part.position.x-g.x)<1e-5&&Math.abs(part.position.z-g.z)<1e-5);
  const wall=model.children.find(r=>r.userData.entity?.kind==='wall'&&r.userData.entity.i===o.wall);
  const point=new Vector3(g.x,(g.top+g.bottom)/2,g.z);
  assert.ok(wall.children.every(m=>!new Box3().setFromObject(m).containsPoint(point)),`opening ${i} must be cut out of the host wall`);
 }
 await page.locator('#object-list').selectOption('opening:1');
 await page.evaluate(()=>{document.querySelector('.panel').scrollTop=0;});
 await page.screenshot({path:'test-results/actual-openings-fixed.png',fullPage:true});
 await writeFile('test-results/actual-openings-fixed.glb',bytes);
 await writeFile('test-results/actual-openings-fixed.json',JSON.stringify(plan,null,2));
 const updated=rows.get(id);assert.equal(updated.plan.openings.length,5);
 await writeFile('test-results/actual-project-corrected.json',JSON.stringify(updated,null,2));
 assert.deepEqual(errors,[]);
 console.log('Actual floor plan passed: 1 hinged door, 2 sliding doors, 2 windows; all 5 image positions/widths matched, rendered in GLB and cut out of host walls. User database unchanged.');
}finally{await browser.close();}
