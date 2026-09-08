import * as T from './three.module.js';

// Reconstructed surfaces, not BMW CAD. Drawing IDs refer to engine-references.js.
export const ENGINE_IDENTITY=Object.freeze({vehicle:'G05N xDrive40i',type:'21EU',engine:'B58B30M2',family:'B58N',cylinders:6,bore:.082,stroke:.0946});

export function buildEngine(parent) {
  parent.userData.engineIdentity=ENGINE_IDENTITY;
  const mat=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const aluminium=mat(0xaab2b7,.75,.42),edge=mat(0xd4d9dc,.8,.3),iron=mat(0x545653,.72,.65);
  const plastic=mat(0x25292b,.08,.76),rubber=mat(0x151819,.02,.95),black=mat(0x363b3e,.25,.62);
  const heat=mat(0xb8b7ad,.82,.5),white=mat(0xe6e9ea,.35,.38),blue=mat(0x2888bb,.4,.4);
  function group(name,g=parent){const o=new T.Group();o.name=name;g.add(o);return o;}
  function mesh(g,name,geometry,material,p=[0,0,0],r=[0,0,0]){
    const o=new T.Mesh(geometry,material);o.name=name;o.position.set(...p);o.rotation.set(...r);g.add(o);return o;
  }
  const box=(g,name,size,m,p,r)=>mesh(g,name,new T.BoxGeometry(...size),m,p,r);
  const cyl=(g,name,r,h,m,p,axis='y',r2=r,segments=40)=>mesh(g,name,new T.CylinderGeometry(r,r2,h,segments),m,p,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0]);
  const torus=(g,name,r,t,m,p,axis='z')=>mesh(g,name,new T.TorusGeometry(r,t,8,48),m,p,axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0]);
  function rod(g,name,a,b,r,m){const av=new T.Vector3(...a),bv=new T.Vector3(...b);const o=cyl(g,name,r,av.distanceTo(bv),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;}
  function hose(g,name,points,r,m=rubber){return mesh(g,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),40,r,10,false),m);}
  function profile(g,name,points,depth,m,p=[0,0,0],rotation=[0,0,0],holes=[]){
    const s=new T.Shape(points.map(p=>new T.Vector2(...p)));
    for(const [x,y,r]of holes){const h=new T.Path();h.absarc(x,y,r,0,Math.PI*2,true);s.holes.push(h);}
    const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:3,curveSegments:32});geo.translate(0,0,-depth/2);
    return mesh(g,name,geo,m,p,rotation);
  }
  const bolt=(g,p,axis='x')=>cyl(g,'fastener',.009,.012,edge,p,axis,.009,6);
  function loom(g,name,points,r=.014){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    hose(g,name,points,r);
    const count=Math.ceil(curve.getLength()/.011);
    for(let i=0;i<=count;i++){
      const t=i/count,o=torus(g,'loom-corrugation',r,.002,black,curve.getPointAt(t).toArray());
      o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangentAt(t));
    }
  }
  const bank=group('engine/long-block');bank.rotation.z=-Math.PI/6;
  const cast=group('engine/crankcase',bank);
  const outline=[[-.16,-.14],[.16,-.14],[.18,.02],[.145,.25],[-.145,.25],[-.18,.02]];
  const casting=profile(cast,'closed-deck-block',outline,.65,aluminium.clone(),[0,0,-.015]);
  const blockOutline=group('engine/crankcase-outline',bank);
  const wire=new T.LineSegments(new T.EdgesGeometry(casting.geometry,25),new T.LineBasicMaterial({color:0x6c828b,transparent:true,opacity:.28,depthWrite:false}));
  wire.position.copy(casting.position);blockOutline.add(wire);
  for(const side of [-1,1]){
    for(let i=0;i<7;i++){
      const z=-.335+i*.107;
      rod(cast,'vertical-cast-rib',[side*.16,-.12,z],[side*.153,.23,z],.012,aluminium);
      if(i<6)rod(cast,'diagonal-cast-rib',[side*.17,-.10,z],[side*.151,.16,z+.10],.008,aluminium);
      bolt(cast,[side*.176,-.09,z]);bolt(cast,[side*.16,.20,z]);
    }
    rod(cast,'crankcase-seam',[side*.18,-.115,-.35],[side*.18,-.115,.32],.01,edge);
    for(const z of [-.20,.08])cyl(cast,'casting-boss',.035,.022,aluminium,[side*.173,.06,z],'x');
  }
  const head=group('engine/cylinder-head',bank);
  profile(head,'head-casting',[[-.16,.245],[.16,.245],[.16,.37],[.10,.40],[-.15,.38]],.72,aluminium,[0,0,-.005]);
  for(const side of [-1,1]){
    rod(head,'head-gasket',[side*.162,.246,-.36],[side*.162,.246,.355],.004,iron);
    rod(head,'cover-gasket',[side*.157,.375,-.35],[side*.157,.375,.35],.004,rubber);
    for(let i=0;i<6;i++){
      const z=-.29+i*.112;
      cyl(head,'head-casting-lobe',.040,.021,aluminium,[side*.161,.317,z],'x');
      cyl(head,'head-core-plug',.018,.024,iron,[side*.171,.31,z],'x');
      box(head,'head-reinforcement',[.014,.085,.019],aluminium,[side*.165,.299,z+.045]);
    }
  }
  const valve=group('engine/cylinder-head-cover',bank);
  profile(valve,'moulded-head-cover',[[-.165,.37],[.165,.37],[.15,.455],[.07,.475],[-.145,.45]],.75,plastic,[0,0,0]);
  for(const x of [-.10,.10])rod(valve,'cover-spine',[x,.465,-.35],[x,.465,.34],.013,black);
  for(let i=0;i<6;i++){
    const z=-.285+i*.112;
    box(valve,'coil-pack',[.062,.045,.065],black,[-.015,.49,z]);
    box(valve,'coil-connector',[.037,.025,.027],plastic,[-.078,.475,z]);
    for(const side of [-1,1])bolt(valve,[side*.158,.414,z],'y');
    for(const side of [-1,1]){
      box(valve,'cover-moulding-rib',[.016,.072,.017],black,[side*.157,.408,z+.04]);
      cyl(valve,'cover-bolt-tower',.016,.05,black,[side*.151,.407,z]);
    }
    cyl(head,'intake-port',.034,.012,iron,[-.168,.305,z],'x');
  }
  // Internals are static explanatory geometry. No invented combustion animation.
  const internals=group('engine/rotating-assembly',bank);
  cyl(internals,'crankshaft',.026,.79,iron,[0,-.065,0],'z');
  for(let i=0;i<6;i++){
    const z=-.265+i*.106,phase=[0,2,4,4,2,0][i]*Math.PI/3;
    const pin=[Math.sin(phase)*ENGINE_IDENTITY.stroke/2,-.065+Math.cos(phase)*ENGINE_IDENTITY.stroke/2,z];
    const piston=group(`engine/piston/${i+1}`,internals);
    cyl(piston,'piston',ENGINE_IDENTITY.bore/2,.05,edge,[0,.12+pin[1],z]);
    for(const y of [.13,.141])torus(piston,'piston-ring',.041,.0015,iron,[0,y+pin[1],z],'y');
    rod(piston,'connecting-rod',pin,[0,.105+pin[1],z],.009,aluminium);
    cyl(internals,'counterweight',.065,.022,iron,[pin[0],-.065,z-.032],'z');
  }
  const cams=group('engine/valvetrain',bank);
  for(const x of [-.068,.068]){
    cyl(cams,'camshaft',.012,.68,iron,[x,.403,0],'z');
    for(let i=0;i<12;i++)cyl(cams,'cam-lobe',.022,.013,edge,[x,.407,-.307+i*.055],'z');
  }
  // The timing drive is at the flywheel end of the B58.
  const timing=group('engine/rear-timing-drive',bank);
  for(const [x,y,r]of [[0,-.065,.043],[-.068,.40,.051],[.068,.40,.051]]){
    cyl(timing,'timing-sprocket',r,.022,iron,[x,y,.39],'z');
    torus(timing,'sprocket-ring',r,.006,edge,[x,y,.405]);
  }
  hose(timing,'timing-chain',[[-.038,-.065,.403],[-.118,.395,.403],[-.068,.45,.403],[.068,.45,.403],[.118,.395,.403],[.038,-.065,.403],[-.038,-.065,.403]],.006,iron);
  const timingCover=profile(timing,'rear-timing-cover',[[-.19,-.14],[.19,-.14],[.18,.42],[.07,.49],[-.12,.48],[-.19,.37]],.024,black,[0,0,.423]);
  for(const side of [-1,1])for(let i=0;i<7;i++)bolt(timing,[side*.179,-.10+i*.080,.444],'z');
  for(const x of [-.07,.07])cyl(timing,'cam-sensor',.022,.025,black,[x,.395,.45],'z');
  const flywheel=group('engine/flywheel');
  cyl(flywheel,'flexplate',.19,.022,edge,[0,-.06,.447],'z');
  torus(flywheel,'ring-gear',.185,.011,iron,[0,-.06,.46]);
  for(let i=0;i<48;i++){const a=i*Math.PI/24;box(flywheel,'ring-gear-tooth',[.013,.011,.022],iron,[Math.cos(a)*.195,-.06+Math.sin(a)*.195,.45],[0,0,a]);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;bolt(flywheel,[Math.cos(a)*.05,-.06+Math.sin(a)*.05,.466],'z');}
  const sump=group('engine/oil-pan');
  profile(sump,'stepped-sump',[[-.37,-.13],[.34,-.13],[.35,-.34],[.14,-.35],[.09,-.26],[-.24,-.25],[-.30,-.19],[-.37,-.19]],.31,black,[.025,0,0],[0,-Math.PI/2,0]);
  for(let i=0;i<9;i++)box(sump,'sump-rib',[.33,.012,.016],black,[.025,-.23,-.25+i*.062]);
  cyl(sump,'drain-plug',.012,.012,edge,[.05,-.357,.27]);
  // 119404: six short ports into a ribbed polymer plenum and rectangular cooler.
  const intake=group('engine/charge-air-cooler');
  for(let i=0;i<6;i++){
    const z=-.29+i*.112;
    hose(intake,'short-intake-runner',[[.005,.34,z],[-.13,.29,z],[-.23,.19,z]],.037,plastic);
  }
  profile(intake,'ribbed-plenum',[[-.40,.04],[-.20,.02],[-.19,.26],[-.29,.31],[-.40,.25]],.70,plastic,[0,0,-.005]);
  box(intake,'charge-cooler-core',[.019,.17,.59],aluminium,[-.416,.18,.005]);
  for(let i=0;i<23;i++)box(intake,'cooler-fin',[.008,.155,.006],edge,[-.429,.18,-.275+i*.025]);
  for(let i=0;i<12;i++)box(intake,'plenum-reinforcement',[.023,.09,.008],black,[-.419,.035,-.32+i*.058]);
  for(const z of [-.32,.32])rod(intake,'cooler-end-tank',[-.427,.11,z],[-.427,.265,z],.019,aluminium);
  cyl(intake,'throttle-body',.054,.065,aluminium,[-.31,.035,-.398],'z');
  torus(intake,'throttle-flange',.054,.007,edge,[-.31,.035,-.436]);
  hose(intake,'charge-pipe',[[-.31,.035,-.44],[-.34,-.03,-.49],[-.22,-.13,-.51],[.18,-.12,-.51],[.36,.03,-.27]],.044);
  for(const z of [-.28,.28])hose(intake,'cooler-water-hose',[[-.43,.235,z],[-.47,.24,z],[-.46,-.02,z+.035]],.012);
  // 119400: filter housing and plate heat exchanger low at the rear intake side.
  const oil=group('engine/oil-filter-cooler');
  box(oil,'filter-housing',[.15,.15,.17],black,[-.24,-.055,.28]);
  cyl(oil,'oil-filter-cap',.045,.12,plastic,[-.265,.065,.32]);
  cyl(oil,'filter-hex',.026,.012,black,[-.265,.132,.32],'y',.026,6);
  for(let i=0;i<12;i++)box(oil,'oil-cooler-plate',[.15,.005,.135],aluminium,[-.285,-.15+i*.004,.25]);
  // 119406: one turbine/compressor assembly, fed by the two integrated head exits.
  const turbo=group('engine/twin-scroll-turbo');
  for(const z of [-.15,.12])hose(turbo,'exhaust-feed',[[.29,.235,z],[.39,.20,z],[.425,.105,.01]],.046,iron);
  const turbine=mesh(turbo,'turbine-volute',new T.TorusGeometry(.064,.035,16,48),iron,[.427,.08,.09]);
  const compressor=mesh(turbo,'compressor-volute',new T.TorusGeometry(.067,.027,16,48),aluminium,[.427,.08,-.07]);
  cyl(turbo,'turbo-centre',.036,.145,iron,[.427,.08,.01],'z');
  cyl(turbo,'compressor-inlet',.045,.065,black,[.427,.08,-.133],'z');
  torus(turbo,'inlet-lip',.045,.005,edge,[.427,.08,-.17]);
  hose(turbo,'compressor-outlet',[[.483,.043,-.07],[.48,-.017,-.13],[.36,.03,-.27]],.029,aluminium);
  box(turbo,'wastegate-actuator',[.09,.055,.11],black,[.48,.185,.035]);
  rod(turbo,'wastegate-link',[.49,.155,.015],[.50,.095,.12],.005,edge);
  hose(turbo,'turbo-oil-line',[[.43,.115,.015],[.36,.06,.035],[.24,-.09,.05]],.006,edge);
  hose(turbo,'turbo-coolant-line',[[.43,.04,.015],[.50,-.04,.09],[.38,-.12,.23]],.009,black);
  const shield=profile(turbo,'turbine-heat-shield',[[-.15,-.055],[.15,-.055],[.17,.06],[.07,.11],[-.14,.095]],.006,heat,[.43,.265,.04],[0,0,-.25]);
  shield.rotation.y=Math.PI/2;
  hose(turbo,'downpipe-stub',[[.43,.08,.15],[.46,.01,.24],[.48,-.16,.29]],.055,heat);
  turbine.userData.drawing=compressor.userData.drawing='119406';
  // 119390/119402: crank damper, coolant-pump pulley and tensioner; no belt-driven hybrid motor.
  const belt=group('engine/front-belt-drive');
  for(const [x,y,r]of [[0,-.06,.127],[-.23,.04,.073],[-.12,.16,.04]]){
    cyl(belt,'pulley',r,.043,black,[x,y,-.433],'z');
    for(const z of [-.452,-.442,-.432,-.422])torus(belt,'pulley-groove',r,.003,iron,[x,y,z]);
    cyl(belt,'pulley-hub',r*.35,.05,aluminium,[x,y,-.44],'z');bolt(belt,[x,y,-.473],'z');
  }
  const path=[[-.005,-.19,-.44],[.117,-.12,-.44],[.124,-.025,-.44],[-.08,.18,-.44],[-.13,.20,-.44],[-.165,.165,-.44],[-.168,.075,-.44],[-.26,.109,-.44],[-.30,.02,-.44],[-.26,-.034,-.44],[-.005,-.19,-.44]];
  // A broad flat belt, not a round hose.
  const curve=new T.CatmullRomCurve3(path.map(p=>new T.Vector3(...p)),true),pos=[],idx=[];
  for(let i=0;i<=160;i++){const p=curve.getPoint(i/160);pos.push(p.x,p.y,p.z-.014,p.x,p.y,p.z+.014);if(i<160){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const beltGeo=new T.BufferGeometry();beltGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));beltGeo.setIndex(idx);beltGeo.computeVertexNormals();const beltMat=rubber.clone();beltMat.side=T.DoubleSide;mesh(belt,'serpentine-belt',beltGeo,beltMat);
  const coolant=group('engine/coolant-pump');
  cyl(coolant,'pump-body',.08,.12,aluminium,[-.23,.04,-.34],'z');
  hose(coolant,'coolant-outlet',[[-.23,.12,-.34],[-.25,.25,-.34],[-.38,.31,-.36]],.025,black);
  for(let i=0;i<6;i++)box(coolant,'pump-cast-rib',[.014,.13,.09],aluminium,[-.28+i*.019,.035,-.33]);
  // 220271: unequal cast supports, caged hydraulic isolators, through-bolts.
  const mounts=group('engine/mounts');
  for(const side of [-1,1]){
    const g=group(`engine/mount/${side<0?'left':'right'}`,mounts),x=side*.455,z=side<0?.055:-.015;
    g.userData.drawing='220271';g.userData.side=side<0?'left':'right';
    cyl(g,'hydraulic-isolator',.082,.115,rubber,[x,-.254,z],'y',.07);
    cyl(g,'mount-metal-cup',.088,.070,aluminium,[x,-.232,z],'y',.08);
    cyl(g,'upper-rubber-seat',.067,.040,rubber,[x,-.18,z]);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      box(g,'retaining-tab',[.025,.083,.014],aluminium,[x+Math.cos(a)*.079,-.207,z+Math.sin(a)*.079],[0,Math.PI/2-a,0]);
    }
    cyl(g,'mount-through-bolt',.012,.19,edge,[x,-.245,z]);
    cyl(g,'mount-nut',.019,.021,iron,[x,-.143,z],'y',.019,6);
    const reach=side<0?.26:.18;
    for(const dz of [-reach/2,reach/2]){
      profile(g,'cast-support-web',[[side*.17,.04],[side*.19,.145],[side*.28,.125],[side*.49,-.115],[side*.44,-.16],[side*.22,-.035]],.022,aluminium,[0,0,z+dz],[0,0,0],[[side*.265,.037,.023]]);
      rod(g,'support-rib',[side*.22,.10,z+dz],[x,-.13,z],.014,edge);
      for(const y of [.12,-.015]){cyl(g,'bracket-bolt-boss',.025,.05,aluminium,[side*.19,y,z+dz],'x');bolt(g,[side*.22,y,z+dz]);}
    }
    box(g,'mount-saddle',[.13,.027,.13],aluminium,[x,-.137,z]);
    if(side<0){box(g,'tuned-mass-damper',[.06,.06,.085],iron,[x+.06,-.025,z+.16]);rod(g,'damper-stud',[x+.04,-.025,z+.10],[x+.06,-.025,z+.16],.009,edge);}
  }
  // Loom is routed around the head; hoses end within this assembly.
  const wiring=group('engine/wiring');
  loom(wiring,'main-loom',[[-.14,.43,-.35],[-.12,.49,-.15],[-.12,.49,.26],[-.16,.31,.43],[-.25,.01,.39]],.016);
  for(let i=0;i<6;i++){const z=-.285+i*.112;hose(wiring,'coil-branch',[[-.11,.49,z],[-.035,.515,z],[.10,.50,z]],.006);}
  loom(wiring,'rear-loom',[[-.24,.08,.42],[-.16,.28,.45],[.14,.42,.44],[.31,.26,.42],[.37,.02,.32]],.013);
  for(const z of [-.30,-.12,.10,.28])box(wiring,'loom-clip',[.045,.028,.018],black,[-.12,.49,z]);
  // 119410 acoustic cover: asymmetric perimeter, filler opening, six moulded flutes.
  const cover=group('engine/acoustic-cover');cover.position.set(.035,.535,0);cover.rotation.z=-.10;
  profile(cover,'acoustic-shell',[[-.245,-.34],[-.21,-.415],[.11,-.43],[.22,-.38],[.25,-.19],[.24,.34],[.17,.40],[-.23,.39],[-.26,.24]],.045,plastic,[0,0,0],[Math.PI/2,0,0],[[.065,-.055,.044]]);
  profile(cover,'raised-stripe-shoulder',[[-.231,-.32],[-.199,-.394],[-.061,-.408],[-.055,.378],[-.223,.369]],.017,black,[0,.033,0],[Math.PI/2,0,0]);
  for(let i=0;i<6;i++){
    const z=-.27+i*.10;
    profile(cover,'recessed-cover-flute',[[.038,-.018],[.182,-.013],[.202,.008],[.074,.014]],.002,rubber,[0,.028,z],[Math.PI/2,0,0]);
    rod(cover,'flute-lip',[.074,.029,z-.014],[.201,.030,z-.008],.003,black);
  }
  cyl(cover,'oil-filler-cap',.036,.018,black,[.065,.02,-.055]);box(cover,'filler-grip',[.058,.008,.012],plastic,[.065,.033,-.055]);
  for(const x of [-.18,-.168,-.156])for(const [z,l]of [[-.205,.19],[.24,.26]])box(cover,'cover-stripe',[.005,.002,l],white,[x,.049,z]);
  // Raised BMW lettering, made from geometry so it works offline without fonts.
  const letters={B:[[0,0],[0,1],[.6,1],[.8,.8],[.6,.5],[0,.5],[.6,.5],[.8,.2],[.6,0],[0,0]],M:[[0,0],[0,1],[.45,.45],[.9,1],[.9,0]],W:[[0,1],[.22,0],[.5,.6],[.77,0],[1,1]]};
  for(const [i,ch]of [...'BMW'].entries()){const pts=letters[ch];for(let j=1;j<pts.length;j++)rod(cover,'BMW-letter',[-.20+pts[j-1][1]*.045,.050,-.06+(i+pts[j-1][0])*.034],[-.20+pts[j][1]*.045,.050,-.06+(i+pts[j][0])*.034],.002,white);}
  const badge=group('engine/roundel',cover);badge.position.set(-.17,.051,-.338);
  cyl(badge,'badge-ring',.021,.003,edge);cyl(badge,'badge-black',.018,.004,rubber);
  for(let i=0;i<4;i++){const s=new T.Shape();s.moveTo(0,0);s.absarc(0,0,.013,i*Math.PI/2,(i+1)*Math.PI/2,false);s.closePath();mesh(badge,'roundel-quadrant',new T.ShapeGeometry(s),i%2?white:blue,[0,.003,0],[-Math.PI/2,0,0]);}
  const coverBase=cover.position.clone();
  return {dynamic:[casting,timingCover],update(cutaway,explode){
    cover.visible=!cutaway;cover.position.copy(coverBase);cover.position.y+=explode*.32;
    valve.visible=!cutaway;head.visible=!cutaway;timingCover.visible=!cutaway;cast.visible=!cutaway;blockOutline.visible=cutaway;
    casting.material.transparent=cutaway;casting.material.opacity=cutaway?.13:1;casting.material.depthWrite=!cutaway;
    internals.visible=cutaway;cams.visible=cutaway;
  }};
}
