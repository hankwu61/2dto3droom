// Extract the last JSON object without evaluating code or repairing missing data.
// Retain an unfinished final object so an earlier draft cannot mask truncation.
export function extractFinalJson(text){
 if(typeof text!=='string')return text;
 const fences=[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
 if(fences.length){const last=fences.at(-1);const tail=text.slice(last.index+last[0].length);if(!tail.includes('{')&&!tail.includes('```'))return last[1].trim();text=tail.includes('{')?tail:tail.replace(/^\s*```(?:json)?\s*/,'');}
 let start=-1,depth=0,inString=false,escaped=false,last=null;
 for(let i=0;i<text.length;i++){const c=text[i];if(start<0){if(c==='{'){start=i;depth=1;}continue;}if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){last=text.slice(start,i+1);start=-1;}}
 return start>=0?text.slice(start):last||text.trim();
}
