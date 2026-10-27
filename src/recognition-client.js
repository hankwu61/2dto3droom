export const analysisBudget=(timeoutMs=600000,autoScale=true)=>(timeoutMs+5000)*(autoScale?4:3)+60000;
const failure=data=>Object.assign(Error(`${data.error||'辨識失敗'}${data.requestId?`（追蹤碼：${data.requestId}）`:''}`),{code:data.code,status:data.status});

export async function recognizeRemote(input,{signal,onProgress=()=>{},fetchImpl=fetch}={}){
 const response=await fetchImpl('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(input),signal});
 if(!response.ok){let data;try{data=await response.json();}catch{throw Error(`辨識服務回應無效（HTTP ${response.status}）`);}throw failure(data);}
 // Keep compatibility with API providers and older servers returning JSON.
 if(!response.headers.get('content-type')?.includes('application/x-ndjson'))return response.json();
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
 function record(line){
  let event;try{event=JSON.parse(line);}catch{throw Error('辨識進度回應無效，請確認後端版本。');}
  if(event.type==='error')throw failure(event);
  if(event.type==='progress')onProgress(event);
  if(event.type==='result')return event.plan;
 }
 try{
  while(true){
   const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});
   const lines=pending.split('\n');pending=lines.pop();
   for(const line of lines){if(!line.trim())continue;const plan=record(line);if(plan)return plan;}
   if(done){if(pending.trim()){const plan=record(pending);if(plan)return plan;}throw Error('辨識連線提前結束，未收到完整配置。原專案未變更。');}
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
