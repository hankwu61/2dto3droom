import {loadAssetLibrary,instantiateAsset,buildDetailedOpening} from './asset-library.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {openingGeometry} from './openings.js';
import {sceneExchange,exchangeDae} from './sketchup.js';
import {buildFixture} from './fixtures.js';
import {insidePolygon} from './scale.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
export function createScene(container,onWalk,editor={}){
 const scene=new T.Scene();scene.background=new T.Color('#e7ece9');scene.fog=new T.Fog('#e7ece9',35,85);
 const camera=new T.PerspectiveCamera(43,1,.05,150);const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;container.append(renderer.domElement);
 const studio=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.04).texture;scene.environmentIntensity=.65;studio.dispose();pmrem.dispose();
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI/2-.03;
 const walk=new PointerLockControls(camera,renderer.domElement);let walking=false,plan,root=new T.Group(),colliders=[];scene.add(root);
 scene.add(new T.HemisphereLight(0xffffff,0x879581,1.5));const sun=new T.DirectionalLight(0xfff2d9,2.3);sun.position.set(-6,18,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25});sun.shadow.bias=-.001;scene.add(sun);
 const mats={wall:0xf3f1e9,wood:0xba9170,floor:0xd8c4a7,sofa:0xb6c9bb,fabric:0xe8e1d6,dark:0x454e48,green:0x5c8263};
 function box(parent,w,h,d,x,y,z,color,rotation=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function applyFinish(group,finish){
  if(!finish)return;
  let texture;
  if(finish==='wood'||finish==='fabric'){
   const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);
   if(finish==='wood'){for(let x=0;x<128;x++){const n=Math.round(225+15*Math.sin(x*.35)+8*Math.cos(x*1.9));ctx.strokeStyle=`rgb(${n},${n},${n})`;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+5,40,x-5,85,x,128);ctx.stroke();}}
   else{ctx.strokeStyle='#c7c7c7';ctx.lineWidth=1;for(let x=0;x<128;x+=4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,128);ctx.moveTo(0,x);ctx.lineTo(128,x);ctx.stroke();}}
   texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,2);
  }
  group.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat()){if(m.userData.fixedSurface)continue;m.metalness=finish==='metal'?.85:0;m.roughness=finish==='metal'?.28:finish==='wood'?.6:.95;if(texture)m.map=texture;}});
 }
 function furniture(f,index){const g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=-f.rotation*Math.PI/180;root.add(g);g.userData.entity={kind:'furniture',i:index};const w=f.width,d=f.depth;
 const detailed=f.type==='mesh'?null:instantiateAsset(f.type,{width:w,depth:d});if(detailed)g.add(detailed);
 if(!detailed){
 if(f.type==='mesh'){for(const part of f.meshes){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(part.positions.map((v,i)=>v*(i%3===0?w:i%3===2?d:f.height)),3));geometry.computeVertexNormals();const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color:part.color,opacity:part.opacity,transparent:part.opacity<1,side:T.DoubleSide}));m.castShadow=m.receiveShadow=true;g.add(m);}}
 if(f.type==='sofa'){box(g,w,.38,d,0,.35,0,mats.sofa);box(g,w,.55,.18,0,.73,-d/2+.09,mats.sofa);for(const x of [-w/2+.1,w/2-.1])box(g,.2,.45,d,x,.6,0,mats.sofa);for(let i=0;i<3;i++)box(g,(w-.5)/3,.15,d*.7,-(w-.5)/3+i*(w-.5)/3,.6,.05,mats.fabric);}
 if(f.type==='bed'){box(g,w,.32,d,0,.24,0,mats.wood);box(g,w*.96,.23,d*.95,0,.51,0,mats.fabric);box(g,w,.95,.12,0,.55,-d/2,mats.wood);box(g,w*.97,.06,d*.52,0,.66,d*.2,mats.sofa);for(const x of [-w*.24,w*.24])box(g,w*.4,.13,d*.2,x,.67,-d*.3,0xfffaf1);}
 if(f.type==='table'||f.type==='chair'){const h=f.type==='table'?.74:.45;box(g,w,.1,d,0,h,0,mats.wood);for(const x of [-w*.38,w*.38])for(const z of [-d*.38,d*.38])box(g,.07,h,.07,x,h/2,z,mats.dark);if(f.type==='chair')box(g,w,.48,.08,0,.72,-d/2,mats.wood);}
 if(f.type==='cabinet'){box(g,w,1.4,d,0,.7,0,mats.wood);for(let i=0;i<3;i++)box(g,w*.95,.025,d*1.01,0,.35+i*.38,0,0x987450);}
 if(f.type==='plant'){const pot=new T.Mesh(new T.CylinderGeometry(w*.35,w*.25,.45,16),new T.MeshStandardMaterial({color:0xe8ded0}));pot.position.y=.225;g.add(pot);for(let i=0;i<5;i++){const leaf=new T.Mesh(new T.SphereGeometry(w*.32,12,8),new T.MeshStandardMaterial({color:mats.green}));leaf.scale.set(1,1.8,1);leaf.position.set(Math.sin(i*2)*w*.22,.65+i*.09,Math.cos(i*2)*d*.22);g.add(leaf);}}
 buildFixture(g,f,box);
 if(f.type==='block')box(g,w,1,d,0,.5,0,f.color||mats.wood);
 }
 if(f.color)g.traverse(o=>{if(o.isMesh)for(const m of [o.material].flat())if(!m.userData.fixedSurface)m.color.set(f.color);});
 applyFinish(g,f.finish);
 const naturalHeight=new T.Box3().setFromObject(g).getSize(new T.Vector3()).y;
 if(f.height&&f.type!=='mesh')g.scale.y=f.height/naturalHeight;
 g.userData.baseHeight=f.height||naturalHeight;g.userData.baseScaleY=g.scale.y;
 const radius=Math.hypot(w,d)/2;if(f.type!=='mesh')colliders.push({f,x:f.x,z:f.z,radius});
 }
 let wallGroup,cutaway=false;const cutPlane=new T.Plane(new T.Vector3(0,-1,0),1.05);
 function updateCutaway(){for(const g of root.children){const e=g.userData.entity;if(!e)continue;const clipped=e.kind==='wall'||e.kind==='opening'||(e.kind==='furniture'&&['column','cabinet'].includes(plan.furniture[e.i].type));g.traverse(o=>{if(o.isMesh){for(const m of [o.material].flat()){m.clippingPlanes=cutaway&&!walking&&clipped?[cutPlane]:[];m.clipShadows=true;}}});}}
 function wallPart(w,start,end,bottom,top){if(end-start<.005||top-bottom<.005)return;const len=Math.hypot(w.x2-w.x1,w.z2-w.z1),dx=(w.x2-w.x1)/len,dz=(w.z2-w.z1)/len;const mid=(start+end)/2;box(wallGroup,end-start,top-bottom,w.thickness||.16,mid-len/2,(top+bottom)/2,0,w.color||mats.wall);if(bottom<1.6&&top>.2)colliders.push({ax:w.x1+dx*start,az:w.z1+dz*start,bx:w.x1+dx*end,bz:w.z1+dz*end});}
 function build(p,{reset=false}={}){const first=!plan;transformControl.detach();outline.visible=false;plan=p;root.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat()){m.map?.dispose();m.dispose();}});scene.remove(root);root=new T.Group();root.name='ROOMFORM';scene.add(root);colliders=[];
 if(p.imported){}else if(p.outline){
 const shapeOf=points=>new T.Shape(points.map(v=>new T.Vector2(v.x,v.z)));
 const floor=new T.Mesh(new T.ExtrudeGeometry(shapeOf(p.outline),{depth:.18,bevelEnabled:false}),new T.MeshStandardMaterial({color:mats.floor,side:T.DoubleSide}));floor.rotation.x=Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;root.add(floor);
 for(const room of p.rooms||[]){const surface=new T.Mesh(new T.ShapeGeometry(shapeOf(room.polygon)),new T.MeshStandardMaterial({color:room.color||mats.floor,side:T.DoubleSide}));surface.rotation.x=Math.PI/2;surface.position.y=-.024;surface.receiveShadow=true;root.add(surface);}
 }else{box(root,p.width,.18,p.depth,p.width/2,-.12,p.depth/2,mats.floor);for(let x=.6;x<p.width;x+=.6)box(root,.009,.004,p.depth,x,-.026,p.depth/2,0xc3ad90);}
 p.walls.forEach((w,i)=>{const wallHeight=w.height||p.height;wallGroup=new T.Group();wallGroup.position.set((w.x1+w.x2)/2,0,(w.z1+w.z2)/2);wallGroup.rotation.y=-Math.atan2(w.z2-w.z1,w.x2-w.x1);wallGroup.userData.entity={kind:'wall',i};wallGroup.userData.baseHeight=wallHeight;wallGroup.userData.baseScaleY=1;root.add(wallGroup);const len=Math.hypot(w.x2-w.x1,w.z2-w.z1);let cursor=0;for(const o of p.openings.filter(o=>o.wall===i).sort((a,b)=>a.offset-b.offset)){wallPart(w,cursor,o.offset,0,wallHeight);const {bottom,top,x:openingX,z:openingZ,rotation:openingRotation}=openingGeometry(p,o);wallPart(w,o.offset,o.offset+o.width,0,bottom);wallPart(w,o.offset,o.offset+o.width,top,wallHeight);const g=new T.Group();g.position.set(openingX,0,openingZ);g.rotation.y=openingRotation;root.add(g);g.userData.entity={kind:'opening',i:p.openings.indexOf(o)};
 if(!buildDetailedOpening(g,o,{bottom,top},w)){
 for(const x of [-o.width/2,o.width/2])box(g,.055,top-bottom,.2,x,(top+bottom)/2,0,o.type==='door'?mats.wood:0x53675f);
 box(g,o.width,.055,.2,0,top,0,mats.wood);
 if(o.type==='window'||o.style==='sliding'){box(g,o.width,.055,.2,0,bottom,0,0x53675f);box(g,.035,top-bottom,.12,0,(top+bottom)/2,0,0x53675f);const glass=box(g,o.width,top-bottom,.025,0,(top+bottom)/2,0,0xa8d4dc);glass.material.transparent=true;glass.material.opacity=.35;}else{const hinge=new T.Group();const direction=o.hinge==='end'?-1:1;hinge.position.x=-direction*o.width/2;hinge.rotation.y=-direction*(o.swing??1)*Math.PI*.44;g.add(hinge);box(hinge,o.width*.95,top-.08,.045,direction*o.width*.475,(top-.08)/2,0,mats.wood);box(hinge,.045,.045,.11,direction*o.width*.85,Math.min(1,top*.5),0,0x353f38);}
 }
 cursor=o.offset+o.width;}wallPart(w,cursor,len,0,wallHeight);applyFinish(wallGroup,w.finish);});p.furniture.forEach(furniture);updateCutaway();root.updateMatrixWorld(true);if(first||reset)home();select(activeSelection);}

 const ready=loadAssetLibrary().then(()=>{if(plan)build(plan);editor.onAssetsStatus?.('ready','Blender 細節模型');return true;}).catch(error=>{console.warn('Blender asset library:',error.message);editor.onAssetsStatus?.('fallback','模型庫未載入，暫用基本模型');return false;});
 const transformControl=new TransformControls(camera,renderer.domElement);transformControl.setSize(.8);scene.add(transformControl.getHelper());
 const outline=new T.Box3Helper(new T.Box3(),0xe9a458);outline.visible=false;scene.add(outline);
 const grid=new T.GridHelper(80,160,0xa9b9ac,0xcbd5cb);grid.position.set(0,-.225,0);grid.visible=false;scene.add(grid);
 let activeSelection=null,editMode='select',dragged=false,pointerStart=null;
 const raycaster=new T.Raycaster();
 function selectedObject(){if(!activeSelection)return null;return root.children.find(o=>o.userData.entity?.kind===activeSelection?.kind&&o.userData.entity?.i===activeSelection?.i);}
 function select(selection){activeSelection=selection;transformControl.detach();const object=selectedObject();outline.visible=!!object&&!walking;
  if(!object||walking)return;outline.box.setFromObject(object);outline.updateMatrixWorld(true);
  if(['translate','rotate','scale'].includes(editMode)&&!(selection.kind==='opening'&&editMode==='rotate')){
   transformControl.setMode(editMode);transformControl.setSpace(editMode==='translate'?'world':'local');
   transformControl.showX=editMode!=='rotate';transformControl.showY=editMode==='rotate'||(editMode==='scale'&&selection.kind!=='opening');transformControl.showZ=editMode==='translate'||(editMode==='scale'&&selection.kind==='furniture');transformControl.attach(object);
  }
 }
 transformControl.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value&&!walking;});
 transformControl.addEventListener('mouseDown',()=>{dragged=true;});
 transformControl.addEventListener('objectChange',()=>{const object=selectedObject();if(object){outline.box.setFromObject(object);outline.updateMatrixWorld(true);}});
 transformControl.addEventListener('mouseUp',()=>{
  const o=selectedObject();if(!o)return;
  const change={x:o.position.x,z:o.position.z,rotation:-o.rotation.y*180/Math.PI,sx:Math.abs(o.scale.x),sz:Math.abs(o.scale.z),height:(o.userData.baseHeight||1)*o.scale.y/(o.userData.baseScaleY||1)};
  // Commit after TransformControls finishes its pointer-up state transition.
  setTimeout(()=>editor.onTransform?.(activeSelection,change),0);
 });
 renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};dragged=!!transformControl.axis;});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(walking||dragged||!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)return;
  const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  const hit=raycaster.intersectObject(root,true).find(h=>{let o=h.object;while(o&&o!==root){if(o.userData.entity)return true;o=o.parent;}return false;});
  let entity=null;if(hit){let o=hit.object;while(o&&o!==root){if(o.userData.entity){entity=o.userData.entity;break;}o=o.parent;}}
  select(entity);editor.onSelect?.(entity);
 });
 function setEditMode(value){editMode=value;select(activeSelection);}
 function setSnap(enabled){transformControl.setTranslationSnap(enabled?.1:null);transformControl.setRotationSnap(enabled?Math.PI/12:null);transformControl.setScaleSnap(enabled?.1:null);}
 setSnap(true);
 function home(){if(walking)walk.unlock();orbit.enabled=true;camera.position.set(plan.width*1.5,Math.max(plan.width,plan.depth)*1.15,plan.depth*1.65);orbit.target.set(plan.width/2,0,plan.depth/2);camera.position.sub(orbit.target).multiplyScalar(Math.max(1,.9/camera.aspect)).add(orbit.target);orbit.update();}
 function blocked(x,z){if(plan.outline&&!insidePolygon(x,z,plan.outline))return true;if(x<.25||z<.25||x>plan.width-.25||z>plan.depth-.25)return true;return colliders.some(c=>{if(c.f){const r=c.f.rotation*Math.PI/180,dx=x-c.x,dz=z-c.z,lx=dx*Math.cos(r)-dz*Math.sin(r),lz=dx*Math.sin(r)+dz*Math.cos(r);return Math.abs(lx)<c.f.width/2+.18&&Math.abs(lz)<c.f.depth/2+.18;}const dx=c.bx-c.ax,dz=c.bz-c.az,t=Math.max(0,Math.min(1,((x-c.ax)*dx+(z-c.az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-c.ax-t*dx,z-c.az-t*dz)<.27;});}
 function enter(){transformControl.detach();outline.visible=false;let point=plan.spawn&&!blocked(plan.spawn.x,plan.spawn.z)?[plan.spawn.x,plan.spawn.z]:null;for(let z=plan.depth*.7;z>.3&&!point;z-=.4)for(let x=plan.width*.35;x<plan.width-.3;x+=.4)if(!blocked(x,z)){point=[x,z];break;}if(!point)throw Error('找不到可行走位置，請先修正牆面或家具');camera.position.set(point[0],1.65,point[1]);camera.lookAt(point[0],1.65,0);walk.lock();}
 const keys=new Set();window.addEventListener('keydown',e=>{if(walking){keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
 walk.addEventListener('lock',()=>{walking=true;updateCutaway();orbit.enabled=false;onWalk(true);});walk.addEventListener('unlock',()=>{walking=false;updateCutaway();keys.clear();orbit.enabled=true;onWalk(false);home();});
 let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.04);last=now;if(walking){const old=camera.position.clone(),speed=dt*(keys.has('ShiftLeft')?3.6:2);let fw=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),rt=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));const norm=Math.hypot(fw,rt)||1;walk.moveForward(fw/norm*speed);walk.moveRight(rt/norm*speed);const nx=camera.position.x,nz=camera.position.z;camera.position.x=blocked(nx,old.z)?old.x:nx;camera.position.z=blocked(camera.position.x,nz)?old.z:nz;camera.position.y=1.65;}else orbit.update();renderer.render(scene,camera);});
 new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(container);
 return {ready,build,home,enter,select,exportExchange(){return sceneExchange(root);},exportDae(){return exchangeDae(sceneExchange(root));},setCutaway(value){cutaway=value;updateCutaway();},setEditMode,setSnap,setGrid(v){grid.visible=v;},getSelectionHeight(){return selectedObject()?.userData.baseHeight;},top(){camera.position.set(plan.width/2,Math.max(plan.width,plan.depth)*1.65,plan.depth/2+.001);orbit.target.set(plan.width/2,0,plan.depth/2);orbit.update();},async export(){await ready;return new GLTFExporter().parseAsync(root,{binary:true});},screenshot(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}};
}
