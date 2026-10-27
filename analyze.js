import {validatePlan} from './src/model.js';
import {visionImage,providerError} from './vision.js';
import {PLAN_PROMPT,OPENING_PROMPT} from './vision-prompt.js';

export class AnalysisError extends Error {
 constructor(message,code,status=422){super(message);this.code=code;this.status=status;}
}
const invalid=message=>new AnalysisError(message,'INVALID_PLAN');
const number=value=>typeof value==='string'&&value.trim()!==''?Number(value):value;

// Normalize representation and <= 1 cm boundary errors only. Never drop objects
// or guess wall indices to make invalid model output pass validation.
export function normalizePlan(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw invalid('AI 回傳的配置不是物件');
 const p=structuredClone(input),warnings=[];
 for(const key of ['width','depth','height'])p[key]=number(p[key]);
 for(const [collection,fields] of [['walls',['x1','z1','x2','z2','height','thickness']],['openings',['wall','offset','width','height','sillHeight','swing']],['furniture',['x','z','width','depth','rotation','height']]]){
  if(p[collection]==null&&collection!=='walls')p[collection]=[];
  if(!Array.isArray(p[collection]))throw invalid(`${collection} 必須為陣列`);
  for(const item of p[collection]){
   if(!item||typeof item!=='object'||Array.isArray(item))throw invalid(`${collection} 包含無效物件`);
   if(collection==='furniture'&&typeof item.type==='string'){const aliases={refrigerator:'fridge',washbasin:'basin',wash_basin:'basin',washstand:'basin',kitchen_sink:'sink',cooktop:'stove',wardrobe:'cabinet',bookshelf:'cabinet',dining_table:'table',coffee_table:'table',pillar:'column',washing_machine:'washer',television:'tv',bath_tub:'bathtub'};const type=item.type.trim().toLowerCase().replace(/[ -]+/g,'_');item.type=aliases[type]||type;}
   for(const key of fields)if(key in item)item[key]=number(item[key]);
   if(collection==='furniture'&&item.rotation==null){item.rotation=0;warnings.push('部分家具未提供旋轉角度，暫設為 0°，請核對。');}
  }
 }
 for(const [i,o] of p.openings.entries()){
  if(!Number.isInteger(o.wall)||!p.walls[o.wall])throw invalid(`第 ${i+1} 組門窗的牆面索引無效（須為 0–${p.walls.length-1} 的整數）`);
  const w=p.walls[o.wall],length=Math.hypot(w.x2-w.x1,w.z2-w.z1);
  if(Number.isFinite(o.offset)&&Number.isFinite(o.width)){
   if(o.offset<0&&o.offset>=-.01){o.offset=0;warnings.push('已校正門窗邊界的微小誤差（不超過 1 公分）。');}
   const over=o.offset+o.width-length;
   if(over>0&&over<=.0100001&&length>=o.width){o.offset=length-o.width;warnings.push('已校正門窗邊界的微小誤差（不超過 1 公分）。');}
   if(o.offset<0||o.width<.3||o.offset+o.width>length+.000001)throw invalid(`第 ${i+1} 組門窗超出第 ${o.wall+1} 道牆面：起點 ${o.offset}、寬度 ${o.width}、牆長 ${length.toFixed(3)} 公尺`);
  }
 }
 try{validatePlan(p);}catch(e){throw invalid(e.message);}
 if(Array.isArray(p.openingWarnings))warnings.push(...p.openingWarnings.filter(v=>typeof v==='string').slice(0,10).map(v=>v.slice(0,500)));
 delete p.openingWarnings;
 return {plan:p,warnings:[...new Set(warnings)]};
}

