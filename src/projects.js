const DB='roomform-projects';
export function openProjectDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'});r.result.createObjectStore('settings');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function transaction(db,stores,mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;action(tx,v=>result=v);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存中止'));});}
async function api(url,options){const response=await fetch(url,options);let data;try{data=await response.json();}catch{throw Error('SQLite 專案服務回應無效，請確認後端已啟動');}if(!response.ok)throw Error(data.error||'SQLite 儲存失敗');return data;}
async function migrateLegacy(){
 const db=await openProjectDB();try{const rows=await transaction(db,['projects'],'readonly',(tx,done)=>{tx.objectStore('projects').getAll().onsuccess=e=>done(e.target.result);});const id=await transaction(db,['settings'],'readonly',(tx,done)=>{tx.objectStore('settings').get('active').onsuccess=e=>done(e.target.result);});
 for(const row of rows)await api('/api/projects/migrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:row,active:row.id===id})});
 }finally{db.close();}
}
export async function mountProjects({capture,restore,notify,isBusy}){
 await api('/api/projects');try{await migrateLegacy();}catch(e){notify('舊瀏覽器專案尚未完全搬移：'+e.message+'。原資料仍保留，下次會重試。');}let active=null,queue=Promise.resolve();
 const panel=document.createElement('section');panel.className='project-library';panel.innerHTML='<div class="panel-heading"><h2>我的專案</h2><span>PROJECTS</span></div><select id="project-list" aria-label="切換專案"></select><label class="field">專案名稱<input id="project-name" maxlength="80"></label><p id="project-save-state" class="hint" role="status"></p><p class="hint">每次上傳建立獨立專案，自動保存原圖與編輯結果。資料保存在本機 SQLite；不同瀏覽器可使用同一份專案。請定期下載備份。</p>';
 document.querySelector('.panel').prepend(panel);const list=panel.querySelector('select'),name=panel.querySelector('input'),state=panel.querySelector('#project-save-state');
 const get=id=>api('/api/projects/'+encodeURIComponent(id));
 async function render(){const {projects:rows}=await api('/api/projects');list.replaceChildren(...rows.map(r=>new Option(r.name,r.id)));list.value=active?.id||'';name.value=active?.name||'';}

 function save(){if(!active)return Promise.resolve();const row={...active,...capture(),updatedAt:Date.now()};active=row;state.textContent='儲存中…';queue=queue.catch(()=>{}).then(()=>api('/api/projects/'+encodeURIComponent(row.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)}));const result=queue;result.then(()=>{if(active?.id===row.id)state.textContent='已自動儲存 · '+new Date(row.updatedAt).toLocaleTimeString();}).catch(e=>{state.textContent='儲存失敗，請下載專案備份';notify('本機儲存失敗：'+e.message);});return result;}
 async function create(title){await queue;active={id:crypto.randomUUID(),name:title.slice(0,80)||'未命名專案',createdAt:Date.now()};await save();await render();}
 list.onchange=async()=>{const id=list.value;if(isBusy()){list.value=active.id;return notify('辨識或匯入中，請完成後再切換專案');}list.disabled=true;try{await save();const row=await get(id);if(!row)throw Error('找不到專案');await restore(row);active=row;await save();await render();notify('已切換至 '+row.name);}catch(e){notify('專案切換失敗：'+e.message);list.value=active?.id||'';}finally{list.disabled=false;}};
 name.onchange=async()=>{if(active){active.name=name.value.trim().slice(0,80)||'未命名專案';document.querySelector('#scene-title').textContent=active.name;await save();await render();}};
 const {activeId:id}=await api('/api/projects');const row=id?await get(id):null;if(row){await restore(row);active=row;await render();state.textContent='已還原上次專案';}
 return {save,create,get active(){return active;},get restored(){return !!row;}};
}
