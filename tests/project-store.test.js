import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {openProjectStore} from '../project-store.js';import {demoPlan} from '../src/model.js';
test('SQLite persists full project across restart and migration cannot overwrite edited records',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'roomform-db-test-'));let db;try{const file=path.join(dir,'projects.sqlite');db=openProjectStore(file);const row={id:'test-one',name:'原圖專案',updatedAt:1,plan:demoPlan(),image:'data:image/png;base64,aA=='};db.put(row,{migration:true});db.put({...row,name:'新版',updatedAt:2});db.put(row,{migration:true});assert.equal(db.get(row.id).name,'新版');db.close();db=openProjectStore(file);assert.equal(db.get(row.id).image,row.image);assert.equal(db.list().activeId,row.id);assert.equal(db.list().projects.length,1);assert.throws(()=>db.put({...row,id:'../bad'}));assert.equal(db.list().projects.length,1);}finally{db?.close();await rm(dir,{recursive:true,force:true});}});
