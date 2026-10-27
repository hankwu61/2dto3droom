"""Local SketchUp C API adapter. Uses installed DLLs; never redistributes them."""
import ctypes as C
import json, os, sys
from pathlib import Path
class Ref(C.Structure): _fields_=[('ptr',C.c_void_p)]
class Point(C.Structure): _fields_=[('x',C.c_double),('y',C.c_double),('z',C.c_double)]
class P2(C.Structure): _fields_=[('x',C.c_double),('y',C.c_double)]
class Color(C.Structure): _fields_=[('r',C.c_ubyte),('g',C.c_ubyte),('b',C.c_ubyte),('a',C.c_ubyte)]
class Transform(C.Structure): _fields_=[('values',C.c_double*16)]
class MaterialInput(C.Structure): _fields_=[('num_uv_coords',C.c_size_t),('uv_coords',P2*4),('vertex_indices',C.c_size_t*4),('material',Ref)]
R=C.POINTER(Ref); N=C.c_size_t; NP=C.POINTER(N)
class API:
 def __init__(self,directory):
  self.directory=os.add_dll_directory(directory)
  self.dll=C.CDLL(str(Path(directory)/'SketchUpAPI.dll'))
  self.fn('SUInitialize',[],None)();self.fn('SUTerminate',[],None)
 def fn(self,name,args,ret=C.c_int):
  f=getattr(self.dll,name);f.argtypes=args;f.restype=ret;return f
 def call(self,name,args,*values):
  code=self.fn(name,args)(*values)
  if code: raise ValueError(f'{name}: SketchUp API error {code}')
 def create(self,name):
  r=Ref();self.call(name,[R],C.byref(r));return r
 def get(self,name,obj):
  r=Ref();self.call(name,[Ref,R],obj,C.byref(r));return r
 def refs(self,entities,kind):
  n=N();self.call('SUEntitiesGetNum'+kind,[Ref,NP],entities,C.byref(n))
  if n.value>1000000: raise ValueError('Too many entities')
  if not n.value:return []
  arr=(Ref*n.value)();self.call('SUEntitiesGet'+kind,[Ref,N,R,NP],entities,n,arr,C.byref(n));return list(arr)[:n.value]
 def release(self,name,r): self.call(name,[R],C.byref(r))
 def name(self,kind,obj):
  s=self.create('SUStringCreate')
  try:
   self.call('SU'+kind+'GetName',[Ref,R],obj,C.byref(s));n=N();self.call('SUStringGetUTF8Length',[Ref,NP],s,C.byref(n));buf=C.create_string_buffer(n.value+1);self.call('SUStringGetUTF8',[Ref,N,C.c_char_p,NP],s,n.value+1,buf,C.byref(n));return buf.value.decode('utf8')
  finally:self.release('SUStringRelease',s)
