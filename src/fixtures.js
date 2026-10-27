import * as T from 'three';
// Each fixture is built at its footprint size and has a distinct silhouette.
export function buildFixture(g,f,box){
 const w=f.width,d=f.depth,white=0xf4f1ea,metal=0x929e9e,dark=0x293536,wood=0xc0a080;
 const b=(ww,h,dd,x,y,z,c=white)=>box(g,ww,h,dd,x,y,z,c);
 function ellipse(rx,ry,rz,x,y,z,c){const m=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:c,roughness:.45}));m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function disc(r,h,x,y,z,c){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,32),new T.MeshStandardMaterial({color:c,roughness:.45}));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
 function faucet(x,y,z){b(.035,.25,.035,x,y+.125,z,metal);b(.035,.035,.16,x,y+.23,z+.07,metal);}
 function bowl(x,y,z,ww,dd){b(ww,.035,dd,x,y,z,metal);b(ww*.74,.01,dd*.68,x,y+.02,z,0x647d81);for(const xx of [-ww/2,ww/2])b(.025,.035,dd,xx+x,y+.035,z,white);for(const zz of [-dd/2,dd/2])b(ww,.035,.025,x,y+.035,z+zz,white);}
 function countertop(){b(w,.83,d,0,.415,0,wood);b(w+.012,.045,d+.012,0,.855,0,white);for(let i=0;i<Math.max(1,Math.round(w/.5));i++){const n=Math.max(1,Math.round(w/.5));b(w/n-.015,.7,.012,-w/2+(i+.5)*w/n,.45,d/2+.008,wood);b(Math.min(.15,w/n*.5),.025,.025,-w/2+(i+.5)*w/n,.69,d/2+.025,metal);}}
 if(f.type==='bathtub'){
  b(w,.12,d,0,.08,0);b(w*.77,.08,d*.85,0,.18,0,0xd4e0dc);
  for(const x of [-w/2+.045,w/2-.045])b(.09,.5,d,x,.31,0);
  for(const z of [-d/2+.055,d/2-.055])b(w,.5,.11,0,.31,z);
  faucet(w*.28,.55,-d*.36);disc(.025,.01,0,.226,-d*.24,metal);
 }
 if(f.type==='toilet'){
  ellipse(w*.32,.22,d*.29,0,.22,d*.08,white);ellipse(w*.48,.1,d*.38,0,.43,d*.05,white);
  ellipse(w*.32,.015,d*.25,0,.525,d*.07,0x73888a);
  const ring=new T.Mesh(new T.TorusGeometry(1,.15,10,40),new T.MeshStandardMaterial({color:white}));ring.rotation.x=-Math.PI/2;ring.scale.set(w*.39,d*.29,.07);ring.position.set(0,.54,d*.07);g.add(ring);
  b(w*.83,.56,d*.21,0,.49,-d*.36);b(w*.88,.035,d*.23,0,.79,-d*.36);disc(.025,.01,0,.815,-d*.36,metal);
 }
 if(f.type==='basin'){b(w,.73,d,0,.365,0,wood);b(w,.06,d,0,.77,0);bowl(0,.81,0,w*.76,d*.7);faucet(0,.8,-d*.37);}
 if(['counter','sink','stove'].includes(f.type)){
  countertop();if(f.type==='sink'){bowl(0,.887,.015,w*.65,d*.65);faucet(0,.89,-d*.36);}
  if(f.type==='stove'){b(w*.87,.018,d*.83,0,.888,0,dark);for(const x of [-w*.23,w*.23]){disc(Math.min(w*.14,d*.21),.012,x,.904,0,metal);disc(Math.min(w*.095,d*.145),.016,x,.915,0,dark);}for(const x of [-w*.15,w*.15])disc(.025,.012,x,.91,d*.3,metal);b(w*.75,.34,.018,0,.48,d/2+.02,dark);b(w*.6,.028,.05,0,.68,d/2+.04,metal);}
 }
 if(f.type==='fridge'){
  b(w,1.85,d,0,.925,0,0xb9c4c2);b(w*.96,.64,.025,0,1.5,d/2+.013,0xdbe2de);b(w*.96,1.09,.025,0,.595,d/2+.013,0xdbe2de);b(.035,.36,.04,-w*.35,1.48,d/2+.05,dark);b(.035,.5,.04,-w*.35,.78,d/2+.05,dark);
 }
 if(f.type==='column')b(w,2.8,d,0,1.4,0,0xc4c6bf);
 if(f.type==='shower'){
  b(w,.07,d,0,.035,0,0xd8dfdc);disc(.03,.015,0,.08,0,metal);
  const glass=b(w,1.95,.025,0,1.04,-d/2,0xa2cbd0);glass.material.transparent=true;glass.material.opacity=.25;
  const side=b(.025,1.95,d,w/2,1.04,0,0xa2cbd0);side.material.transparent=true;side.material.opacity=.25;
  for(const x of [-w/2,w/2])b(.025,2,.025,x,1.05,-d/2,metal);
  b(.03,1.3,.03,0,1.25,-d*.43,metal);b(.2,.035,.22,0,1.96,-d*.32,metal);
 }
 if(f.type==='washer'){
  b(w,.87,d,0,.435,0);b(w*.94,.12,.025,0,.76,d/2+.012,0xd9dfda);
  const ring=new T.Mesh(new T.TorusGeometry(w*.28,.035,12,40),new T.MeshStandardMaterial({color:metal}));ring.position.set(0,.39,d/2+.025);g.add(ring);
  const door=new T.Mesh(new T.CircleGeometry(w*.24,32),new T.MeshStandardMaterial({color:0x46626b,roughness:.2}));door.position.set(0,.39,d/2+.03);g.add(door);b(.09,.045,.02,w*.24,.76,d/2+.03,dark);
 }
 if(f.type==='tv'){b(w*.4,.045,d,0,.045,0,dark);b(.055,.26,.055,0,.18,0,dark);b(w,w*.57,.055,0,w*.285+.27,0,dark);b(w*.94,w*.51,.008,0,w*.285+.27,.033,0x3d6067);}
 if(f.type==='roundtable'){disc(Math.min(w,d)/2,.06,0,.48,0,wood);disc(.045,.44,0,.23,0,dark);disc(Math.min(w,d)*.3,.035,0,.025,0,dark);}
}
