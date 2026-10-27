import {localOrigin} from './local-origin.js';
import {openProjectStore} from './project-store.js';
import {nativeSketchupReady,convertSketchup} from './sketchup-native.js';
import 'dotenv/config';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {visionConfig} from './vision.js';
import {analyzeImage,AnalysisError} from './analyze.js';
import {antigravityReady,analyzeWithAntigravity} from './antigravity.js';
import {codexReady,analyzeWithCodex} from './codex.js';
import {streamAnalysis} from './analysis-stream.js';
const app=express();
app.get('/api/sketchup/status',(_req,res)=>res.json({native:nativeSketchupReady()}));
const projectStore=openProjectStore(process.env.ROOMFORM_PROJECT_DB);
app.get('/api/projects',(_req,res)=>res.json(projectStore.list()));
app.get('/api/projects/:id',(req,res)=>{const row=projectStore.get(req.params.id);row?res.json(row):res.status(404).json({error:'找不到專案'});});
app.put('/api/projects/:id',localOrigin,express.json({limit:'50mb'}),(req,res)=>{try{if(req.params.id!==req.body?.id)throw Error('專案編號不一致');res.json(projectStore.put(req.body));}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/projects/migrate',localOrigin,express.json({limit:'50mb'}),(req,res)=>{try{res.json(projectStore.put(req.body?.project,{migration:true,active:req.body?.active===true}));}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/sketchup/export',localOrigin,express.json({limit:'50mb'}),async(req,res)=>{try{const bytes=await convertSketchup('export',req.body);res.set({'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="roomform.skp"'}).send(bytes);}catch(e){res.status(422).json({error:e.message});}});
app.post('/api/sketchup/import',localOrigin,express.raw({type:'application/octet-stream',limit:'50mb'}),async(req,res)=>{try{if(!Buffer.isBuffer(req.body)||!req.body.length)throw Error('請提供 SKP 檔案');res.json(await convertSketchup('import',req.body));}catch(e){res.status(422).json({error:e.message});}});
app.use(express.json({limit:'12mb'}));
const config=visionConfig();
const isCli=['codex','antigravity'].includes(config.provider);
const cliAnalyze=config.provider==='codex'?analyzeWithCodex:analyzeWithAntigravity;
const cliReady=()=>config.provider==='codex'?codexReady():antigravityReady();
app.get('/api/status',(_req,res)=>res.json({vision:isCli?cliReady():!!config.key,provider:config.provider,label:config.label,model:config.model,cliTimeoutMs:config.timeoutMs}));
app.post('/api/analyze',async(req,res)=>{
 const requestId=randomUUID().slice(0,8);
 try{
  if(!isCli&&!config.key)throw new AnalysisError('尚未設定視覺辨識金鑰，請使用本機辨識。','NOT_CONFIGURED',503);
  const {image,width,depth,height=2.8,autoScale,imageWidth,imageHeight}=req.body||{};
  if(typeof image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(image)||!Number.isFinite(width)||width<2||width>60)throw new AnalysisError('圖片或比例無效','INVALID_INPUT',400);
  if(!Number.isFinite(height)||height<2||height>5)throw new AnalysisError('樓高須為 2–5 公尺','INVALID_INPUT',400);
  if(isCli&&req.headers.accept?.includes('application/x-ndjson'))return await streamAnalysis(req,res,options=>cliAnalyze({image,width,depth,height,autoScale:autoScale===true,imageWidth,imageHeight,config,...options}),requestId);
  res.json(await (isCli?cliAnalyze:analyzeImage)({image,width,depth,height,autoScale:autoScale===true,imageWidth,imageHeight,config}));
 }catch(e){
  const error=e instanceof AnalysisError?e:new AnalysisError('辨識服務發生非預期錯誤，請稍後重試','INTERNAL_ERROR',500);
  console.warn(`[analyze ${requestId}] ${error.code} HTTP ${error.status}`);
  res.status(error.status).json({error:error.message,code:error.code,requestId});
 }
});
app.use(express.static('dist'));
app.use((err,req,res,next)=>res.status(err.type==='entity.too.large'?413:400).json({error:err.type==='entity.too.large'?'圖片過大，請縮小後再試':'請求格式無效',code:'INVALID_REQUEST'}));
app.listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log('ROOMFORM API http://127.0.0.1:3001'));
