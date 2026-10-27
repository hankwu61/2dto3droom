import {mkdir,writeFile} from 'node:fs/promises';
import {validatePlan} from '../src/model.js';
const s=.018,ox=145,oy=85;
const point=(x,z)=>({x:+((x-ox)*s).toFixed(4),z:+((z-oy)*s).toFixed(4)});
const plan={name:'pp4 · 完整估算配置',width:12.6,depth:11.52,height:2.8,
 scale:{estimated:true,metersPerPixel:s,referenceLength:1.962,referenceLabel:'兒童床長',source:'pp4.jpg',crop:{x:ox,y:oy,width:700,height:640},anchors:[{label:'兒童床長',pixels:109,assumedMeters:2},{label:'室內門洞',pixels:50,assumedMeters:.9},{label:'玄關門洞',pixels:62,assumedMeters:1.1}],note:'採約 0.018 m/px 的統一估算比例；床、門符號非精密量測。層高 2.8m、櫃高及材質均為模擬。'},
 outline:[[150,127],[204,127],[204,177],[567,177],[567,127],[615,127],[615,94],[837,94],[837,694],[649,694],[649,723],[584,723],[584,694],[444,694],[444,545],[177,545],[177,181],[150,181]].map(([x,z])=>point(x,z)),
 walls:[],openings:[],furniture:[],rooms:[],spawn:point(795,601),
 notes:['北側主臥、書房及左側向外開啟的符號暫按窗處理，需依現場確認。','中央衛浴右側按淋浴間模擬，玻璃位置為推定。','工作陽台下方方形設備按洗衣機、上方按設備櫃模擬，非確定辨識。','厚黑區按矩形柱量體建模，非結構設計尺寸。','客廳、餐廳、玄關、廚房之間的櫃體分隔依圖描繪，未額外添加實牆。']};
