import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sceneExchange,exchangePlan,validateExchange,exchangeDae} from '../src/sketchup.js';
import {validatePlan} from '../src/model.js';
test('mesh exchange preserves world transforms and metre scale',()=>{const root=new T.Group(),group=new T.Group();group.name='A & B';group.position.set(5,0,-3);const box=new T.Mesh(new T.BoxGeometry(2,1,3),new T.MeshStandardMaterial({color:'#ff8800'}));box.position.y=.5;group.add(box);root.add(group);const data=sceneExchange(root);const p=validatePlan(exchangePlan(data));assert.equal(p.furniture[0].width,2);assert.equal(p.furniture[0].depth,3);assert.equal(p.furniture[0].height,1);assert.equal(p.walls.length,0);assert.match(exchangeDae(data),/A &amp; B/);assert.match(exchangeDae(data),/meter="1"/);});
test('exchange rejects malformed triangles and oversized geometry',()=>{const data={format:'roomform-mesh',version:1,units:'meters',upAxis:'Y',groups:[{meshes:[{positions:[0,0,0],color:'#ffffff',opacity:1}]}]};assert.throws(()=>validateExchange(data),/三角網格/);data.groups[0].meshes[0].positions=[0,0,0,100,0,0,0,1,0];assert.throws(()=>exchangePlan(data),/58 公尺/);});
