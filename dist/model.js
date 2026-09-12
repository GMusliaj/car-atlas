import * as T from './three.module.js';
import {buildBody} from "./body.js";
import {buildTransmission,TRANSMISSION_CONNECTIONS} from './transmission.js';
import {buildEngine,ENGINE_CONNECTIONS} from './engine.js';
import {buildWheel740,buildTyre} from './wheel.js';
import {isPartVisible} from './explorer.js';

// Generic reference-guided geometry. Dimensions are illustration units, not CAD.
export function buildDrivetrain(scene) {
  const world=new T.Group();scene.add(world);
  const groups={},moving=[],housings=[],spinning=[],chains=[],flows=[];
  const silver=0xadb9c2,dark=0x26343d,steel=0x647d8c,brass=0xb8a271;
  const material=(color,roughness=.37)=>new T.MeshStandardMaterial({color,metalness:.7,roughness});
  function part(id,parent,pos,offset=[0,0,0]){
    const g=new T.Group();g.position.set(...pos);g.userData={id,base:g.position.clone(),offset:new T.Vector3(...offset)};
    parent.add(g);groups[id]=g;moving.push(g);return g;
  }
  function mesh(g,geometry,color,pos=[0,0,0],rot=[0,0,0]){
    const m=new T.Mesh(geometry,material(color));m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m;
  }
  const box=(g,size,c,p,r)=>mesh(g,new T.BoxGeometry(...size),c,p,r);
  function cyl(g,r,h,c,p=[0,0,0],axis='z',r2=r){return mesh(g,new T.CylinderGeometry(r,r2,h,32),c,p,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0])}
  function torus(g,r,t,c,p=[0,0,0],axis='z') {return mesh(g,new T.TorusGeometry(r,t,8,48),c,p,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0])}
  function rod(g,a,b,r=.035,c=silver){const av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=mesh(g,new T.CylinderGeometry(r,r,av.distanceTo(bv),12),c);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m}
  function tube(g,pts,r,c,closed=false){const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)),closed);const m=mesh(g,new T.TubeGeometry(curve,Math.max(32,pts.length*3),r,8,closed),c);return {m,curve}}
  function ring(g,outer,inner,depth,c,pos=[0,0,0]){
    const shape=new T.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
    const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
    const geom=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:40});geom.translate(0,0,-depth/2);return mesh(g,geom,c,pos);
  }
  function bolts(g,r,z,count=8,c=silver,center=[0,0]){for(let i=0;i<count;i++){const a=i*Math.PI*2/count;cyl(g,.018,.03,c,[center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,z]);}}
  function splines(g,r,length,z,count=24){cyl(g,r*.9,length,steel,[0,0,z]);for(let i=0;i<count;i++){const a=i*2*Math.PI/count;box(g,[.009,.009,length],silver,[Math.cos(a)*r,Math.sin(a)*r,z],[0,0,a]);}}
  function gear(g,r,depth,pos,teeth=36){const hub=new T.Group();hub.position.set(...pos);g.add(hub);ring(hub,r*.94,r*.36,depth,silver);for(let i=0;i<teeth;i++){const a=i*2*Math.PI/teeth;box(hub,[r*.10,r*.08,depth],steel,[Math.cos(a)*r,Math.sin(a)*r,0],[0,0,a]);}spinning.push(hub);return hub;}
  function bearing(g,r,z,x=0,y=0){ring(g,r,r*.76,.045,silver,[x,y,z]);ring(g,r*.5,r*.37,.045,silver,[x,y,z]);for(let i=0;i<12;i++){const a=i*Math.PI/6;mesh(g,new T.SphereGeometry(r*.12,8,6),0xd0d8df,[x+Math.cos(a)*r*.64,y+Math.sin(a)*r*.64,z]);}}
  function flange(g,z,r=.14){cyl(g,r,.075,dark,[0,0,z]);cyl(g,r*.54,.12,steel,[0,0,z]);bolts(g,r*.76,z+.05,6);}

  // Calibrated against the owner's X5 50e / X6 M packaging renders: use their
  // axle/bonnet/tunnel relationships, retaining the 40i B58 and GA8HP60X.
  // No PHEV battery, HV cabling, V8 or hybrid-specific gearbox is transplanted.
  const at=(g,p)=>new T.Vector3(...p).multiply(g.scale).add(g.userData.base);
  function connectedPart(id,from,local,scale,offset){
    const g=part(id,world,from.clone().sub(new T.Vector3(...local).multiplyScalar(scale)).toArray(),offset);
    g.scale.setScalar(scale);return g;
  }
  const engine=part('engine',world,[0,.62,-1.39],[-.25,.5,-.65]);
  engine.scale.setScalar(.88);
  const engineAppearance=buildEngine(engine);

  const gearbox=connectedPart('gearbox',at(engine,ENGINE_CONNECTIONS.transmission),TRANSMISSION_CONNECTIONS.input,.78,[.22,.3,-.15]);
  buildTransmission(gearbox);

  // Transfer case. Upper shaft is the direct rear path; the lower-offset shaft feeds forward.
  const transfer=connectedPart('transfer',at(gearbox,TRANSMISSION_CONNECTIONS.output),[0,0,-.24],.50,[0,.65,.16]);
  const caseShape=new T.Shape();
  caseShape.moveTo(.28,.10);caseShape.absarc(0,0,.30,.34,Math.PI*.87,false);
  caseShape.lineTo(-.79,-.15);caseShape.quadraticCurveTo(-.96,-.28,-.82,-.48);
  caseShape.quadraticCurveTo(-.60,-.68,-.39,-.48);caseShape.lineTo(.20,-.23);caseShape.closePath();
  const caseGeom=new T.ExtrudeGeometry(caseShape,{depth:.44,bevelEnabled:true,bevelThickness:.016,bevelSize:.018,bevelSegments:2,steps:1});caseGeom.translate(0,0,-.22);
  const shell=mesh(transfer,caseGeom,silver);shell.material.transparent=true;housings.push(shell);
  const flangeShape=new T.ExtrudeGeometry(caseShape,{depth:.028,bevelEnabled:false});flangeShape.translate(0,0,-.24);
  const cover=part('casecover',transfer,[0,0,0],[0,0,-.85]);const lid=mesh(cover,flangeShape,steel);housings.push(lid);
  const outline=caseShape.getPoints(34);
  for(let i=0;i<outline.length;i+=5){const p=outline[i];cyl(cover,.032,.047,silver,[p.x,p.y,-.26]);}
  for(let i=0;i<8;i++){const y=-.16+i*.04;rod(transfer,[-.62,y-.17,.24],[-.15,y,.24],.012,steel);}

  const input=part('inputshaft',transfer,[0,0,0],[0,0,-.3]);
  splines(input,.067,.68,-.10);flange(input,-.43,.135);
  const output=part('outputshaft',transfer,[0,0,0],[0,0,.65]);
  splines(output,.063,.49,.34);flange(output,.55,.135);bearing(output,.115,.29);
  const frontOutput=part('frontoutput',transfer,[-.60,-.28,0],[-.28,-.12,-.22]);
  cyl(frontOutput,.063,.48,silver,[0,0,-.12]);flange(frontOutput,-.36,.115);bearing(frontOutput,.125,.10);

  const clutch=part('clutch',transfer,[0,0,-.07],[.05,.24,.30]);const plates=[];
  const drum=ring(clutch,.225,.202,.30,steel);drum.material.transparent=true;drum.material.opacity=.45;housings.push(drum);
  for(let i=0;i<19;i++){
    const plate=new T.Group();plate.position.z=-.115+i*.013;clutch.add(plate);plates.push(plate);
    ring(plate,.195,.086,.008,i%2?brass:silver);
    for(let j=0;j<18;j++){const a=j*Math.PI/9;box(plate,[.016,.014,.008],i%2?brass:silver,[Math.cos(a)*.199,Math.sin(a)*.199,0],[0,0,a]);}
  }
  ring(clutch,.215,.085,.026,dark,[0,0,.155]);bearing(clutch,.092,-.16);
  for(let i=0;i<24;i++){const a=i*Math.PI/12;box(clutch,[.013,.013,.26],silver,[Math.cos(a)*.21,Math.sin(a)*.21,0],[0,0,a]);}

  const chain=part('chain',transfer,[0,0,.17],[-.10,-.05,.3]);
  const chainRoot=new T.Group(),gearRoot=new T.Group();chain.add(chainRoot,gearRoot);
  gear(chainRoot,.185,.045,[0,0,0],28);gear(chainRoot,.185,.045,[-.60,-.28,0],28);
  // Equal-radius sprocket path with straight runs and semicircular ends.
  const C1=new T.Vector2(0,0),C2=new T.Vector2(-.60,-.28),axis=C2.clone().sub(C1).normalize();const n=new T.Vector2(-axis.y,axis.x);const r=.195,pts=[];
  for(let i=0;i<=12;i++){const a=Math.PI*i/12;pts.push([C1.x+r*(n.x*Math.cos(a)-axis.x*Math.sin(a)),C1.y+r*(n.y*Math.cos(a)-axis.y*Math.sin(a)),0]);}
  for(let i=0;i<=12;i++){const a=Math.PI*i/12;pts.push([C2.x+r*(-n.x*Math.cos(a)+axis.x*Math.sin(a)),C2.y+r*(-n.y*Math.cos(a)+axis.y*Math.sin(a)),0]);}
  const chainCurve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)),true,'centripetal');
  const linkGeo=new T.BoxGeometry(.037,.018,.12),linkMat=material(0x8da1ad);
  for(let i=0;i<64;i++){const link=new T.Mesh(linkGeo,linkMat);chainRoot.add(link);chains.push({link,index:i});}
  gear(gearRoot,.185,.078,[0,0,0],40);gear(gearRoot,.146,.078,[-.30,-.14,0],32);gear(gearRoot,.185,.078,[-.60,-.28,0],40);
  gearRoot.children[1].userData.spinRatio=-.185/.146;gearRoot.visible=false;

  const actuator=part('actuator',transfer,[-.16,-.47,.15],[.15,-.45,.15]);
  box(actuator,[.27,.065,.23],dark,[0,-.04,0]);cyl(actuator,.105,.065,silver,[0,.02,0],'y');
  cyl(actuator,.025,.40,steel,[0,.25,0],'y');
  for(let i=0;i<12;i++)torus(actuator,.030,.009,brass,[0,.10+i*.022,0],'y');
  for(const x of [-.11,.11])cyl(actuator,.019,.06,silver,[x,-.03,.065],'y');
  const ballramp=part('ballramp',transfer,[0,0,.24],[0,.14,.5]);
  ring(ballramp,.202,.091,.021,steel,[0,0,-.035]);ring(ballramp,.202,.091,.021,silver,[0,0,.035]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;mesh(ballramp,new T.SphereGeometry(.022,12,10),silver,[Math.cos(a)*.155,Math.sin(a)*.155,0]);}
  const bearings=part('bearings',transfer,[0,0,0],[.18,-.12,.7]);bearing(bearings,.108,-.27);bearing(bearings,.11,.32,-.60,-.28);
  ring(bearings,.107,.070,.016,dark,[0,0,-.31]);ring(bearings,.108,.070,.016,dark,[-.60,-.28,.36]);

  // Size and aim each propeller shaft from its actual assembly connections.
  // Moving the gearbox must not leave a gap or the old oversized shaft behind.
  function propellerShaft(id,start,end,r,flangeRadius,offset,support=false){
    const delta=end.clone().sub(start),length=delta.length();
    const g=part(id,world,start.clone().add(end).multiplyScalar(.5).toArray(),offset);
    g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());
    g.userData.ends=[new T.Vector3(0,0,-length/2),new T.Vector3(0,0,length/2)];
    rod(g,[0,0,-length/2],[0,0,length/2],r,steel);
    for(const z of [-length/2,length/2]){
      flange(g,z,flangeRadius);
      for(const x of [-flangeRadius*.55,flangeRadius*.55])box(g,[.020,.06,.085],dark,[x,0,z]);
      rod(g,[-flangeRadius*.75,0,z],[flangeRadius*.75,0,z],.015,silver);
    }
    if(support)ring(g,.092,.048,.075,dark,[0,0,.05]);
    return g;
  }
  const frontConnection=at(transfer,[-.60,-.28,-.42]);
  const frontPinion=new T.Vector3(frontConnection.x,frontConnection.y,-1.42);
  const frontshaft=propellerShaft('frontshaft',frontPinion,frontConnection,.032,.062,[-.5,.05,-.12]);
  const rearshaft=propellerShaft('rearshaft',at(transfer,[0,0,.61]),new T.Vector3(0,.64,1.36),.042,.080,[.15,.20,.35],true);

  function differential(id,z,offset){const g=part(id,world,[0,.52,z],offset);const h=mesh(g,new T.SphereGeometry(.23,24,16),id==='reardiff'?dark:silver);h.scale.set(1.3,.83,1.0);housings.push(h);cyl(g,.19,.35,steel,[0,0,.09]);
    const gears=new T.Group();g.add(gears);gears.rotation.y=Math.PI/2;gear(gears,.16,.03,[0,0,0],24);
    for(const x of [-.27,.27])cyl(g,.075,.16,silver,[x,0,0],'x');for(let i=0;i<6;i++)box(g,[.40,.014,.012],steel,[0,-.10+i*.04,-.18]);return g;}
  const fd=differential('frontdiff',-1.52,[-.15,.2,-.5]);rod(fd,frontPinion.clone().sub(fd.userData.base).toArray(),[0,0,0],.045,steel);
  const rd=differential('reardiff',1.62,[0,.25,.65]);
  for(const side of [-1,1]){rod(rd,[side*.16,.05,.1],[side*.38,.17,.16],.035,silver);cyl(rd,.085,.06,dark,[side*.38,.17,.16],'y');cyl(rd,.03,.07,silver,[side*.38,.17,.16],'y');}
