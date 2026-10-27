import {validatePlan} from './model.js';
export function rescalePlan(input,factor){
 if(!Number.isFinite(factor)||factor<=0||factor>5)throw Error('比例倍率須大於 0 且不超過 5');
 const p=structuredClone(input);p.width*=factor;p.depth*=factor;
 for(const w of p.walls){for(const k of ['x1','z1','x2','z2'])w[k]*=factor;if(w.thickness)w.thickness*=factor;}
 for(const o of p.openings){o.offset*=factor;o.width*=factor;}
 for(const f of p.furniture)for(const k of ['x','z','width','depth'])f[k]*=factor;
 for(const point of p.outline||[])for(const k of ['x','z'])point[k]*=factor;
 for(const room of p.rooms||[]){for(const point of room.polygon)for(const k of ['x','z'])point[k]*=factor;}
 if(p.spawn){p.spawn.x*=factor;p.spawn.z*=factor;}
 if(p.scale){p.scale.metersPerPixel*=factor;p.scale.referenceLength*=factor;p.scale.estimated=true;}
 return validatePlan(p);
}
export function polygonArea(points){return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z;},0))/2;}
export function insidePolygon(x,z,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
