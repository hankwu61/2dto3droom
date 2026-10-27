// Conservative symbol recognition in pixel space. Only reconnect a wall gap
// when it contains parallel window rails or a door leaf AND a quarter swing arc.
// An empty gap is not evidence of a door.
export function recognizeOpenings(lines,dark,metersPerPixel){
 const groups=[];
 for(const line of [...lines].sort((a,b)=>b.thickness-a.thickness)){
  const group=groups.find(g=>g.axis===line.axis&&Math.abs(g.b-line.b)<=Math.max(2,g.thickness*.45));
  if(group)group.lines.push(line);else groups.push({...line,lines:[line]});
 }
 const walls=[],openings=[],leaves=[];
 for(const group of groups){
  const structural=group.lines.filter(l=>l.thickness>=Math.max(2,group.thickness*.6)).sort((a,b)=>a.start-b.start);
  const sample=(a,b)=>group.axis?dark(Math.round(b),Math.round(a)):dark(Math.round(a),Math.round(b));
  const tolerance=Math.max(1,Math.min(3,Math.round(group.thickness*.2)));
  const nearby=(a,b)=>{for(let da=-tolerance;da<=tolerance;da++)for(let db=-tolerance;db<=tolerance;db++)if(sample(a+da,b+db))return true;return false;};
  function symbol(start,end){
   const span=end-start,b=group.b,t=group.thickness;
   if(span*metersPerPixel<.45||span*metersPerPixel>3.5||span<t*2)return null;
   // Window rails must run most of the gap, with white space between them.
   const bands=[];let active=false;
   for(let n=Math.floor(b-t/2);n<=Math.ceil(b+t/2);n++){
    let hits=0;for(let k=1;k<20;k++)if(sample(start+span*k/20,n))hits++;
    const on=hits>=16;
    if(on&&!active)bands.push({start:n,end:n});
    if(on)bands.at(-1).end=n;
    active=on;
   }
   const windowFrame=bands.length>=2&&bands.every(r=>r.end-r.start+1<=Math.max(2,t*.4));
   // Test both jambs and both sides, so vertical/mirrored plans work too.
   for(const hinge of ['start','end'])for(const side of [-1,1]){
    const origin=hinge==='start'?start:end,direction=hinge==='start'?1:-1;
    let leaf=0,arc=0;
    for(let k=2;k<19;k++){
     if(nearby(origin,b+side*span*k/20))leaf++;
     const angle=k/20*Math.PI/2;
     if(nearby(origin+direction*span*Math.cos(angle),b+side*span*Math.sin(angle)))arc++;
    }
    if(leaf>=13&&arc>=12){
     leaves.push({axis:1-group.axis,b:origin,start:Math.min(b,b+side*span),end:Math.max(b,b+side*span)});
     return {type:'door',style:'hinged',hinge,swing:group.axis?-side:side};
    }
   }
   // A closed door jamb can contain two parallel lines as well. Give a
   // confirmed swing arc priority over the window-frame interpretation.
   if(windowFrame)return {type:'window'};
   // A partly open sliding panel has paired rails running from one jamb,
   // a closed end cap, then clear passage. Keep the full jamb-to-jamb aperture.
   const panels=[];
   for(let n=Math.ceil(b-t*.45);n<=Math.floor(b+t*.45);n++){
    for(const edge of ['start','end']){
     const direction=edge==='start'?1:-1,origin=edge==='start'?start:end;
     let hits=0,last=0,misses=0;
     for(let k=2;k<=Math.floor(span)-2;k++){
      if(sample(origin+direction*k,n)){hits++;last=k;misses=0;}else if(++misses>2)break;
     }
     if(last>=span*.4&&last<=span*.8&&hits>=last*.85)panels.push({n,edge,extent:last});
    }
   }
   for(const a of panels)for(const c of panels){
    if(c.n-a.n<Math.max(3,t*.25)||a.edge!==c.edge||Math.abs(a.extent-c.extent)>2)continue;
    const cap=(a.edge==='start'?start:end)+(a.edge==='start'?1:-1)*(a.extent+c.extent)/2;
    let closed=0;for(let n=a.n;n<=c.n;n++)if(sample(cap-1,n)||sample(cap,n)||sample(cap+1,n))closed++;
    if(closed/(c.n-a.n+1)>=.85)return {type:'door',style:'sliding'};
   }
   return null;
  }
  let current=null,pending=[];
  function flush(){
   if(!current)return;
   const s=metersPerPixel,wall=walls.length;
   walls.push(group.axis?{x1:group.b*s,z1:current.start*s,x2:group.b*s,z2:current.end*s}:{x1:current.start*s,z1:group.b*s,x2:current.end*s,z2:group.b*s});
   for(const o of pending)openings.push({...o,wall,offset:(o.start-current.start)*s,width:(o.end-o.start)*s});
   pending=[];
  }
  for(const line of structural){
   if(!current){current={...line};continue;}
   if(line.start<=current.end+2){current.end=Math.max(current.end,line.end);continue;}
   const match=symbol(current.end,line.start);
   if(match){pending.push({...match,start:current.end,end:line.start});current.end=line.end;}
   else{flush();current={...line};}
  }
  flush();
 }
 // Internal pixel measurements must never leak into saved model coordinates.
 const indexMap=new Map(),kept=[];
 walls.forEach((w,i)=>{
  const s=metersPerPixel,axis=w.x1===w.x2?1:0,b=(axis?w.x1:w.z1)/s,start=(axis?w.z1:w.x1)/s,end=(axis?w.z2:w.x2)/s;
  // A thin open door leaf can also satisfy the wall-run detector. Remove only
  // runs matching a confirmed swing leaf; leave structural jambs intact.
  const isLeaf=leaves.some(l=>l.axis===axis&&Math.abs(l.b-b)<=2&&Math.abs(l.start-start)<=4&&Math.abs(l.end-end)<=4);
  if(!isLeaf&&kept.length<250){indexMap.set(i,kept.length);kept.push(w);}
 });
 return {walls:kept,openings:openings.filter(o=>indexMap.has(o.wall)).slice(0,150).map(({start,end,...o})=>({...o,wall:indexMap.get(o.wall)}))};
}