rod(rd,[0,0,-.17],[0,.12,-.26],.06,steel);

  const wheels=part('wheels',world,[0,0,0]);const wheelSubs=[];
  for(const z of [-1.52,1.62])for(const side of [-1,1]){
    const g=new T.Group();g.position.set(side*.887,.392,z);g.scale.setScalar(.82);g.userData={base:g.position.clone(),side,z};wheels.add(g);wheelSubs.push(g);
    rod(g,[-side*.75,.03,0],[0,0,0],.041,steel);
    for(const x of [-side*.60,-side*.12])for(let i=0;i<5;i++)cyl(g,.055+i*.004,.013,dark,[x+i*side*.015,0,0],'x');
    spinning.push(buildTyre(g));
    const rim=buildWheel740(g,side);spinning.push(rim);
    cyl(g,.243,.008,steel,[-side*.067,0,0],'x');cyl(g,.243,.008,steel,[-side*.095,0,0],'x');cyl(g,.115,.065,silver,[-side*.075,0,0],'x');
    for(let j=0;j<32;j++){const a=j*Math.PI/16;rod(g,[-side*.081,Math.cos(a)*.12,Math.sin(a)*.12],[-side*.081,Math.cos(a+.08)*.236,Math.sin(a+.08)*.236],.006,steel);}
    box(g,[.09,.17,.10],dark,[-side*.11,.14,.15]);
  }

  // Generic chassis based on the supplied undercarriage reference.
  const chassis=part('chassis',world,[0,0,0],[0,-.20,0]);
  for(const local of ENGINE_CONNECTIONS.mounts){
    const seat=at(engine,local),side=Math.sign(seat.x),{x,y,z}=seat;
    const mountSeat=box(chassis,[.15,.025,.14],silver,[x,y-.0125,z]);
    mountSeat.name=`engine-mount-seat/${side<0?'left':'right'}`;
    rod(chassis,[x,y-.04,z],[side*.64,.34,z-.10],.03,silver);
    rod(chassis,[x,y-.04,z],[side*.64,.34,z+.10],.03,silver);
  }
  for(const z of [-1.52,1.62]){
    tube(chassis,[[-.66,.36,z-.30],[-.47,.27,z-.36],[.47,.27,z-.36],[.66,.36,z-.30],[.66,.36,z+.30],[.43,.27,z+.37],[-.43,.27,z+.37],[-.66,.36,z+.30]],.046,silver,true);
    for(const side of [-1,1]){
      for(const dz of [-.28,.28])rod(chassis,[side*.45,.30,z+dz],[side*.9,.41,z],.033,silver);
      for(const dz of [-.17,.17])rod(chassis,[side*.51,.66,z+dz],[side*.87,.65,z],.026,steel);
      const x=side*.81;cyl(chassis,.065,.62,dark,[x,.85,z],'y');cyl(chassis,.022,.45,silver,[x,.80,z],'y');
      const spring=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*12;spring.push([x+Math.cos(a)*.105,.75+i/160*.34,z+Math.sin(a)*.105]);}tube(chassis,spring,.016,0x526877);
      for(const dz of [-.055,.055])rod(chassis,[x,.59,z],[x,.40,z+dz],.024,silver);
      cyl(chassis,.13,.045,silver,[x,1.14,z],'y');cyl(chassis,.08,.045,dark,[x,1.19,z],'y');
    }
  }
  rod(chassis,[-.60,.51,-1.71],[.60,.51,-1.71],.042,silver);
  cyl(chassis,.065,.28,dark,[-.15,.40,-1.65],'x');
  for(const side of [-1,1])for(let i=0;i<8;i++)cyl(chassis,.057,.017,dark,[side*(.41+i*.024),.51,-1.71],'x');
  for(const side of [-1,1])rod(chassis,[side*.38,.44,1.87],[side*.93,.49,1.74],.026,silver);
  for(const z of [-1.52,1.62])for(const side of [-1,1])for(const dz of [-.32,.32]){cyl(chassis,.082,.095,dark,[side*.63,.37,z+dz],'y');cyl(chassis,.035,.11,silver,[side*.63,.37,z+dz],'y');}
