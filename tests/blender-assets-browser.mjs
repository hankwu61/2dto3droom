import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {catalog} from '../src/catalog.js';
import {sandboxProjects} from './project-sandbox.mjs';
import {loadGlbGeometry,glbJson} from './glb-geometry.mjs';
const furniture=Object.entries(catalog).map(([type,{size}],i)=>({type,x:2+(i%5)*3.2,z:3+Math.floor(i/5)*3,width:size[0],depth:size[1],rotation:0}));
const plan={width:18,depth:14,height:2.8,walls:[{x1:.5,z1:1,x2:17.5,z2:1}],openings:[{wall:0,type:'door',offset:1,width:1},{wall:0,type:'window',offset:4,width:2},{wall:0,type:'door',style:'sliding',offset:8,width:2.5}],furniture};
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1800,height:1300}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await sandboxProjects(page,{id:'asset-test',name:'Blender 家具與衛浴模型庫',updatedAt:Date.now(),plan,image:null,title:'Blender 家具與衛浴模型庫',fileName:'模型庫展示',tag:'Blender 5.2',engine:'local'});
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.body.dataset.projectsReady==='true'&&document.querySelector('#viewport').dataset.assets==='ready');
 assert.match(await page.locator('#asset-status').textContent(),/Blender 細節模型/);
 const assetInfo=await page.evaluate(async()=>{
  const {loadAssetLibrary,instantiateAsset}=await import('/src/asset-library.js'),{Box3,Vector3}=await import('/node_modules/three/build/three.module.js');
  const templates=await loadAssetLibrary(),a=instantiateAsset('sofa',{width:2.8,depth:1.2,height:1}),b=instantiateAsset('sofa',{width:2.8,depth:1.2,height:1});
  a.updateMatrixWorld(true);const bounds=new Box3().setFromObject(a),size=bounds.getSize(new Vector3());let ma,mb;a.traverse(o=>{if(o.isMesh&&!ma)ma=o.material;});b.traverse(o=>{if(o.isMesh&&!mb)mb=o.material;});
  return {templates:templates.size,size:size.toArray(),floor:bounds.min.y,independent:ma!==mb};
 });
 assert.equal(assetInfo.templates,23);assert.equal(assetInfo.independent,true);assert.ok(Math.abs(assetInfo.floor)<1e-6);
 for(const [i,expected] of [2.8,1,1.2].entries())assert.ok(Math.abs(assetInfo.size[i]-expected)<1e-5);
 await page.screenshot({path:'test-results/blender-showroom.png',fullPage:true});
 await page.locator('#object-list').selectOption('furniture:0');await page.locator('[name="width"]').fill('2.8');await page.locator('[name="depth"]').fill('1.2');await page.locator('[name="height"]').fill('1');
 await page.locator('#material-finish').selectOption('fabric');await page.locator('[data-color="#829b89"]').click();
 assert.equal(await page.locator('#property-error').isVisible(),false);
 const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download,bytes=await readFile(await file.path()),json=glbJson(bytes);
 assert.ok(json.images?.length>0,'GLB contains Blender texture images');
 assert.ok(json.materials.some(m=>m.alphaMode==='BLEND'),'glass remains transparent');
 const gltf=await loadGlbGeometry(bytes),root=gltf.scene.getObjectByName('ROOMFORM');root.updateMatrixWorld(true);
 const entities=root.children.filter(g=>g.userData.entity);
 for(const [i,f] of furniture.entries()){
  const group=entities.find(g=>g.userData.entity.kind==='furniture'&&g.userData.entity.i===i);let detailed=false;group.traverse(g=>{if(g.userData.blenderAsset===f.type)detailed=true;});assert.ok(detailed,f.type);
  const size=new Box3().setFromObject(group).getSize(new Vector3());
  assert.ok(Math.abs(size.x-(i===0?2.8:f.width))<1e-4,f.type+' width');assert.ok(Math.abs(size.z-(i===0?1.2:f.depth))<1e-4,f.type+' depth');
 }
 const edited=entities.find(g=>g.userData.entity.kind==='furniture'&&g.userData.entity.i===0);assert.ok(Math.abs(new Box3().setFromObject(edited).getSize(new Vector3()).y-1)<1e-4);
 for(const o of entities.filter(g=>g.userData.entity.kind==='opening')){let asset=false;o.traverse(g=>{if(g.userData.blenderAsset)asset=true;});assert.ok(asset,'detailed door/window is exported');}
 await writeFile('output/blender-showroom.glb',bytes);
 // Repeated rebuilds must retain independent geometry/materials in the cache.
 await page.locator('#editor-undo').click();await page.locator('#redo').click();assert.equal(await page.locator('[name="width"]').inputValue(),'2.800');
 await page.route('**/models/roomform-furniture.glb',r=>r.abort());await page.reload();
 await page.waitForFunction(()=>document.querySelector('#viewport').dataset.assets==='fallback');assert.match(await page.locator('#asset-status').textContent(),/暫用基本模型/);
 assert.deepEqual(errors,[]);console.log('Blender assets passed: all 23 assets, all furniture types, exact dimensions/floor alignment, independent materials, editing/undo, GLB textures/glass, door/window placement and failed-load fallback.');
}finally{await browser.close();}
