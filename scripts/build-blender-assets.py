"""Author the ROOMFORM model library with Blender, then export web-ready GLB.

Run: blender --background --factory-startup --python scripts/build-blender-assets.py
All geometry and texture pixels are authored here; no downloaded asset licenses.
Coordinates in helpers are x/right, y/up, z/front, converted to Blender Z-up.
"""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public'/'models'; ASSETS.mkdir(parents=True,exist_ok=True)
OUTPUT=ROOT/'output'; OUTPUT.mkdir(exist_ok=True)
random.seed(42)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
roots={}; current=None

def pos(x,y,z): return (x,-z,y)
def material(name,color,rough=.5,metal=0,alpha=1,texture=None):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
    bs.inputs['Alpha'].default_value=alpha; m.diffuse_color=(*color,alpha)
    if texture:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=texture
        m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        bump=m.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.12
        bump.inputs['Distance'].default_value=.007 if 'fabric' in name else .003
        m.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return m

def texture(name,kind):
    size=256; image=bpy.data.images.new(name,width=size,height=size); pixels=[]
    for y in range(size):
        for x in range(size):
            if kind=='wood':
                grain=math.sin(x*.43+2*math.sin(y*.024)+.7*math.sin(x*.09+y*.04))
                value=.80+.025*grain+.025*random.random()
                rgb=(value*.74,value*.50,value*.29)
            else:
                weave=.96 if (x%4<2)==(y%4<2) else .85
                value=weave+random.random()*.045; rgb=(value*.62,value*.70,value*.64)
            pixels.extend((*rgb,1))
    image.pixels=pixels; image.pack(); return image

oaktex=texture('ROOMFORM_Oak_Grain','wood'); fabrictex=texture('ROOMFORM_Linen_Weave','fabric')
oak=material('rf-wood-oak',(.58,.37,.20),.46,texture=oaktex)
linen=material('rf-fabric-sage',(.49,.60,.52),.9,texture=fabrictex)
cream=material('rf-fabric-ivory',(.88,.84,.75),.92)
stitch=material('rf-stitch',(.73,.78,.68),.94)
blanket=material('rf-fabric-duvet',(.40,.50,.47),.94)
ceramic=material('rf-ceramic',(.91,.93,.92),.18)
interior=material('rf-ceramic-interior',(.68,.78,.78),.25)
chrome=material('rf-chrome',(.63,.68,.70),.2,.95)
black=material('rf-metal-charcoal',(.045,.055,.057),.3,.72)
dark=material('rf-rubber',(.022,.028,.031),.76)
glass=material('rf-glass',(.73,.86,.90),.12,.03,.24)
screen=material('rf-screen',(.035,.075,.095),.16,.28)
stone=material('rf-stone',(.80,.81,.77),.32)
leafmat=material('rf-leaf',(.12,.30,.15),.72)
soil=material('rf-soil',(.075,.042,.024),1)
terracotta=material('rf-terracotta',(.57,.30,.17),.83)
white=material('rf-painted-white',(.84,.86,.84),.35)

def begin(name):
    global current
    current=bpy.data.objects.new('rf_'+name,None); bpy.context.collection.objects.link(current)
    roots[name]=current; return current

def finish_obj(obj,name,mat,smooth=False):
    obj.name=name; obj.parent=current
    if mat: obj.data.materials.append(mat)
    if smooth and obj.type=='MESH':
        for polygon in obj.data.polygons: polygon.use_smooth=True
    return obj

def box(name,w,h,d,x=0,y=0,z=0,mat=oak,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(x,y,z)); obj=bpy.context.object
    obj.dimensions=(w,d,h); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish_obj(obj,name,mat)
    if bevel:
        mod=obj.modifiers.new('Soft manufactured edges','BEVEL'); mod.width=min(bevel,w*.22,h*.22,d*.22); mod.segments=3
        mod=obj.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL'); mod.keep_sharp=True; mod.weight=50
    return obj

def ellipsoid(name,rx,ry,rz,x,y,z,mat=cream):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos(x,y,z)); obj=bpy.context.object
    obj.scale=(rx,rz,ry); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_obj(obj,name,mat,True)

def cylinder(name,r,h,x,y,z,mat=chrome,r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r if r2 is None else r2,radius2=r,depth=h,location=pos(x,y,z))
    return finish_obj(bpy.context.object,name,mat,True)

