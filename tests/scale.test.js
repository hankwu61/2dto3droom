import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePlan} from '../src/model.js';
import {rescalePlan,polygonArea,insidePolygon} from '../src/scale.js';
const plan=JSON.parse(readFileSync(new URL('../public/projects/pp4.json',import.meta.url)));
test('pp4 contains all requested distinct fixtures, walls and columns',()=>{validatePlan(plan);for(const type of ['bathtub','toilet','basin','stove','sink','fridge','column','bed','sofa'])assert.ok(plan.furniture.some(f=>f.type===type),type);assert.equal(plan.furniture.filter(f=>f.type==='column').length,3);assert.ok(polygonArea(plan.outline)<plan.width*plan.depth);assert.ok(insidePolygon(plan.spawn.x,plan.spawn.z,plan.outline));});
test('calibration scales geometry together while preserving heights and source',()=>{const next=rescalePlan(plan,1.1);assert.equal(next.furniture[0].width,plan.furniture[0].width*1.1);assert.equal(next.openings[0].offset,plan.openings[0].offset*1.1);assert.equal(next.outline[0].x,plan.outline[0].x*1.1);assert.equal(next.height,plan.height);assert.equal(next.furniture[0].height,plan.furniture[0].height);assert.ok(Math.abs(polygonArea(next.outline)/polygonArea(plan.outline)-1.21)<1e-8);assert.equal(plan.scale.metersPerPixel,.018);assert.throws(()=>rescalePlan(plan,0));});
