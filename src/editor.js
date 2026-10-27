import {validatePlan} from './model.js';
export const entityList={wall:'walls',opening:'openings',furniture:'furniture'};
export function getEntity(plan,selection){return selection?plan[entityList[selection.kind]]?.[selection.i]:null;}
export function editEntity(plan,selection,patch){
 const next=structuredClone(plan),entity=getEntity(next,selection);
 if(!entity)throw Error('請先選取物件');
 Object.assign(entity,patch);return validatePlan(next);
}
export function transformEntity(plan,selection,change){
 const next=structuredClone(plan),e=getEntity(next,selection);
 if(!e)throw Error('請先選取物件');
 if(selection.kind==='furniture'){
  e.x=change.x;e.z=change.z;e.rotation=change.rotation;
  e.width*=change.sx;e.depth*=change.sz;
  if(change.height)e.height=change.height;
 }else if(selection.kind==='wall'){
  const length=Math.hypot(e.x2-e.x1,e.z2-e.z1)*change.sx,angle=change.rotation*Math.PI/180;
  e.x1=change.x-Math.cos(angle)*length/2;e.x2=change.x+Math.cos(angle)*length/2;
  e.z1=change.z-Math.sin(angle)*length/2;e.z2=change.z+Math.sin(angle)*length/2;
  e.height=change.height;
  for(const o of next.openings.filter(o=>o.wall===selection.i)){o.offset*=change.sx;o.width*=change.sx;}
 }else{
  const w=next.walls[e.wall],dx=w.x2-w.x1,dz=w.z2-w.z1,length=Math.hypot(dx,dz);
  e.width*=change.sx;
  e.offset=((change.x-w.x1)*dx+(change.z-w.z1)*dz)/length-e.width/2;
 }
 return validatePlan(next);
}
export function duplicateEntity(plan,selection){
 const e=getEntity(plan,selection);if(!e)throw Error('請先選取物件');
 const next=structuredClone(plan),copy=structuredClone(e),list=entityList[selection.kind];
 const shift=(min,max,bound)=>max+.5<=bound?.5:min-.5>=0?-.5:0;
 if(selection.kind==='furniture'){copy.x+=shift(copy.x,copy.x,plan.width);copy.z+=shift(copy.z,copy.z,plan.depth);}
 else if(selection.kind==='wall'){
  const dx=shift(Math.min(copy.x1,copy.x2),Math.max(copy.x1,copy.x2),plan.width),dz=shift(Math.min(copy.z1,copy.z2),Math.max(copy.z1,copy.z2),plan.depth);
  if(!dx&&!dz)throw Error('空間內沒有可放置複製牆面的位置');
  copy.x1+=dx;copy.x2+=dx;copy.z1+=dz;copy.z2+=dz;
  for(const o of plan.openings.filter(o=>o.wall===selection.i))next.openings.push({...o,wall:next.walls.length});
 }else{copy.offset+=copy.width+.2;}
 next[list].push(copy);validatePlan(next);return {plan:next,selection:{kind:selection.kind,i:next[list].length-1}};
}
export function rectangleWalls(plan,a,b){
 const x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x),z1=Math.min(a.z,b.z),z2=Math.max(a.z,b.z);
 if(x2-x1<.3||z2-z1<.3)throw Error('矩形的寬與深至少為 0.3 公尺');
 const next=structuredClone(plan);next.walls.push({x1,z1,x2,z2:z1},{x1:x2,z1,x2,z2},{x1:x2,z1:z2,x2:x1,z2},{x1,z1:z2,x2:x1,z2:z1});return validatePlan(next);
}
