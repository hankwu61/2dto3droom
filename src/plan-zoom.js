export function mountPlanZoom(canvas,{redraw}){
 const card=canvas.parentElement,original={width:canvas.width,height:canvas.height};
 const expand=document.createElement('button');expand.id='plan-expand';expand.type='button';expand.textContent='⤢ 放大';expand.setAttribute('aria-label','放大平面導覽圖');expand.setAttribute('aria-haspopup','dialog');
 card.querySelector('div').append(expand);
 const dialog=document.createElement('dialog');dialog.id='plan-zoom';dialog.setAttribute('aria-labelledby','plan-zoom-title');
 dialog.innerHTML=`<div class="plan-zoom-heading"><div><h2 id="plan-zoom-title">平面導覽 / 編輯</h2><p>點選物件查看位置；可沿用目前的平面編輯工具。按 Esc 或點擊外側關閉。</p></div><button id="plan-zoom-close" type="button" autofocus aria-label="關閉放大平面圖">✕ 關閉</button></div><div class="plan-zoom-tools" aria-label="平面編輯工具"><button type="button" data-plan-tool="select">選取</button><button type="button" data-plan-tool="wall">牆面</button><button type="button" data-plan-tool="door">門</button><button type="button" data-plan-tool="window">窗</button><span id="plan-zoom-mode"></span></div><div class="plan-zoom-body"></div>`;
 document.body.append(dialog);const body=dialog.querySelector('.plan-zoom-body');let opener=expand;
 function resize(){
  if(!dialog.open)return;const rect=body.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;redraw();}
 }
 function updateMode(){
  dialog.querySelector('#plan-zoom-mode').textContent=card.querySelector('#plan-mode').textContent;
  dialog.querySelectorAll('[data-plan-tool]').forEach(button=>button.classList.toggle('chosen',!!document.querySelector(`[data-tool="${button.dataset.planTool}"]`)?.classList.contains('chosen')));
 }
 function open(trigger){
  if(dialog.open)return;opener=trigger;body.append(canvas);canvas.removeAttribute('role');canvas.setAttribute('aria-label','放大的平面導覽與編輯畫布');dialog.showModal();updateMode();resize();
 }
 canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','點擊放大平面導覽圖');canvas.setAttribute('aria-haspopup','dialog');
 canvas.addEventListener('click',event=>{if(!dialog.open){event.stopImmediatePropagation();open(expand);}});
 canvas.addEventListener('keydown',event=>{if(!dialog.open&&['Enter',' '].includes(event.key)){event.preventDefault();open(expand);}});
 expand.onclick=()=>open(expand);
 dialog.querySelector('#plan-zoom-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
 dialog.addEventListener('close',()=>{
  card.append(canvas);canvas.width=original.width;canvas.height=original.height;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','點擊放大平面導覽圖');redraw();opener.focus();
 });
 dialog.querySelectorAll('[data-plan-tool]').forEach(button=>button.onclick=()=>{document.querySelector(`[data-tool="${button.dataset.planTool}"]`).click();updateMode();});
 new ResizeObserver(resize).observe(body);
}
