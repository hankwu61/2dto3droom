import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateExchange} from './src/sketchup.js';
const exec=promisify(execFile);
export const sketchupDirectory=process.env.SKETCHUP_DIR||'D:\\sketchup\\SketchUp';
export const nativeSketchupReady=()=>process.platform==='win32'&&existsSync(path.join(sketchupDirectory,'SketchUpAPI.dll'));
let active=false;
export async function convertSketchup(mode,input){
 if(!nativeSketchupReady())throw Error('未找到 SketchUp 原生 API，請設定 SKETCHUP_DIR');
 if(active)throw Error('SketchUp 正在轉檔，請等候完成後再試');
 if(mode==='export')validateExchange(input);
 active=true;let dir;
 try{
  dir=await mkdtemp(path.join(os.tmpdir(),'roomform-skp-'));const source=path.join(dir,mode==='export'?'input.json':'input.skp'),output=path.join(dir,mode==='export'?'result.skp':'result.json');
  await writeFile(source,mode==='export'?JSON.stringify(input):input);
  try{await exec(process.env.ROOMFORM_PYTHON||'python',[path.resolve('scripts/sketchup_native.py'),mode,sketchupDirectory,source,output],{windowsHide:true,timeout:120000,maxBuffer:1024*1024});}catch(e){throw Error(e.killed?'SketchUp 轉檔逾時':`SketchUp 轉檔失敗：${(e.stderr||e.message).trim().slice(0,400)}`);}
  const bytes=await readFile(output);if(bytes.length>50e6)throw Error('轉換結果超過 50 MB');return mode==='export'?bytes:validateExchange(JSON.parse(bytes.toString('utf8')));
 }finally{active=false;if(dir)await rm(dir,{recursive:true,force:true});}
}
