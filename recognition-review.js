import {AnalysisError} from './analyze.js';
// Anchor coordinates are fractions of the entire source image, including margins.
export function inferScale(data,aspect){
 const anchors=(Array.isArray(data?.anchors)?data.anchors:[]).slice(0,12).filter(a=>typeof a.label==='string'&&Number.isFinite(a.assumedMeters)&&a.assumedMeters>=.3&&a.assumedMeters<=5&&['x1','y1','x2','y2'].every(k=>Number.isFinite(a[k])&&a[k]>=0&&a[k]<=1)).map(a=>({...a,canvasWidth:a.assumedMeters/Math.hypot(a.x2-a.x1,(a.y2-a.y1)*aspect)})).filter(a=>a.canvasWidth>=2&&a.canvasWidth<=60);
 if(anchors.length<2)throw new AnalysisError('找不到至少兩個可信的比例基準，請改用手動圖面寬度。','SCALE_UNCERTAIN');
 const sorted=anchors.map(a=>a.canvasWidth).sort((a,b)=>a-b),median=(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2;
 const accepted=anchors.filter(a=>Math.abs(a.canvasWidth/median-1)<=.2);
 if(accepted.length<2||Math.max(...accepted.map(a=>a.canvasWidth))/Math.min(...accepted.map(a=>a.canvasWidth))>1.3)throw new AnalysisError('比例基準互相矛盾，請輸入手動圖面寬度後重試。','SCALE_UNCERTAIN');
 const width=accepted.reduce((s,a)=>s+a.canvasWidth,0)/accepted.length;
 return {width,depth:width*aspect,anchors:accepted,excludedAnchors:anchors.filter(a=>!accepted.includes(a)),estimated:true,referenceLabel:accepted[0].label,referenceLength:accepted[0].assumedMeters*width/accepted[0].canvasWidth,note:'依常見物件尺寸交叉估算；請用實測尺寸校正。'};
}
export function auditPlan(p){
 const issues=[];
 p.walls.forEach((w,i)=>{for(const [x,z] of [[w.x1,w.z1],[w.x2,w.z2]]){const near=p.walls.some((v,j)=>{if(i===j)return false;const dx=v.x2-v.x1,dz=v.z2-v.z1,t=Math.max(0,Math.min(1,((x-v.x1)*dx+(z-v.z1)*dz)/(dx*dx+dz*dz)));const gap=Math.hypot(x-v.x1-t*dx,z-v.z1-t*dz);return gap>.035&&gap<.22;});if(near){issues.push(`牆 ${i+1} 端點疑似有小縫隙，請對照原圖確認連接。`);break;}}});
 p.furniture.forEach((f,i)=>{const r=f.rotation*Math.PI/180,hx=(Math.abs(Math.cos(r))*f.width+Math.abs(Math.sin(r))*f.depth)/2,hz=(Math.abs(Math.sin(r))*f.width+Math.abs(Math.cos(r))*f.depth)/2;if(f.x-hx<-.05||f.z-hz<-.05||f.x+hx>p.width+.05||f.z+hz>p.depth+.05)issues.push(`物件 ${i+1} 輪廓超出畫布。`);for(let j=0;j<i;j++){const g=p.furniture[j];if(f.type===g.type&&Math.hypot(f.x-g.x,f.z-g.z)<.12)issues.push(`物件 ${j+1} 與 ${i+1} 疑似重複。`);}});
 return [...new Set(issues)].slice(0,25);
}