const wall=(name,x1,z1,x2,z2,height=2.8,thickness=.145)=>{const a=point(x1,z1),b=point(x2,z2);plan.walls.push({name,x1:a.x,z1:a.z,x2:b.x,z2:b.z,height,thickness});return plan.walls.length-1;};
const opening=(wall,type,offsetPx,widthPx,extra={})=>plan.openings.push({wall,type,offset:offsetPx*s,width:widthPx*s,...extra});
const north=wall('北側外牆',177,177,837,177);
opening(north,'window',272-177,130);opening(north,'window',457-177,108);opening(north,'door',645-177,165,{style:'sliding',name:'客廳陽台玻璃拉門'});
const west=wall('西側外牆',177,177,177,545);
opening(west,'window',187-177,38,{name:'衛浴高窗（推定）'});opening(west,'window',285-177,36,{name:'衛浴側窗（推定）'});opening(west,'window',422-177,83,{name:'兒童房窗'});
wall('東側外牆',837,94,837,694);
const south=wall('南側外牆',444,694,837,694);opening(south,'door',770-444,62,{name:'玄關大門'});
wall('兒童房南牆',177,545,400,545);
const bathSouth=wall('中央衛浴南牆',400,545,551,545);opening(bathSouth,'door',407-400,35,{name:'工作陽台側門（依圖推定）'});
const serviceWest=wall('工作陽台西側',444,545,444,694);opening(serviceWest,'window',555-545,128,{name:'工作陽台外窗'});
wall('客廳陽台欄牆',615,94,837,94,1.05,.12);wall('客廳陽台側欄牆',615,94,615,177,1.05,.12);
const masterBath=wall('主臥／主衛分隔',267,177,267,385);opening(masterBath,'door',337-177,44);
wall('主臥／書房分隔',454,177,454,385);
wall('書房／客廳分隔',615,177,615,385);
const bedroomsSouth=wall('臥室／書房南牆',177,385,615,385);opening(bedroomsSouth,'door',369-177,46);opening(bedroomsSouth,'door',563-177,47);
const kidEntry=wall('兒童房入口牆',363,385,363,451);opening(kidEntry,'door',6,49);
const bathNorth=wall('中央衛浴北牆',363,451,551,451);opening(bathNorth,'door',461-363,37);
wall('兒童房／中央衛浴分隔',399,451,399,545);
const serviceEast=wall('工作陽台／廚房分隔',551,451,551,694);opening(serviceEast,'door',595-451,47);
function item(type,name,x,z,widthPx,depthPx,rotation=0,height,extra={}){const f={type,name,...point(x,z),width:+(widthPx*s).toFixed(4),depth:+(depthPx*s).toFixed(4),rotation,...extra};if(height)f.height=height;plan.furniture.push(f);}
// Bedrooms and study.
item('bed','主臥雙人床（估算）',325,261,100,111,270,.75);
item('cabinet','主臥床邊櫃 A',282,197,23,24,0,.48);
item('cabinet','主臥床邊櫃 B',282,326,23,24,0,.48);
item('cabinet','主臥衣櫃',432,281,196,30,90,2.4);
item('cabinet','書房書櫃',464,281,195,17,90,2.2);
item('table','雙人工作桌',542,201,128,32,0,.75);
item('chair','工作椅 A',501,229,27,28,180,.85);
item('chair','工作椅 B',555,229,27,28,180,.85);
item('chair','書房休閒椅',510,350,44,46,35,.85,{color:'#c4b496'});
item('roundtable','書房圓几',494,313,22,22,0,.52);
item('bed','兒童床（比例參照）',269,484,66,109,180,.65);
item('chair','兒童房座椅',210,489,27,30,0,.8);
item('cabinet','兒童房床邊櫃 A',227,530,20,23,0,.46);
item('cabinet','兒童房床邊櫃 B',317,530,24,23,0,.46);
item('cabinet','兒童房衣櫃',381,497,84,29,90,2.3);
// Living and dining.
item('sofa','客廳三人沙發',643,285,166,47,270,.92);
item('table','客廳長茶几',738,318,61,24,90,.42);
item('table','客廳邊几',726,276,20,26,0,.5);
item('cabinet','客廳電視矮櫃',822,288,192,20,90,.55);
item('tv','客廳電視',819,283,83,12,90,1.28);
item('table','餐桌',682,512,49,90,0,.76);
for(const [x,z,r] of [[646,487,270],[646,537,270],[720,487,90],[720,537,90]])item('chair','餐椅',x,z,23,25,r,.82);
item('counter','吧台',683,575,101,38,0,1.02);
item('cabinet','餐廳／廚房收納櫃',569,521,142,29,90,2.3);
item('cabinet','玄關鞋櫃',748,623,131,22,90,2.3);
// Baths and kitchen: semantic models, not generic blocks.
item('bathtub','主衛浴缸',221,208,40,76,90,.58);
item('toilet','主衛馬桶',201,309,26,38,270,.8);
item('basin','主衛洗手台',198,360,31,27,270,.88);
item('basin','中央衛浴洗手台',425,524,30,28,0,.86);
item('toilet','中央衛浴馬桶',477,519,27,38,0,.8);
item('shower','中央衛浴淋浴間（推定）',525,486,45,65,0,2.05);
item('stove','雙口爐與下櫃',577,667,46,48,180,.9);
item('counter','廚房備餐櫃',625,667,47,48,180,.9);
item('sink','廚房水槽櫃',670,667,41,48,180,1.12);
item('fridge','冰箱',712,667,40,47,180,1.85);
item('washer','工作陽台洗衣機（推定）',517,668,40,39,0,.88);
item('cabinet','工作陽台設備櫃（推定）',525,571,38,42,0,.9);
item('column','西北柱體（估算）',177,154,54,54,0,2.8);
item('column','北側柱體（估算）',594,154,54,54,0,2.8);
item('column','南側柱體（估算）',616.5,699,65,48,0,2.8);
const room=(name,rect,color)=>{const [x1,z1,x2,z2]=rect;plan.rooms.push({name,color,polygon:[[x1,z1],[x2,z1],[x2,z2],[x1,z2]].map(([x,z])=>point(x,z))});};
room('主臥',[267,177,454,385],'#d4bfa1');room('主衛',[177,177,267,385],'#d9e1dc');room('書房',[454,177,615,385],'#d6c6ad');room('兒童房',[177,385,399,545],'#d8c5a5');room('衛浴',[399,451,551,545],'#dae3df');room('客廳',[615,177,837,445],'#e2d2b8');room('餐廳',[585,445,837,557],'#ddd0bb');room('廚房',[551,595,735,694],'#d9ddd5');room('玄關',[759,557,837,694],'#dbd5c9');room('工作陽台',[444,545,551,694],'#c8d2cc');room('陽台',[615,94,837,177],'#cbd6cf');
validatePlan(plan);await mkdir('public/projects',{recursive:true});await writeFile('public/projects/pp4.json',JSON.stringify(plan,null,2));
console.log(JSON.stringify({walls:plan.walls.length,openings:plan.openings.length,objects:plan.furniture.length}));
