import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {validatePlan} from './src/model.js';
export function openProjectStore(filename=path.resolve('data/projects.sqlite')){
 mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,updated_at INTEGER NOT NULL,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS migrations(id TEXT PRIMARY KEY);');
 const get=id=>{const row=db.prepare('SELECT payload FROM projects WHERE id=?').get(id);return row?JSON.parse(row.payload):null;};
 function validate(row){if(!row||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>80||!Number.isFinite(row.updatedAt))throw Error('專案基本資料無效');validatePlan(row.plan);if(row.image!=null&&(typeof row.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(row.image)))throw Error('專案原圖格式無效');const payload=JSON.stringify(row);if(Buffer.byteLength(payload)>50e6)throw Error('專案超過 50 MB');return payload;}
 function put(row,{migration=false,active=true}={}){const payload=validate(row);db.exec('BEGIN IMMEDIATE');try{
 if(migration){if(!db.prepare('SELECT id FROM migrations WHERE id=?').get(row.id)){db.prepare('INSERT OR IGNORE INTO projects VALUES(?,?,?,?)').run(row.id,row.name,row.updatedAt,payload);db.prepare('INSERT INTO migrations VALUES(?)').run(row.id);}}
 else db.prepare('INSERT INTO projects VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at,payload=excluded.payload').run(row.id,row.name,row.updatedAt,payload);
 if(active&&(!migration||!db.prepare("SELECT value FROM settings WHERE key='active'").get()))db.prepare("INSERT INTO settings VALUES('active',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(row.id);
 db.exec('COMMIT');return {saved:true,id:row.id};}catch(e){db.exec('ROLLBACK');throw e;}}
 return {get,put,list(){return {projects:db.prepare('SELECT id,name,updated_at AS updatedAt FROM projects ORDER BY updated_at DESC').all(),activeId:db.prepare("SELECT value FROM settings WHERE key='active'").get()?.value||null};},close(){db.close();}};
}
