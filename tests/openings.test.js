import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectWalls,validatePlan} from '../src/model.js';
import {openingGeometry} from '../src/openings.js';
import {normalizePlan} from '../analyze.js';
import {rescalePlan} from '../src/scale.js';

function drawing(type,{vertical=false,mirror=false,symbolGrey=0,closedFrame=false}={}){
 const size=400,data=new Uint8ClampedArray(size*size*4).fill(255);
 let grey=0;
 const dot=(x,y)=>{x=Math.round(x);y=Math.round(y);if(mirror)x=size-1-x;if(vertical)[x,y]=[y,x];if(x<0||y<0||x>=size||y>=size)return;const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=grey;};
 for(let x=30;x<370;x++)if(x<150||x>=190)for(let y=80;y<88;y++)dot(x,y);
 grey=symbolGrey;
 if(type==='window')for(let x=150;x<190;x++)for(const y of [81,86])dot(x,y);
 if(closedFrame)for(let x=150;x<190;x++)for(const y of [81,86])dot(x,y);
 if(type==='sliding'||type==='partial'){
  for(let x=150;x<174;x++)for(const y of [81,86])dot(x,y);
  if(type==='sliding')for(let y=81;y<=86;y++)dot(173,y);
 }
 if(type==='door'||type==='leaf'){
  for(let y=84;y<=124;y++)for(const x of [150,151])dot(x,y);
  if(type==='door')for(let a=0;a<=Math.PI/2;a+=.003)dot(150+40*Math.cos(a),84+40*Math.sin(a));
 }
 return detectWalls(data,size,size,10);
}
for(const type of ['door','window'])for(const vertical of [false,true])for(const mirror of [false,true]){
 test(`local ${type} location and jamb width, vertical=${vertical}, mirror=${mirror}`,()=>{
  const p=validatePlan(drawing(type,{vertical,mirror}));
  assert.equal(p.openings.length,1);assert.equal(p.openings[0].type,type);
  assert.equal(p.walls.length,1,'door leaves and glazing must not become solid walls');
  if(type==='door')assert.equal(p.openings[0].swing,vertical?-1:1);
  assert.ok(Math.abs(p.openings[0].width-1)<.08);
  const g=openingGeometry(p,p.openings[0]);
  const along=mirror?(399-170)*.025:170*.025;
  assert.ok(Math.abs((vertical?g.z:g.x)-along)<.08);
  assert.ok(Math.abs((vertical?g.x:g.z)-83.5*.025)<.08);
 });
}
test('plain wall gaps do not invent doors or reconnect unrelated segments',()=>{
 const p=validatePlan(drawing('gap'));assert.equal(p.openings.length,0);assert.equal(p.walls.length,2);
 assert.equal(validatePlan(drawing('leaf')).openings.length,0,'a perpendicular line without an arc is insufficient');
});
for(const type of ['door','window','sliding'])for(const vertical of [false,true]){
 test(`grey thin ${type} symbols survive the wall threshold, vertical=${vertical}`,()=>{
  const p=validatePlan(drawing(type,{vertical,symbolGrey:175,closedFrame:type==='door'}));
  assert.equal(p.openings.length,1);assert.equal(p.openings[0].type,type==='sliding'?'door':type);
  if(type==='sliding')assert.equal(p.openings[0].style,'sliding');
 });
}
test('partial rails without a panel end cap are not an automatic sliding door',()=>{
 assert.equal(drawing('partial',{symbolGrey:175}).openings.length,0);
});
test('vertical dimensions and reversed diagonal host wall determine 3D geometry',()=>{
 const p={width:10,depth:10,height:3,walls:[{x1:8,z1:8,x2:2,z2:0}],openings:[{wall:0,type:'window',offset:2,width:2,height:1.5,sillHeight:1}],furniture:[]};
 validatePlan(p);const g=openingGeometry(p,p.openings[0]);
 assert.equal(g.x,6.2);assert.equal(g.z,5.6);assert.equal(g.bottom,1);assert.equal(g.top,2.5);
 const scaled=rescalePlan(p,1.2);assert.equal(scaled.openings[0].height,1.5);assert.equal(scaled.openings[0].sillHeight,1);
 p.openings[0].height=2.1;assert.throws(()=>validatePlan(p),/牆高/);
 p.openings[0].height=1;p.openings[0].type='door';assert.throws(()=>validatePlan(p),/地面/);
});
test('AI opening dimensions normalize, retain directions and report height estimates',()=>{
 const p={width:10,depth:8,height:3,walls:[{x1:0,z1:0,x2:10,z2:0}],openings:[{wall:0,type:'door',offset:2,width:1,height:'2.1',sillHeight:'0',hinge:'end',swing:'-1',style:'hinged'}],furniture:[],openingWarnings:['門窗高度為估算，請核對。']};
 const result=normalizePlan(p);assert.equal(result.plan.openings[0].height,2.1);assert.equal(result.plan.openings[0].swing,-1);assert.equal(result.plan.openings[0].hinge,'end');assert.match(result.warnings[0],/估算/);
 p.openings[0].height='9';assert.throws(()=>normalizePlan(p),/牆高/);
});
