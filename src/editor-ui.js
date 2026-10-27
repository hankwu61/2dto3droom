import {openingGeometry} from './openings.js';
import {catalog} from './catalog.js';
import {getEntity,editEntity,duplicateEntity} from './editor.js';
const labels={wall:'牆面',opening:'門窗',furniture:'家具'};
const legacyNames={sofa:'沙發',bed:'床',table:'桌子',chair:'椅子',cabinet:'櫃體',plant:'植栽',block:'自訂方塊',door:'門',window:'窗'};
const typeNames={mesh:'匯入網格',...legacyNames,...Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v.name]))};
export function mountEditor({getPlan,getSelection,select,commit,scene,notify,undo,redo}){
 const panel=document.createElement('section');panel.className='object-inspector';
 panel.innerHTML=`<div class="panel-heading"><h2>物件屬性</h2><span>INSPECTOR</span></div><select id="object-list" aria-label="選取物件"></select><p class="hint" id="selection-help">點擊 3D 物件或從清單選取，即可拖曳與編輯。</p><form id="object-form" hidden><div id="property-fields" class="property-grid"></div><label id="finish-field" class="field">表面材質<select id="material-finish"><option value="matte">霧面</option><option value="wood">木紋</option><option value="fabric">織布</option><option value="metal">金屬</option></select></label><label id="material-field" class="field">材質色彩<div class="material-row"><input id="material-color" type="color" value="#ba9170" aria-label="物件材質顏色"><button type="button" data-color="#ba9170" style="--swatch:#ba9170" title="原木"></button><button type="button" data-color="#f3f1e9" style="--swatch:#f3f1e9" title="暖白"></button><button type="button" data-color="#829b89" style="--swatch:#829b89" title="鼠尾草綠"></button><button type="button" data-color="#454e48" style="--swatch:#454e48" title="石墨灰"></button></div></label><button class="primary wide" type="submit">套用尺寸與材質</button><button id="duplicate" type="button" class="wide">複製物件</button></form><p id="property-error" class="analysis-error" role="alert" hidden></p>`;
 document.querySelector('.panel').prepend(panel);
 const toolbar=document.createElement('div');toolbar.className='model-toolbar';toolbar.innerHTML=`<div class="transform-tools"><button data-transform="select" class="chosen" title="選取 (V)">↖ 選取 <kbd>V</kbd></button><button data-transform="translate" title="移動 (M)">✥ 移動 <kbd>M</kbd></button><button data-transform="rotate" title="旋轉 (R)">↻ 旋轉 <kbd>R</kbd></button><button data-transform="scale" title="縮放 (S)">⤢ 縮放 <kbd>S</kbd></button></div><div class="model-options"><button id="editor-undo" title="復原 Ctrl+Z">↶</button><button id="redo" title="重做 Ctrl+Shift+Z">↷</button><label><input type="checkbox" id="snap" checked>吸附 10 cm / 15°</label><label><input type="checkbox" id="grid">格線</label><label><input type="checkbox" id="cutaway">低牆檢視</label></div>`;
 document.querySelector('.stage-top').after(toolbar);
 const list=panel.querySelector('#object-list'),form=panel.querySelector('form'),fields=panel.querySelector('#property-fields'),error=panel.querySelector('#property-error');
 function report(e){error.textContent=e.message;error.hidden=false;notify(e.message);}
 const definitions={furniture:[['x','位置 X'],['z','位置 Z'],['width','寬度'],['depth','深度'],['height','高度'],['rotation','旋轉 °']],wall:[['x1','起點 X'],['z1','起點 Z'],['x2','終點 X'],['z2','終點 Z'],['height','牆高']],opening:[['wall','牆面編號（從 1 起）'],['offset','距牆起點'],['width','開口寬度'],['height','開口高度'],['sillHeight','窗台高度']]};
 function render(){
  const plan=getPlan(),selection=getSelection(),entity=getEntity(plan,selection);
  list.replaceChildren(new Option('選取物件…',''));
  for(const [kind,collection] of [['wall','walls'],['opening','openings'],['furniture','furniture']])plan[collection].forEach((e,i)=>list.add(new Option(`${e.name||typeNames[e.type]||labels[kind]} ${i+1}`,`${kind}:${i}`)));
  list.value=entity?`${selection.kind}:${selection.i}`:'';form.hidden=!entity;error.hidden=true;
  if(!entity){panel.querySelector('#selection-help').textContent='點擊 3D 物件或從清單選取，即可拖曳與編輯。';return;}
  panel.querySelector('#selection-help').textContent=selection.kind==='opening'?'門窗沿所屬牆面定位；可調整寬、高、窗台及開門方向。無高度標註時使用估算值。單位：公尺。':'拖曳彩色操作軸，或輸入精確數值。尺寸單位：公尺。';
  fields.replaceChildren();
  for(const [key,label] of definitions[selection.kind]){
   const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.name=key;input.required=true;input.step=key==='wall'?'1':'0.001';
   let value=entity[key];if(selection.kind==='opening'){const geometry=openingGeometry(plan,entity);if(key==='height')value=geometry.height;if(key==='sillHeight')value=geometry.bottom;}if(key==='height')value??=selection.kind==='wall'?plan.height:scene?.getSelectionHeight()||1;if(key==='wall')value+=1;
   input.value=Number(value).toFixed(key==='wall'?0:3);wrap.append(input);fields.append(wrap);
  }
  if(selection.kind==='opening'){
   for(const [key,label,options,value] of [
    ['style','樣式',[['hinged','平開'],['sliding','推拉']],entity.style||'hinged'],
    ...(entity.type==='door'?[['hinge','門鉸位置',[['start','開口起端'],['end','開口末端']],entity.hinge||'start'],['swing','開門側',[['1','牆面正側'],['-1','牆面反側']],String(entity.swing??1)]]:[])
   ]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('select');input.name=key;for(const [v,text] of options)input.add(new Option(text,v));input.value=value;wrap.append(input);fields.append(wrap);}
  }
  panel.querySelector('#material-field').hidden=selection.kind==='opening';panel.querySelector('#finish-field').hidden=selection.kind==='opening';panel.querySelector('#material-finish').value=entity.finish||'matte';panel.querySelector('#material-color').value=entity.color||(selection.kind==='wall'?'#f3f1e9':'#ba9170');
 }
 list.onchange=()=>{const [kind,i]=list.value.split(':');select(kind?{kind,i:Number(i)}:null);};
 form.onsubmit=e=>{e.preventDefault();try{const selection=getSelection(),patch={};for(const input of fields.querySelectorAll('input'))patch[input.name]=Number(input.value)-(input.name==='wall'?1:0);for(const input of fields.querySelectorAll('select'))patch[input.name]=input.name==='swing'?Number(input.value):input.value;if(selection.kind!=='opening'){patch.color=panel.querySelector('#material-color').value;patch.finish=panel.querySelector('#material-finish').value;}commit(editEntity(getPlan(),selection,patch),selection);}catch(e){report(e);}};
 panel.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{panel.querySelector('#material-color').value=b.dataset.color;form.requestSubmit();});
 panel.querySelector('#duplicate').onclick=()=>{try{const result=duplicateEntity(getPlan(),getSelection());commit(result.plan,result.selection);}catch(e){report(e);}};
 function setTool(value){toolbar.querySelectorAll('[data-transform]').forEach(b=>b.classList.toggle('chosen',b.dataset.transform===value));scene?.setEditMode(value);}
 toolbar.querySelectorAll('[data-transform]').forEach(b=>b.onclick=()=>setTool(b.dataset.transform));
 toolbar.querySelector('#snap').onchange=e=>scene?.setSnap(e.target.checked);toolbar.querySelector('#grid').onchange=e=>scene?.setGrid(e.target.checked);
 toolbar.querySelector('#cutaway').onchange=e=>scene?.setCutaway(e.target.checked);
 toolbar.querySelector('#editor-undo').onclick=undo;toolbar.querySelector('#redo').onclick=redo;
 window.addEventListener('keydown',e=>{
  if(document.pointerLockElement||e.target.closest('input,select,textarea,[contenteditable]'))return;
  if(e.ctrlKey||e.metaKey){if(e.code==='KeyZ'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.code==='KeyY'){e.preventDefault();redo();}return;}
  const key={KeyV:'select',KeyM:'translate',KeyR:'rotate',KeyS:'scale'}[e.code];if(key){e.preventDefault();setTool(key);}
  if(e.code==='Delete'){e.preventDefault();document.querySelector('#delete').click();}
 });
 return {render,setTool,updateHistory(canUndo,canRedo){toolbar.querySelector('#editor-undo').disabled=!canUndo;toolbar.querySelector('#redo').disabled=!canRedo;}};
}
