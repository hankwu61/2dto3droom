// Browser tests must never create test projects or change the user's active
// SQLite project. Exercise the actual frontend with an isolated project API.
export async function sandboxProjects(page,seed){
 const rows=new Map(seed?[[seed.id,structuredClone(seed)]]:[]);let activeId=seed?.id??null;
 await page.route(/\/api\/projects(?:\/.*)?$/,async route=>{
  const request=route.request(),pathname=new URL(request.url()).pathname;
  if(request.method()==='GET'){
   if(pathname==='/api/projects')return route.fulfill({json:{activeId,projects:[...rows.values()].map(r=>({id:r.id,name:r.name,updatedAt:r.updatedAt}))}});
   return route.fulfill({json:rows.get(decodeURIComponent(pathname.split('/').at(-1)))??null});
  }
  const body=request.postDataJSON(),row=body.project??body;rows.set(row.id,structuredClone(row));
  if(body.active!==false)activeId=row.id;
  return route.fulfill({json:{saved:true,id:row.id}});
 });
 return rows;
}
