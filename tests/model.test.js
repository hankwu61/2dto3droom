import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoPlan,validatePlan,detectWalls} from '../src/model.js';
test('demo includes valid walls, doors, windows and furniture',()=>{const p=validatePlan(demoPlan());assert.equal(p.furniture.length,10);assert(p.openings.some(o=>o.type==='door'));assert(p.openings.some(o=>o.type==='window'));});
test('rejects openings outside walls and overlapping openings',()=>{const p=demoPlan();p.openings.push({wall:0,type:'door',offset:11.5,width:1});assert.throws(()=>validatePlan(p));const q=demoPlan();q.openings.push({...q.openings[0]});assert.throws(()=>validatePlan(q),/重疊/);});
test('rejects invalid coordinates and unknown furniture',()=>{const p=demoPlan();p.walls[0].x1=NaN;assert.throws(()=>validatePlan(p));const q=demoPlan();q.furniture[0].type='unknown';assert.throws(()=>validatePlan(q));});
test('raster detection extracts thick walls and ignores isolated thin lines',()=>{const w=200,h=150,data=new Uint8ClampedArray(w*h*4).fill(255);for(let y=20;y<24;y++)for(let x=10;x<190;x++){const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=0;}for(let y=40;y<130;y++)for(let x=80;x<84;x++){const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=0;}const p=detectWalls(data,w,h,10);assert.equal(p.walls.length,2);assert.equal(p.depth,7.5);validatePlan(p);});
test('blank image does not fabricate a room',()=>{const p=detectWalls(new Uint8ClampedArray(100*100*4).fill(255),100,100,10);assert.equal(p.walls.length,0);assert.throws(()=>validatePlan(p));});