def export_skp(api,data,destination):
 model=api.create('SUModelCreate');materials={}
 try:
  entities=api.get('SUModelGetEntities',model)
  for group in data['groups']:
   g=api.create('SUGroupCreate');api.call('SUGroupSetName',[Ref,C.c_char_p],g,str(group.get('name','Group')).encode());api.call('SUEntitiesAddGroup',[Ref,Ref],entities,g);ge=api.get('SUGroupGetEntities',g)
   geom=api.create('SUGeometryInputCreate')
   try:
    all_points=[];parts=[]
    for mesh in group['meshes']:
     p=mesh['positions'];start=len(all_points)
     all_points.extend(Point(p[i]/.0254,-p[i+2]/.0254,p[i+1]/.0254) for i in range(0,len(p),3));parts.append((start,len(p)//3,mesh))
    arr=(Point*len(all_points))(*all_points);api.call('SUGeometryInputSetVertices',[Ref,N,C.POINTER(Point)],geom,len(arr),arr)
    for start,count,mesh in parts:
     key=(mesh['color'],mesh['opacity'])
     if key not in materials:
      m=api.create('SUMaterialCreate');rgb=mesh['color'].lstrip('#');color=Color(*[int(rgb[i:i+2],16) for i in (0,2,4)],255)
      api.call('SUMaterialSetColor',[Ref,C.POINTER(Color)],m,C.byref(color));api.call('SUMaterialSetOpacity',[Ref,C.c_double],m,mesh['opacity']);api.call('SUMaterialSetUseOpacity',[Ref,C.c_bool],m,mesh['opacity']<1)
      api.call('SUModelAddMaterials',[Ref,N,R],model,1,C.byref(m));materials[key]=m
     mi=MaterialInput();mi.material=materials[key]
     for v in range(start,start+count,3):
      # Skip zero-area triangles (sphere poles and other tessellation artifacts).
      a,b,c=all_points[v:v+3];u=[b.x-a.x,b.y-a.y,b.z-a.z];w=[c.x-a.x,c.y-a.y,c.z-a.z]
      if sum(t*t for t in [u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]])<1e-16:continue
      loop=api.create('SULoopInputCreate')
      for index in (v,v+1,v+2):api.call('SULoopInputAddVertexIndex',[Ref,N],loop,index)
      face=N();api.call('SUGeometryInputAddFace',[Ref,R,NP],geom,C.byref(loop),C.byref(face))
      for side in ('Front','Back'):api.call('SUGeometryInputFaceSet'+side+'Material',[Ref,N,C.POINTER(MaterialInput)],geom,face,C.byref(mi))
    api.call('SUEntitiesFill',[Ref,Ref,C.c_bool],ge,geom,True)
   finally:api.release('SUGeometryInputRelease',geom)
  api.call('SUModelSaveToFile',[Ref,C.c_char_p],model,str(destination).encode('utf8'))
 finally:api.release('SUModelRelease',model)
def multiply(a,b):return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
IDENTITY=[1.,0,0,0,0,1.,0,0,0,0,1.,0,0,0,0,1.]
def import_skp(api,source):
 model=Ref();api.call('SUModelCreateFromFile',[R,C.c_char_p],C.byref(model),str(source).encode('utf8'));total=0
 def walk(entities,matrix,meshes,depth=0):
  nonlocal total
  if depth>40:raise ValueError('Model hierarchy is too deep')
  for face in api.refs(entities,'Faces'):
   helper=Ref();api.call('SUMeshHelperCreate',[R,Ref],C.byref(helper),face)
   try:
    n=N();api.call('SUMeshHelperGetNumVertices',[Ref,NP],helper,C.byref(n));points=(Point*n.value)();api.call('SUMeshHelperGetVertices',[Ref,N,C.POINTER(Point),NP],helper,n,points,C.byref(n))
    nt=N();api.call('SUMeshHelperGetNumTriangles',[Ref,NP],helper,C.byref(nt));total+=nt.value
    if total>1000000:raise ValueError('Model exceeds one million triangles')
    ids=(N*(nt.value*3))();used=N();api.call('SUMeshHelperGetVertexIndices',[Ref,N,NP,NP],helper,len(ids),ids,C.byref(used))
    color=Color(204,204,204,255);alpha=C.c_double(1);mat=Ref()
    if api.fn('SUFaceGetFrontMaterial',[Ref,R])(face,C.byref(mat))==0 and mat.ptr:
     api.fn('SUMaterialGetColor',[Ref,C.POINTER(Color)])(mat,C.byref(color));use=C.c_bool();api.fn('SUMaterialGetUseOpacity',[Ref,C.POINTER(C.c_bool)])(mat,C.byref(use))
     if use.value:api.fn('SUMaterialGetOpacity',[Ref,C.POINTER(C.c_double)])(mat,C.byref(alpha))
    key=('#%02x%02x%02x'%(color.r,color.g,color.b),alpha.value)
    dest=meshes.setdefault(key,{'color':key[0],'opacity':key[1],'positions':[]})['positions']
    for idx in ids[:used.value]:
     p=points[idx];v=[p.x,p.y,p.z,1];x,y,z=[sum(matrix[k*4+r]*v[k] for k in range(4)) for r in range(3)];dest.extend([x*.0254,z*.0254,-y*.0254])
   finally:api.release('SUMeshHelperRelease',helper)
  for kind in ('Groups','Instances'):
   for obj in api.refs(entities,kind):
    prefix='SUGroup' if kind=='Groups' else 'SUComponentInstance';t=Transform();api.call(prefix+'GetTransform',[Ref,C.POINTER(Transform)],obj,C.byref(t))
    child=api.get('SUGroupGetEntities',obj) if kind=='Groups' else api.get('SUComponentDefinitionGetEntities',api.get('SUComponentInstanceGetDefinition',obj))
    walk(child,multiply(matrix,list(t.values)),meshes,depth+1)
 try:
  root=api.get('SUModelGetEntities',model);groups=[]
  # Traverse each top-level group separately to retain useful edit boundaries.
  objects=[('Group',x) for x in api.refs(root,'Groups')]+[('ComponentInstance',x) for x in api.refs(root,'Instances')]
  for kind,obj in objects:
   t=Transform();api.call('SU'+kind+'GetTransform',[Ref,C.POINTER(Transform)],obj,C.byref(t));child=api.get('SUGroupGetEntities',obj) if kind=='Group' else api.get('SUComponentDefinitionGetEntities',api.get('SUComponentInstanceGetDefinition',obj));meshes={};walk(child,list(t.values),meshes)
   if meshes:groups.append({'name':api.name(kind,obj) or kind,'meshes':list(meshes.values())})
  # Root faces are read separately, avoiding a second traversal of groups.
  if api.refs(root,'Faces'):
   original=api.refs
   api.refs=lambda e,k: [] if e.ptr==root.ptr and k in ('Groups','Instances') else original(e,k)
   meshes={};walk(root,IDENTITY,meshes);api.refs=original
   if meshes:groups.append({'name':'Loose geometry','meshes':list(meshes.values())})
  if not groups:raise ValueError('No faces found in SKP')
  if len(groups)>150:raise ValueError('Model exceeds 150 groups')
  return {'format':'roomform-mesh','version':1,'units':'meters','upAxis':'Y','groups':groups}
 finally:api.release('SUModelRelease',model)
if __name__=='__main__':
 try:
  mode,directory,source,destination=sys.argv[1:];api=API(directory)
  try:
   if mode=='export':export_skp(api,json.loads(Path(source).read_text(encoding='utf-8-sig')),destination)
   elif mode=='import':Path(destination).write_text(json.dumps(import_skp(api,source)),encoding='utf-8')
   else:raise ValueError('Unknown conversion mode')
  finally:api.dll.SUTerminate()
  print('OK')
 except Exception as e:print(str(e),file=sys.stderr);sys.exit(1)
