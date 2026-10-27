import {AnalysisError} from './analyze.js';

// Keep long CLI calls alive with small phase updates. Disconnecting the browser
// aborts the child process instead of leaving a chargeable task running.
export async function streamAnalysis(req,res,work,requestId){
 const controller=new AbortController();let phase={label:'啟動 AI CLI',stage:'starting'},started=Date.now();
 const write=data=>{if(!res.destroyed&&!res.writableEnded)res.write(JSON.stringify(data)+'\n');};
 const progress=()=>write({type:'progress',...phase,elapsedMs:Date.now()-started,requestId});
 const close=()=>{if(!res.writableEnded)controller.abort();};
 res.on('close',close);res.setTimeout(0);
 res.status(200).set({'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();
 progress();const heartbeat=setInterval(progress,10000);
 try{
  const plan=await work({signal:controller.signal,onProgress:event=>{phase=event;started=Date.now();progress();}});
  write({type:'result',plan,requestId});
 }catch(e){
  const error=e instanceof AnalysisError?e:new AnalysisError('辨識服務發生非預期錯誤，請稍後重試。','INTERNAL_ERROR',500);
  console.warn(`[analyze ${requestId}] ${error.code} HTTP ${error.status}`);
  write({type:'error',error:error.message,code:error.code,status:error.status,requestId});
 }finally{clearInterval(heartbeat);res.off('close',close);if(!res.destroyed)res.end();}
}
