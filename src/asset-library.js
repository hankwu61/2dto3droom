import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

let promise,templates;
export function loadAssetLibrary(){
 return promise??=(new GLTFLoader().loadAsync('/models/roomform-furniture.glb').then(gltf=>{
  templates=new Map(gltf.scene.children.filter(g=>g.name.startsWith('rf_')).map(g=>[g.name.slice(3),g]));
  if(templates.size<23)throw Error('Blender 模型庫不完整');
  return templates;
 }).catch(error=>{templates=null;promise=null;throw error;}));
}

// Independent resources are essential: scene rebuilds dispose old instances,
// and editing one object's color must not recolor the cached library or peers.
export function instantiateAsset(type,{width,depth,height}={}){
 const template=templates?.get(type);if(!template)return null;
 const model=template.clone(true),materials=new Map(),textures=new Map();
 model.traverse(o=>{
  if(!o.isMesh)return;o.geometry=o.geometry.clone();
  const cloneMaterial=source=>{
   if(materials.has(source))return materials.get(source);
   const m=source.clone();materials.set(source,m);
   for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key]){
    if(!textures.has(m[key]))textures.set(m[key],m[key].clone());m[key]=textures.get(m[key]);
   }
   m.userData.fixedSurface=/rf-(chrome|metal|rubber|glass|screen|soil|leaf|stitch)/.test(m.name);
   if(m.transparent){m.depthWrite=false;m.side=T.DoubleSide;}
   return m;
  };
  o.material=Array.isArray(o.material)?o.material.map(cloneMaterial):cloneMaterial(o.material);
  o.castShadow=![o.material].flat().every(m=>m.transparent);o.receiveShadow=true;
 });
 model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 if(size.x<=0||size.y<=0||size.z<=0)throw Error(`Blender 模型尺寸無效：${type}`);
 model.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));
 const group=new T.Group();group.name=`Blender_${type}`;group.userData.blenderAsset=type;group.userData.naturalHeight=size.y;
 group.add(model);group.scale.set((width??size.x)/size.x,(height??size.y)/size.y,(depth??size.z)/size.z);
 return group;
}

export function buildDetailedOpening(group,opening,geometry,wall){
 const height=geometry.top-geometry.bottom,depth=(wall.thickness??.16)+.045;
 const frame=instantiateAsset(opening.type==='window'?'window_frame':opening.style==='sliding'?'sliding_panel':'door_frame',{width:opening.width+.055,height:height+.04,depth});
 if(!frame)return false;frame.position.y=geometry.bottom;group.add(frame);
 if(opening.type==='door'&&opening.style!=='sliding'){
  const direction=opening.hinge==='end'?-1:1,leafWidth=Math.max(.1,opening.width-.045);
  const pivot=new T.Group();pivot.name='Door_hinge';pivot.position.set(-direction*(opening.width/2-.02),geometry.bottom+.005,0);pivot.rotation.y=-direction*(opening.swing??1)*Math.PI*.44;
  const leaf=instantiateAsset('door_leaf',{width:leafWidth,height:height-.025,depth:.095});leaf.position.x=direction*leafWidth/2;pivot.add(leaf);group.add(pivot);
 }
 return true;
}
