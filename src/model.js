import {openingGeometry} from './openings.js';
import {recognizeOpenings} from './raster-openings.js';
import {validateExchange} from './sketchup.js';
import {catalog} from './catalog.js';
export const types=[...Object.keys(catalog),'mesh'];
export function validatePlan(p){
 if(!p || !Number.isFinite(p.width)||!Number.isFinite(p.depth)||p.width<2||p.depth<2||p.width>60||p.depth>60)throw Error('空間尺寸須介於 2–60 公尺');
 if(!Array.isArray(p.walls)||(!p.walls.length&&p.draft!==true&&!p.furniture?.some(f=>f.type==='mesh'))||p.walls.length>250)throw Error('牆面數量須介於 1–250');
 p.height=Number.isFinite(p.height)?Math.min(5,Math.max(2,p.height)):2.8;
 for(const w of p.walls){if(![w.x1,w.z1,w.x2,w.z2].every(Number.isFinite)||Math.hypot(w.x2-w.x1,w.z2-w.z1)<.1)throw Error('牆面座標無效');if([w.x1,w.x2].some(x=>x<0||x>p.width)||[w.z1,w.z2].some(z=>z<0||z>p.depth))throw Error('牆面超出空間');}
 p.openings=p.openings||[];p.furniture=p.furniture||[];
 if(!Array.isArray(p.openings)||!Array.isArray(p.furniture))throw Error('門窗與家具須為陣列');
 if(p.openings.length>150||p.furniture.length>150)throw Error('物件數量過多');
 for(const o of p.openings){const w=p.walls[o.wall];if(!Number.isInteger(o.wall)||!w||!['door','window'].includes(o.type)||![o.offset,o.width].every(Number.isFinite)||o.width<.3||o.offset<0||o.offset+o.width>Math.hypot(w.x2-w.x1,w.z2-w.z1)+.01)throw Error('門窗必須位於指定牆面內');}
 for(const o of p.openings){
  if(o.height!==undefined&&(!Number.isFinite(o.height)||o.height<.1))throw Error('門窗高度須大於等於 0.1 公尺');
  if(o.sillHeight!==undefined&&(!Number.isFinite(o.sillHeight)||o.sillHeight<0))throw Error('窗台高度須為非負數');
  const g=openingGeometry(p,o);
  if(g.height<.1||g.top>g.wallHeight+.000001)throw Error('門窗頂端不可超過牆高');
  if(o.type==='door'&&g.bottom!==0)throw Error('門洞須從地面開始');
  if(o.style!==undefined&&!['hinged','sliding'].includes(o.style))throw Error('門窗樣式無效');
  if(o.hinge!==undefined&&!['start','end'].includes(o.hinge))throw Error('門鉸方向無效');
  if(o.swing!==undefined&&o.swing!==1&&o.swing!==-1)throw Error('開門方向須為 1 或 -1');
 }
 for(let i=0;i<p.openings.length;i++)for(let j=i+1;j<p.openings.length;j++){const a=p.openings[i],b=p.openings[j];if(a.wall===b.wall&&Math.max(a.offset,b.offset)<Math.min(a.offset+a.width,b.offset+b.width)-.01)throw Error('門窗不可互相重疊');}
 for(const [i,f] of p.furniture.entries()){
  const label=`第 ${i+1} 件家具（${f.type||'未提供類型'}）`;
  if(!types.includes(f.type))throw Error(`${label} 類型不支援；可用：${types.join(', ')}`);
  for(const key of ['x','z','width','depth','rotation'])if(!Number.isFinite(f[key]))throw Error(`${label} 的 ${key} 必須是有效數字`);
  if(f.width<.05||f.depth<.05||f.width>(f.type==='mesh'?60:12)||f.depth>(f.type==='mesh'?60:12))throw Error(`${label} 寬深須介於 0.05–12 公尺，目前 width=${f.width}, depth=${f.depth}`);
  if(f.x<0||f.x>p.width||f.z<0||f.z>p.depth)throw Error(`${label} 中心超出畫布：x=${f.x}, z=${f.z}；畫布 ${p.width} × ${p.depth}`);
 }

 for(const e of [...p.walls,...p.furniture]){
  if(e.height!==undefined&&(!Number.isFinite(e.height)||e.height<(p.walls.includes(e)?.3:.1)||e.height>5))throw Error('物件高度無效（牆面 0.3–5 公尺；家具 0.1–5 公尺）');
  if(e.finish!==undefined&&!['matte','wood','fabric','metal'].includes(e.finish))throw Error('材質類型無效');
  if(e.color!==undefined&&(typeof e.color!=='string'||!/^#[0-9a-f]{6}$/i.test(e.color)))throw Error('材質顏色格式無效');
 }
 for(const w of p.walls)if(w.thickness!==undefined&&(!Number.isFinite(w.thickness)||w.thickness<.05||w.thickness>.8))throw Error('牆厚須介於 0.05–0.8 公尺');
 for(const polygon of [p.outline,...(p.rooms||[]).map(r=>r.polygon)].filter(Boolean)){
  if(!Array.isArray(polygon)||polygon.length<3||polygon.length>100||polygon.some(v=>!v||!Number.isFinite(v.x)||!Number.isFinite(v.z)||v.x<0||v.z<0||v.x>p.width||v.z>p.depth))throw Error('地板邊界無效');
 }
 const meshes=p.furniture.filter(f=>f.type==='mesh');if(meshes.length)validateExchange({format:'roomform-mesh',version:1,units:'meters',upAxis:'Y',groups:meshes.map(f=>({meshes:f.meshes}))});
 return p;
}
export function demoPlan(){return {width:12,depth:9,height:2.8,walls:[{x1:0,z1:0,x2:12,z2:0},{x1:12,z1:0,x2:12,z2:9},{x1:12,z1:9,x2:0,z2:9},{x1:0,z1:9,x2:0,z2:0},{x1:7.5,z1:0,x2:7.5,z2:9},{x1:7.5,z1:5,x2:12,z2:5}],openings:[{wall:0,type:'window',offset:1.2,width:3.8},{wall:0,type:'window',offset:8.5,width:2.2},{wall:1,type:'window',offset:6,width:1.8},{wall:2,type:'door',offset:7,width:1.2},{wall:4,type:'door',offset:5.7,width:1.1},{wall:5,type:'door',offset:.7,width:1}],furniture:[{type:'sofa',x:2.3,z:2,width:3,depth:1.1,rotation:0},{type:'table',x:2.5,z:4,width:1.7,depth:.85,rotation:0},{type:'cabinet',x:5.8,z:2,width:.5,depth:2.6,rotation:0},{type:'table',x:4.6,z:6.6,width:1.7,depth:1.2,rotation:0},{type:'chair',x:3.3,z:6.6,width:.6,depth:.6,rotation:90},{type:'chair',x:5.9,z:6.6,width:.6,depth:.6,rotation:-90},{type:'bed',x:9.8,z:2.5,width:2,depth:2.5,rotation:0},{type:'cabinet',x:11.4,z:7,width:.65,depth:2.6,rotation:0},{type:'plant',x:.8,z:6.8,width:.6,depth:.6,rotation:0},{type:'plant',x:6.7,z:.7,width:.55,depth:.55,rotation:0}]};}
// Detect long, thick, axis-aligned dark runs, then merge adjacent scan lines.
export function detectWalls(data,width,height,realWidth,threshold=110){
 // Wall fills and antialiased one-pixel symbols need different thresholds.
 // A thin grey door leaf can disappear entirely at the wall-fill threshold.
 const ink=(x,y,cutoff)=>{if(x<0||x>=width||y<0||y>=height)return false;const i=(y*width+x)*4;return data[i+3]>80&&(data[i]+data[i+1]+data[i+2])/3<cutoff;};
 const dark=(x,y)=>ink(x,y,threshold),symbolDark=(x,y)=>ink(x,y,Math.max(threshold,200));
 const found=[];const minimum=Math.max(16,Math.round(width*.07));
 for(let axis=0;axis<2;axis++){const major=axis?height:width,minor=axis?width:height;const lines=[];
 for(let b=0;b<minor;b++){let start=-1;for(let a=0;a<=major;a++){if(a<major&&(axis?dark(b,a):dark(a,b))){if(start<0)start=a;}else if(start>=0){if(a-start>=minimum){const old=lines.find(l=>b-l.last<=2&&Math.abs(l.start-start)<6&&Math.abs(l.end-a)<6);if(old){old.last=b;old.n++;}else lines.push({start,end:a,first:b,last:b,n:1});}start=-1;}}}
 for(const l of lines.filter(l=>l.n>=2)){const b=(l.first+l.last)/2;found.push({axis,b,start:l.start,end:l.end,thickness:l.last-l.first+1});}}
 const geometry=recognizeOpenings(found,symbolDark,realWidth/width);
 return {width:realWidth,depth:height/width*realWidth,height:2.8,...geometry,furniture:[],analysis:{provider:'local',warnings:[...(geometry.openings.length?[]:['未辨識到門窗；目前只有牆線，請改用視覺 AI 或在平面編輯補上。']),'本機門窗依窗框平行線、門扇與開門弧、推拉門扇辨識；寬度與位置依圖面總寬換算，高度及窗台為估算。請核對漏判、誤判與實際尺寸。']}};
}
