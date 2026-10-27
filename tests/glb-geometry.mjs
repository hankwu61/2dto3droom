import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent??=class ProgressEvent extends Event{
 constructor(type,init={}){super(type);Object.assign(this,init);}
};
// Geometry assertions run in Node, where DOM image decoding is unavailable.
// The browser tests load/render the actual embedded textures separately.
export function glbJson(bytes){
 if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB');
 return JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
}
export async function loadGlbGeometry(bytes){
 const data=glbJson(bytes),binaryOffset=20+bytes.readUInt32LE(12);
 const binary=bytes.subarray(binaryOffset+8,binaryOffset+8+bytes.readUInt32LE(binaryOffset));
 data.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
 const strip=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(/texture$/i.test(key))delete value[key];else strip(value[key]);}};
 for(const material of data.materials||[])strip(material);
 delete data.images;delete data.textures;delete data.samplers;
 return new GLTFLoader().parseAsync(JSON.stringify(data),'');
}