def rod(name,a,b,r=.012,mat=chrome,r2=None):
    av,bv=Vector(pos(*a)),Vector(pos(*b)); middle=(av+bv)/2
    obj=cylinder(name,r,(bv-av).length,0,0,0,mat,r2)
    obj.location=middle; obj.rotation_euler=(bv-av).to_track_quat('Z','Y').to_euler(); return obj

def pipe(name,points,r=.008,mat=chrome,closed=False):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.resolution_u=12; data.bevel_depth=r; data.bevel_resolution=3
    spline=data.splines.new('POLY'); spline.points.add(len(points)-1)
    for p,xyz in zip(spline.points,points): p.co=(*pos(*xyz),1)
    spline.use_cyclic_u=closed
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); return finish_obj(obj,name,mat)

def ring(name,rx,rz,y,x=0,z=0,r=.013,mat=ceramic):
    return pipe(name,[(x+rx*math.cos(a*2*math.pi/64),y,z+rz*math.sin(a*2*math.pi/64)) for a in range(64)],r,mat,True)

def round_contour(w,d,rounding=.18,n=8):
    radius=min(w,d)*rounding; points=[]
    for cx,cz,start in [(w/2-radius,d/2-radius,0),(-w/2+radius,d/2-radius,90),(-w/2+radius,-d/2+radius,180),(w/2-radius,-d/2+radius,270)]:
        for k in range(n+1):
            a=math.radians(start+k*90/n); points.append((cx+radius*math.cos(a),cz+radius*math.sin(a)))
    return points

