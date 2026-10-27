import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoPlan} from '../src/model.js';
import {editEntity,transformEntity,duplicateEntity} from '../src/editor.js';
test('numeric and material edits validate before committing',()=>{
 const p=demoPlan();const q=editEntity(p,{kind:'furniture',i:0},{width:2.7,height:1.2,color:'#829b89'});
 assert.equal(q.furniture[0].width,2.7);assert.equal(p.furniture[0].width,3);
 assert.throws(()=>editEntity(p,{kind:'furniture',i:0},{x:-1}));
 assert.throws(()=>editEntity(p,{kind:'wall',i:0},{height:.2}));
 assert.throws(()=>editEntity(p,{kind:'furniture',i:0},{color:'invalid'}));
});
test('furniture drag rotation and scale update persisted dimensions',()=>{
 const q=transformEntity(demoPlan(),{kind:'furniture',i:0},{x:3,z:3,rotation:45,sx:1.2,sz:.8,height:1});
 assert.equal(q.furniture[0].x,3);assert.equal(q.furniture[0].rotation,45);assert.equal(q.furniture[0].width,3*1.2);assert.equal(q.furniture[0].depth,1.1*.8);
});
test('wall transformations carry associated openings and preserve containment',()=>{
 const p=demoPlan();const q=transformEntity(p,{kind:'wall',i:0},{x:6,z:1,rotation:0,sx:.8,sz:1,height:3.2});
 assert.equal(q.walls[0].height,3.2);assert.equal(q.walls[0].z1,1);assert.equal(q.openings[0].offset,p.openings[0].offset*.8);assert.equal(q.openings[0].width,p.openings[0].width*.8);
});
test('opening movement projects to owning wall and invalid moves fail',()=>{
 const p=demoPlan();const q=transformEntity(p,{kind:'opening',i:0},{x:4,z:2,sx:1});assert.equal(q.openings[0].offset,2.1);
 assert.throws(()=>transformEntity(p,{kind:'opening',i:0},{x:20,z:2,sx:1}));
});
test('duplicate is independent and includes child openings when copying wall',()=>{
 const p=demoPlan();const f=duplicateEntity(p,{kind:'furniture',i:0});assert.equal(f.plan.furniture.length,11);assert.equal(f.selection.i,10);assert.equal(f.plan.furniture[10].x,2.8);
 const w=duplicateEntity(p,{kind:'wall',i:4});assert.equal(w.plan.walls.length,7);assert.equal(w.plan.openings.at(-1).wall,6);
});
