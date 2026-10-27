// Permit local desktop frontends even when Vite chooses the next available port.
export function isLocalOrigin(origin){
 if(!origin)return true;
 try{const url=new URL(origin);return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;}catch{return false;}
}
export function localOrigin(req,res,next){if(!isLocalOrigin(req.get('origin')))return res.status(403).json({error:'僅允許本機工作室存取；請使用 localhost 或 127.0.0.1 開啟程式'});next();}