def hollow(name,sections,mat=ceramic,x=0,z=0,ellipse=False):
    vertices=[]; count=64 if ellipse else 36
    for w,d,y in sections:
        contour=[(w/2*math.cos(k*2*math.pi/count),d/2*math.sin(k*2*math.pi/count)) for k in range(count)] if ellipse else round_contour(w,d)
        vertices.extend(pos(x+xx,y,z+zz) for xx,zz in contour)
    faces=[]
    for level in range(len(sections)-1):
        for k in range(count):
            a=level*count+k; b=level*count+(k+1)%count; faces.append((a,b,b+count,a+count))
    faces.append(tuple(range((len(sections)-1)*count,len(sections)*count)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); return finish_obj(obj,name,mat,True)

def handle(x,y,z,length=.16,vertical=False):
    a=(x,y-length/2,z) if vertical else (x-length/2,y,z)
    b=(x,y+length/2,z) if vertical else (x+length/2,y,z)
    rod('Handle grip',a,b,.009,black)
    for pt in [a,b]: rod('Handle mount',(pt[0],pt[1],pt[2]-.025),pt,.008,black)

def faucet(x,y,z,height=.24):
    cylinder('Tap base',.026,.018,x,y+.009,z,chrome)
    points=[(x,y+.02,z),(x,y+height*.7,z)]
    points += [(x,y+height*.7+height*.3*math.sin(a*math.pi/12),z+.075-.075*math.cos(a*math.pi/12)) for a in range(13)]
    pipe('Curved mixer spout',points,.013,chrome)
    rod('Mixer lever',(x+.04,y+.07,z),(x+.04,y+.15,z+.018),.009,chrome)

def feet(w,d,y=.15,mat=oak):
    for x in [-w*.37,w*.37]:
        for z in [-d*.35,d*.35]: rod('Tapered leg',(x*1.08,.025,z*1.08),(x,y,z),.022,mat,.012)

def cabinet(w,d,h=.85,top=True,cutout=None):
    box('Inset plinth',w*.9,.10,d*.88,0,.06,0,dark)
    for x in [-w/2+.013,w/2-.013]:box('Cabinet side panel',.026,h-.12,d,x,(h+.1)/2,0,oak,.007)
    box('Cabinet back',w-.035,h-.12,.022,0,(h+.1)/2,-d/2+.011,oak,.005)
    box('Cabinet floor',w-.035,.028,d,0,.13,0,oak,.005)
    if top and not cutout:box('Stone worktop',w+.012,.045,d+.012,0,h+.012,0,stone,.012)
    if top and cutout:
        cw,cd,cz=cutout
        for x in [-(w+cw)/4,(w+cw)/4]:box('Stone worktop side',(w-cw)/2+.006,.045,d+.012,x,h+.012,0,stone,.004)
        for near,far in [(-d/2-.006,cz-cd/2),(cz+cd/2,d/2+.006)]:box('Stone worktop rim',cw,.045,far-near,0,h+.012,(near+far)/2,stone,.004)
    n=max(1,round(w/.5))
    for i in range(n):
        x=-w/2+(i+.5)*w/n
        box('Inset front panel',w/n-.012,h-.17,.025,x,(h+.1)/2,d/2+.01,oak,.012)
        handle(x,h-.12,d/2+.047,min(.18,w/n*.55))

begin('sofa'); w,d=2.3,1
feet(w,d,.16,black); box('Upholstered base',w-.04,.28,d-.03,0,.27,0,linen,.08)
box('Back support',w-.07,.57,.19,0,.59,-.39,linen,.07)
for x in [-1.045,1.045]: box('Soft arm',.21,.48,.96,x,.47,0,linen,.075)
for i in range(3):
    x=(i-1)*.64
    box('Individual seat cushion',.625,.18,.70,x,.49,.055,linen,.07)
    box('Back cushion',.63,.39,.18,x,.705,-.30,linen,.065)
    pipe('Seat cushion piping',[(x+xx,.55,zz+.055) for xx,zz in round_contour(.60,.675,.14)],.003,stitch,True)
for x in [-.78,.78]:
    pillow=ellipsoid('Loose lumbar pillow',.20,.21,.095,x,.68,.03,cream); pillow.rotation_euler[1]=.16 if x<0 else -.16

begin('bed'); w,d=1.8,2
feet(w,d,.18,black); box('Oak bed frame',w,.24,d,0,.27,0,oak,.035)
box('Quilted headboard',w,1.02,.12,0,.64,-.94,linen,.065)
for x in [-.43,.43]:box('Headboard upholstered panel',.84,.70,.05,x,.72,-.86,linen,.04)
box('Mattress lower welt',w*.96,.075,d*.93,0,.43,.015,cream,.035)
box('Soft mattress',w*.96,.19,d*.93,0,.53,.015,cream,.065)
vertices=[]; faces=[]; nx,nz=28,30
for j in range(nz):
    z=-.30+j*1.27/(nz-1)
    for i in range(nx):
        x=-w*.49+i*w*.98/(nx-1); edge=max(0,(abs(x)-w*.43)/.12)
        y=.66-.10*edge+.012*math.sin(i*.85+j*.4)+.008*math.cos(j*.8)
        vertices.append(pos(x,y,z))
for j in range(nz-1):
    for i in range(nx-1): a=j*nx+i;faces.append((a,a+1,a+1+nx,a+nx))
mesh=bpy.data.meshes.new('Duvet drape');mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new('Draped duvet with folds',mesh);bpy.context.collection.objects.link(obj);finish_obj(obj,obj.name,blanket,True)
solid=obj.modifiers.new('Duvet thickness','SOLIDIFY');solid.thickness=.025
box('Folded blanket edge',w*.97,.075,.20,0,.67,.60,linen,.035)
for x in [-.43,.43]:
    ellipsoid('Plump sleeping pillow',.39,.12,.24,x,.72,-.60,cream)
    pipe('Pillow piping',[(x+xx,.72,-.60+zz) for xx,zz in round_contour(.74,.44,.30)],.003,cream,True)

begin('table');w,d=1.4,.8
box('Rounded oak tabletop',w,.055,d,0,.755,0,oak,.025)
for x in [-.55,.55]:
    for z in [-.27,.27]:rod('Splayed solid leg',(x*1.08,.025,z*1.08),(x,.73,z),.035,oak,.025)
box('Table apron',1.11,.10,.045,0,.68,-.27,oak)
box('Table apron',1.11,.10,.045,0,.68,.27,oak)

begin('chair');w,d=.55,.55
for x in [-.20,.20]:
    for z in [-.20,.20]:rod('Chair leg',(x*1.16,.02,z*1.15),(x,.47,z),.022,oak,.014)
box('Seat shell',.49,.045,.47,0,.45,0,oak,.025)
box('Upholstered seat',.48,.08,.46,0,.51,0,linen,.038)
for x in [-.20,.20]:rod('Back upright',(x,.43,-.20),(x,.89,-.235),.018,oak)
box('Curved padded back',.50,.32,.075,0,.77,-.235,linen,.035)

begin('cabinet');cabinet(1.5,.5,1.36,False)
box('Upper top edge',1.5,.04,.5,0,1.38,0,oak)
begin('block');box('Finished custom block',1,1,1,0,.5,0,oak,.025)

begin('plant')
hollow('Tapered clay planter',[(.27,.27,.02),(.38,.38,.31),(.33,.33,.32),(.29,.29,.07)],terracotta,ellipse=True)
cylinder('Visible potting soil',.16,.015,0,.28,0,soil)
for k in range(14):
    a=k*2.399; length=.22+.12*(k%3)/2; y=.42+.035*k
    x=math.cos(a)*.12;z=math.sin(a)*.12
    pipe('Plant stem',[(0,.28,0),(x*.4,y-.1,z*.4),(x,y,z)],.003,leafmat)
    vertices=[]; faces=[]
    for j in range(9):
        u=j/8; center=Vector((x+math.cos(a)*length*u,y+.07*math.sin(u*math.pi)-.06*u,z+math.sin(a)*length*u))
        half=.055*math.sin(math.pi*u)
        for side in [-1,0,1]: vertices.append(pos(center.x-math.sin(a)*half*side,center.y+.012*(1-abs(side)),center.z+math.cos(a)*half*side))
    for j in range(8):
        for side in range(2):a0=j*3+side;faces.append((a0,a0+1,a0+4,a0+3))
    mesh=bpy.data.meshes.new('Leaf blade');mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new('Curved leaf',mesh);bpy.context.collection.objects.link(obj);finish_obj(obj,obj.name,leafmat,True)
    mod=obj.modifiers.new('Leaf thickness','SOLIDIFY');mod.thickness=.001

begin('bathtub')
hollow('Freestanding hollow bath',[(.61,1.39,.03),(.70,1.53,.12),(.75,1.60,.56),(.73,1.58,.58),(.64,1.46,.58),(.52,1.26,.19),(.43,1.14,.15)])
cylinder('Bath drain',.027,.004,0,.155,.42,chrome);faucet(.23,.57,-.52,.20)

begin('toilet')
hollow('Toilet pedestal',[(.24,.36,.015),(.21,.32,.12),(.29,.40,.31),(.34,.46,.38)],ceramic,z=.05,ellipse=True)
hollow('Open ceramic bowl',[(.28,.35,.27),(.40,.51,.39),(.41,.52,.43),(.32,.42,.44),(.25,.33,.29),(.14,.20,.26)],ceramic,z=.08,ellipse=True)
ring('Rounded toilet seat',.18,.235,.465,z=.08,r=.024)
box('Toilet tank',.34,.37,.17,0,.57,-.23,ceramic,.055);box('Tank lid',.36,.035,.19,0,.77,-.23,ceramic,.015)
cylinder('Dual flush button',.019,.008,.045,.792,-.23,chrome)
box('Seat hinge',.24,.028,.04,0,.472,-.14,white)
cylinder('Bowl water',.073,.002,0,.27,.09,interior)

begin('basin');cabinet(.60,.5,.76)
hollow('Vessel basin',[(.38,.30,.80),(.52,.40,.91),(.48,.36,.925),(.38,.27,.825),(.24,.16,.805)],ceramic,z=.035,ellipse=True)
cylinder('Basin drain',.019,.003,0,.809,.035,chrome);faucet(0,.80,-.18,.26)

begin('counter');cabinet(1.8,.65)
begin('sink');cabinet(1.2,.65,cutout=(.68,.40,.015))
hollow('Stainless inset sink',[(.71,.43,.88),(.67,.39,.89),(.57,.30,.70),(.52,.26,.695)],chrome,z=.015)
cylinder('Basket drain',.028,.004,0,.70,.02,dark);faucet(0,.88,-.25,.28)
for x in [.42,.47,.52]:pipe('Drainboard grooves',[(x,.89,-.17),(x,.89,.20)],.002,chrome)

begin('stove');cabinet(.8,.65)
box('Black ceramic hob',.70,.018,.53,0,.887,0,screen,.01)
for x in [-.19,.19]:
    for z in [-.145,.145]:
        cylinder('Burner base',.085,.009,x,.90,z,dark)
        ring('Steel burner surround',.073,.073,.911,x,z,.003,chrome)
        for a in [0,math.pi/2]:rod('Pan support',(x-.10*math.cos(a),.924,z-.10*math.sin(a)),(x+.10*math.cos(a),.924,z+.10*math.sin(a)),.006,black)
box('Oven bezel',.68,.44,.025,0,.43,.35,black)
box('Oven glass',.56,.31,.012,0,.43,.37,screen,.014)
handle(0,.685,.40,.48)
for x in [-.23,-.08,.08,.23]:
    obj=cylinder('Control knob',.022,.022,x,.765,.37,chrome);obj.rotation_euler[0]=math.pi/2

begin('fridge')
box('Refrigerator case',.75,1.86,.72,0,.95,0,white,.045)
for y,h in [(1.52,.66),(.62,1.08)]:
    box('Dark door gasket',.71,h,.025,0,y,.365,dark,.025)
    box('Satin fridge door',.72,h-.018,.055,0,y,.393,white,.03)
    handle(-.26,y,.45,.38,True)
for x in [-.26,-.13,0,.13,.26]:box('Toe grille slot',.09,.009,.009,x,.075,.405,dark,.003)

begin('column');box('Architectural column',.6,2.8,.6,0,1.4,0,stone,.009)

begin('shower')
hollow('Raised shower tray',[(.9,1.1,.015),(.9,1.1,.095),(.82,1.02,.095),(.78,.98,.045)],ceramic)
cylinder('Shower drain',.035,.004,0,.05,0,chrome)
box('Fixed glass back',.88,1.95,.009,0,1.07,-.54,glass,.003)
box('Side glass',.009,1.95,1.08,.44,1.07,0,glass,.003)
for x in [-.445,.445]:rod('Shower frame upright',(x,.09,-.545),(x,2.07,-.545),.009,chrome)
rod('Top shower brace',(-.445,2.04,-.545),(.445,2.04,-.545),.01,chrome)
pipe('Shower riser',[(0,.85,-.49),(0,1.90,-.49),(0,1.98,-.40),(0,1.98,-.17)],.012,chrome)
cylinder('Rain shower head',.105,.022,0,1.96,-.17,chrome)
for a in range(12):cylinder('Shower nozzle',.004,.004,.074*math.cos(a*math.pi/6),1.946,-.17+.074*math.sin(a*math.pi/6),dark)
rod('Mixer rail',(-.12,1.06,-.49),(.12,1.06,-.49),.022,chrome)
pipe('Hand shower hose',[(.09,1.06,-.49),(.13,.55,-.46),(.21,.60,-.43),(.18,1.24,-.47)],.007,chrome)
handle(.44,1.15,.28,.25,True)

begin('washer')
box('Washing machine body',.6,.85,.62,0,.44,0,white,.035)
box('Control fascia',.56,.12,.025,0,.77,.322,white,.015)
box('Digital display',.16,.044,.008,.12,.775,.34,screen,.005)
obj=cylinder('Program dial',.034,.022,-.08,.774,.349,chrome);obj.rotation_euler[0]=math.pi/2
for x in [.21,.255]:ellipsoid('Program button',.009,.009,.007,x,.775,.345,chrome)
points=[(.19*math.cos(k*2*math.pi/64),.40+.19*math.sin(k*2*math.pi/64),.338) for k in range(64)]
pipe('Circular drum door trim',points,.026,chrome,True)
obj=cylinder('Drum cavity',.168,.02,0,.40,.335,dark);obj.rotation_euler[0]=math.pi/2
obj=cylinder('Tinted front glass',.154,.015,0,.40,.353,screen);obj.rotation_euler[0]=math.pi/2
handle(.17,.40,.365,.12,True)

begin('tv')
box('Thin television bezel',1.4,.80,.045,0,.68,0,black,.015)
box('Gloss display',1.35,.75,.005,0,.68,.026,screen,.008)
for x in [-.47,.47]:
    rod('TV stand rear',(x,.28,0),(x-.06,.025,-.10),.012,black)
    rod('TV stand front',(x,.28,0),(x+.06,.025,.10),.012,black)

begin('roundtable')
cylinder('Rounded circular oak top',.25,.045,0,.49,0,oak)
cylinder('Pedestal stem',.035,.43,0,.25,0,black,r2=.055)
cylinder('Pedestal base',.18,.026,0,.025,0,black)

begin('door_frame')
for x in [-.48,.48]:box('Door jamb',.055,2.22,.18,x,1.11,0,oak,.008)
box('Door head',1.015,.055,.18,0,2.20,0,oak,.008)
for z in [-.105,.105]:
    for x in [-.505,.505]:box('Door casing',.045,2.25,.024,x,1.125,z,oak,.006)
    box('Header casing',1.055,.05,.024,0,2.25,z,oak,.006)
begin('door_leaf')
box('Solid oak door leaf',.94,2.16,.045,0,1.08,0,oak,.008)
for z in [-.026,.026]:
    for y,h in [(1.58,.69),(.62,.94)]:
        box('Recessed door panel',.70,h,.012,0,y,z,oak,.009)
        for x in [-.365,.365]:box('Panel stile moulding',.018,h+.035,.016,x,y,z,oak,.005)
        for yy in [y-h/2,y+h/2]:box('Panel rail moulding',.74,.018,.016,0,yy,z,oak,.005)
    box('Lock escutcheon',.035,.18,.014,.34,1.03,z*1.25,chrome,.006)
    rod('Lever handle',(.34,1.08,z*2),(.23,1.08,z*2),.012,chrome)
for y in [.20,1.08,1.94]:rod('Door hinge barrel',(-.47,y-.035,0),(-.47,y+.035,0),.012,chrome)

begin('window_frame')
for x in [-.735,.735]:box('Aluminium jamb',.045,1.3,.12,x,.65,0,black,.005)
for y in [.025,1.275]:box('Aluminium rail',1.5,.05,.12,0,y,0,black,.005)
box('Stone window sill',1.56,.035,.21,0,.012,.035,stone,.008)
for i in [-1,1]:
    x=i*.36;z=i*.018
    for xx in [x-.35,x+.35]:box('Inner sash stile',.024,1.19,.038,xx,.65,z,black,.004)
    for y in [.065,1.235]:box('Inner sash rail',.72,.024,.038,x,y,z,black,.004)
    box('Window glazing',.68,1.145,.006,x,.65,z,glass,.001)
    handle(i*.035,.62,.05+i*.018,.13,True)

begin('sliding_panel')
for x in [-.735,.735]:box('Sliding outer jamb',.04,2.2,.11,x,1.1,0,black,.005)
for y in [.025,2.175]:box('Sliding track',1.5,.05,.13,0,y,0,chrome,.005)
for i in [-1,1]:
    x=i*.36;z=i*.022
    for xx in [x-.35,x+.35]:box('Door sash stile',.028,2.1,.043,xx,1.1,z,black,.004)
    for y in [.075,2.125]:box('Door sash rail',.72,.03,.043,x,y,z,black,.004)
    box('Tempered glass panel',.68,2.02,.008,x,1.1,z,glass,.001)
    handle(i*.055,1.02,.08+i*.022,.23,True)

# Apply modelling modifiers and join parts per asset. The GLB exporter splits
# only by material, reducing browser draw calls while preserving PBR surfaces.
manifest={}; total_triangles=0
for name,root in roots.items():
    children=list(root.children)
    for obj in children:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        if obj.type=='CURVE':bpy.ops.object.convert(target='MESH')
        for mod in list(obj.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=mod.name)
            except RuntimeError:pass
    bpy.ops.object.select_all(action='DESELECT')
    for obj in root.children:obj.select_set(True)
    bpy.context.view_layer.objects.active=list(root.children)[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=name+'_geometry'
    # Collapse duplicate material slots after joining so glTF creates a small
    # number of primitives for each asset instead of one per original part.
    unique=[]; remap={}
    for i,mat in enumerate(obj.data.materials):
        if mat not in unique:unique.append(mat)
        remap[i]=unique.index(mat)
    indices=[remap[p.material_index] for p in obj.data.polygons]
    obj.data.materials.clear()
    for mat in unique:obj.data.materials.append(mat)
    for p,index in zip(obj.data.polygons,indices):p.material_index=index
    triangles=sum(len(p.vertices)-2 for p in obj.data.polygons);total_triangles+=triangles
    manifest[name]={'node':root.name,'triangles':triangles,'materials':len(unique)}

bpy.ops.object.select_all(action='DESELECT')
for root in roots.values():
    root.select_set(True)
    for obj in root.children:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'roomform-furniture.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_extras=True)
(ASSETS/'manifest.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string,'version':1,'units':'meters','triangles':total_triangles,'assets':manifest},indent=2),encoding='utf-8')

# Save a reviewable native Blender library with every asset arranged in a grid.
for i,(name,root) in enumerate(roots.items()):
    root.location=((i%5-2)*3.2,(i//5-2)*3.2,0)
bpy.ops.mesh.primitive_plane_add(size=40,location=(0,0,-.025));bpy.context.object.data.materials.append(material('Studio backdrop',(.73,.76,.72),.9))
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.55,.6,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for location,energy,size in [((3,-6,14),2300,10),((-10,-2,7),1700,8),((2,10,10),1900,8)]:
    bpy.ops.object.light_add(type='AREA',location=location);light=bpy.context.object;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(15,-21,22));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.4))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=22;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1600;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUTPUT/'blender-asset-library.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'roomform-furniture-library.blend'))
bpy.ops.render.render(write_still=True)
print('ROOMFORM_ASSETS_COMPLETE',len(roots),'assets',total_triangles,'triangles')
