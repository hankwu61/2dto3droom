// Shared by validation, the inspector and rendering. Legacy plans retain their
// former 2.2 m head / 0.9 m sill, limited to the actual wall height.
export function openingGeometry(plan, opening){
 const wall=plan.walls[opening.wall],length=Math.hypot(wall.x2-wall.x1,wall.z2-wall.z1);
 const wallHeight=wall.height??plan.height;
 const bottom=opening.sillHeight??(opening.type==='window'?Math.min(.9,wallHeight*.4):0);
 const height=opening.height??Math.min(opening.type==='window'?1.3:2.2,wallHeight-.1-bottom);
 const distance=opening.offset+opening.width/2;
 return {bottom,top:bottom+height,height,wallHeight,length,
  x:wall.x1+(wall.x2-wall.x1)*distance/length,
  z:wall.z1+(wall.z2-wall.z1)*distance/length,
  rotation:-Math.atan2(wall.z2-wall.z1,wall.x2-wall.x1)};
}