rod(chassis,[-.20,.53,-1.67],[-.38,1.34,-.72],.021,silver);
  torus(chassis,.18,.023,dark,[-.38,1.37,-.66]);

  // BMW G05 source panels with a dedicated LCI M Sport adaptation.
  const body=part("bodywork",world,[0,0,0],[0,1.75,0]);
  const bodyAppearance=buildBody(body);

  function addFlow(id,points,color,branch=false){const g=groups[id];const {curve,m}=tube(g,points,.012,color);m.material.emissive.set(color);m.material.emissiveIntensity=.9;const beads=[];for(let i=0;i<5;i++){const b=mesh(g,new T.SphereGeometry(.023,8,6),color);b.material.emissive.set(color);b.material.emissiveIntensity=2;beads.push(b);}flows.push({id,curve,m,beads,branch});}
  addFlow('engine',[[0,.60,-.4],[0,.60,.45]],0x7ce8cd);
  addFlow('gearbox',[[0,.32,-.45],[0,.23,.43]],0x7ce8cd);
  addFlow('inputshaft',[[0,0,-.47],[0,0,.05]],0x7ce8cd);
  addFlow('outputshaft',[[0,0,.04],[0,0,.61]],0x7ce8cd);
  addFlow('chain',[[0,0,.055],[-.30,-.14,.055],[-.60,-.28,.055]],0x7abaff,true);
  addFlow('frontoutput',[[0,0,.12],[0,0,-.42]],0x7abaff,true);
  addFlow('frontshaft',frontshaft.userData.ends.toReversed().map(p=>[p.x,p.y+.055,p.z]),0x7abaff,true);
  addFlow('rearshaft',rearshaft.userData.ends.map(p=>[p.x,p.y+.060,p.z]),0x7ce8cd);
  for(const id of ['frontdiff','reardiff'])for(const side of [-1,1])addFlow(id,[[0,.10,0],[side*.9,.03,0]],id==='frontdiff'?0x7abaff:0x7ce8cd,id==='frontdiff');
  const grid=new T.GridHelper(14,35,0x9aaaae,0xc6cfd2);grid.position.y=-.025;grid.material.transparent=true;grid.material.opacity=.14;scene.add(grid);

  const dynamic=new Set([...housings,...engineAppearance.dynamic,...chains.map(c=>c.link),...flows.flatMap(f=>[f.m,...f.beads])]);
  function mergeLocal(g){
    if(g===body)return;
    for(const child of [...g.children])if(child.isGroup)mergeLocal(child);
    const buckets=new Map();
    for(const child of g.children){if(!child.isMesh||dynamic.has(child)||!child.geometry.attributes.normal)continue;
      const m=child.material;const key=[m.type,m.color.getHex(),m.metalness,m.roughness,m.opacity,m.transparent,m.depthWrite].join(':');
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);
    }
    for(const list of buckets.values()){if(list.length<2)continue;const positions=[],normals=[],indices=[];let offset=0;
      for(const child of list){child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);for(const v of geo.attributes.position.array)positions.push(v);for(const v of geo.attributes.normal.array)normals.push(v);
        if(geo.index)for(const i of geo.index.array)indices.push(i+offset);else for(let i=0;i<geo.attributes.position.count;i++)indices.push(i+offset);
        offset+=geo.attributes.position.count;geo.dispose();
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);geometry.computeBoundingSphere();
      const merged=new T.Mesh(geometry,list[0].material);g.add(merged);for(const child of list)g.remove(child);
    }
  }
  mergeLocal(world);

  const flowObjects=new Set(flows.flatMap(f=>[f.m,...f.beads]));
  const renderables=[];
  world.traverse(object=>{
    if(!object.isMesh&&!object.isLineSegments)return;
    let owner=object;
    while(owner&&!owner.userData.id)owner=owner.parent;
    object.userData.componentId=object===shell?'casecover':owner?.userData.id;
    object.userData.flow=flowObjects.has(object);
    renderables.push(object);
  });
  const originalEmissive=new Map();
  for(const object of renderables)if(object.material.emissive&&!originalEmissive.has(object.material))originalEmissive.set(object.material,object.material.emissive.clone());
  let lastAppearance='';
  function update({time,explode,cutaway,flow=true,visible,selected,isolate,strength,coasting,layout}){
    for(const g of moving)g.position.copy(g.userData.base).addScaledVector(g.userData.offset,explode);
    for(const g of wheelSubs){g.position.copy(g.userData.base);g.position.x+=g.userData.side*explode*.60;g.position.z+=Math.sign(g.userData.z)*explode*.35;}
    const visibility={visible,selected,isolate};
    for(const object of renderables)object.visible=isPartVisible(object.userData.componentId,visibility);
    engineAppearance.update(cutaway,explode);
    engine.visible=isPartVisible('engine',visibility);
    const bodyAlone=(isolate&&selected==='bodywork')||(!isolate&&visible.length===1&&visible[0]==='body');
    bodyAppearance.update(selected==='bodywork'||bodyAlone,bodyAlone);
    housings.forEach(m=>{m.material.transparent=true;m.material.opacity=cutaway?.045:(m===shell||m===lid?.78:1);m.material.depthWrite=!cutaway;});
    if(cutaway){shell.visible=false;lid.visible=false;}
    const appearance=`${selected}:${isolate}`;
    if(appearance!==lastAppearance){
      for(const object of renderables){
        if(!object.material.emissive||object.userData.flow||object.userData.componentId==='bodywork')continue;
        object.material.emissive.copy(originalEmissive.get(object.material));
        if(object.userData.componentId===selected)object.material.emissive.setHex(selected==='engine'?0x071511:0x246b5a);
      }
      lastAppearance=appearance;
    }
    plates.forEach((p,i)=>{p.position.z=-.115+i*(.010+(1-strength)*.004+explode*.020);p.rotation.z=time*.55;});

    // Vehicle forward is -Z: the top of every wheel must move toward -Z.
    spinning.forEach(g=>{if(g.parent?.parent===wheels)g.rotation.x=-time*.45;else g.rotation.z=time*.55*(g.userData.spinRatio??1);});
    for(const {link,index}of chains){const u=(index/64+time*.085)%1;link.position.copy(chainCurve.getPointAt(u));const tan=chainCurve.getTangentAt(u);link.rotation.z=Math.atan2(tan.y,tan.x);}
    chainRoot.visible=layout==='chain';gearRoot.visible=layout==='gears';
    for(const f of flows){const showFlow=Boolean(flow)&&!coasting&&!(f.id==='engine'&&isolate&&selected==='engine');f.m.visible=f.m.visible&&showFlow;f.m.material.transparent=true;f.m.material.opacity=f.branch?.25+strength*.75:1;f.beads.forEach((b,i)=>{b.visible=b.visible&&showFlow;b.position.copy(f.curve.getPointAt((time*.23+i/5)%1));});}
  }
  return {world,groups,update};
}