export function parseCompletion(result){
 if(result?.error)throw new AnalysisError('AI 供應商未能完成辨識，請稍後重試','UPSTREAM_ERROR',502);
 const choice=result?.choices?.[0];
 if(choice?.finish_reason==='length')throw new AnalysisError('AI 回應因長度限制被截斷','INCOMPLETE_RESPONSE');
 if(choice?.finish_reason==='content_filter'||choice?.message?.refusal)throw new AnalysisError('AI 服務無法處理此圖片，請改用其他平面圖','IMAGE_REJECTED');
 let content=choice?.message?.content;
 if(Array.isArray(content))content=content.filter(x=>x.type==='text').map(x=>x.text).join('');
 if(typeof content!=='string'||!content.trim())throw new AnalysisError('AI 未回傳辨識內容','INVALID_RESPONSE');
 content=content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let parsed;try{parsed=JSON.parse(content);}catch(e){throw new AnalysisError(`AI 回傳內容不是完整 JSON：${e.message.slice(0,200)}`,'INVALID_RESPONSE');}
 if(parsed?.error)throw new AnalysisError('AI 無法辨識此圖面，請使用清晰且完整的室內平面圖','UNREADABLE_IMAGE');
 return normalizePlan(parsed);
}

export async function analyzeImage({image,width,depth,height=2.8,config,fetchImpl=fetch,timeoutMs=150000}){
 const signal=AbortSignal.timeout(timeoutMs);
 const messages=[{role:'system',content:PLAN_PROMPT+' '+OPENING_PROMPT},{role:'user',content:[{type:'text',text:`Full image width: ${width} meters.${Number.isFinite(depth)?` Full image depth: ${depth} meters.`:""} Set plan height=${height} meters; fit every opening within its host wall height. These canvas dimensions and height are fixed. Recognize this plan.`},visionImage(config,image)]}];
 for(let attempt=0;attempt<2;attempt++){
  let response,result;
  try{
   response=await fetchImpl(config.url,{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},signal,body:JSON.stringify({model:config.model,max_tokens:config.maxTokens||8192,temperature:0,response_format:{type:'json_object'},messages})});
   if(!response.ok)throw new AnalysisError(providerError(response.status,config.label),'PROVIDER_ERROR',[402,429].includes(response.status)?response.status:502);
   try{result=await response.json();}catch(e){if(signal.aborted)throw e;throw new AnalysisError('AI 服務回傳無效回應，請稍後重試','UPSTREAM_ERROR',502);}
  }catch(e){
   if(signal.aborted||e.name==='TimeoutError'||e.name==='AbortError')throw new AnalysisError('辨識逾時，請裁切圖面或稍後重試','TIMEOUT',504);
   if(e instanceof AnalysisError)throw e;
   throw new AnalysisError('無法連線至 AI 服務，請檢查網路後重試','NETWORK_ERROR',502);
  }
  try{
   const {plan,warnings}=parseCompletion(result);
   if(Math.abs(plan.width-width)>.02||(Number.isFinite(depth)&&Math.abs(plan.depth-depth)>.02)||Math.abs(plan.height-height)>.001)throw invalid("模型改變了指定圖面比例或樓高，請依指定值重新計算門窗尺寸");
   return {...plan,analysis:{repaired:attempt>0,warnings:attempt>0?['AI 已重新修正配置，請核對門窗與家具位置。',...warnings]:warnings}};
  }catch(e){
   if(!(e instanceof AnalysisError)||!['INVALID_PLAN','INVALID_RESPONSE','INCOMPLETE_RESPONSE'].includes(e.code))throw e;
   if(attempt===1)throw new AnalysisError(`AI 配置修正後仍未通過檢查：${e.message}。請重試或改用本機辨識。`,e.code);
   const content=result?.choices?.[0]?.message?.content;
   if(typeof content==='string'&&content.trim())messages.push({role:'assistant',content});
   messages.push({role:'user',content:`The result failed validation: ${e.message}. Recheck the ORIGINAL IMAGE and return the complete corrected JSON, with numeric fields and every required field. Keep valid walls, doors, windows and furniture. Do not remove objects just to pass validation. Opening wall must be an integer zero-based index. offset is distance from that wall's START, and offset+width must not exceed its length. Return concise JSON only, without markdown.`});
  }
 }
}
