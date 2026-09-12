import * as T from './three.module.js';

// Exterior reconstruction from the owner's BMW GA8HP60X illustration (548985).
// Local connection planes let the vehicle set scale without separating the cases.
// These remain illustration units, not factory CAD or measured service dimensions.
export const TRANSMISSION_CONNECTIONS=Object.freeze({input:[0,0,-.49],output:[0,0,.589]});
export function buildTransmission(parent) {
  const assembly=new T.Group();assembly.name='ga8hp60x';assembly.userData.transmission='GA8HP60X';parent.add(assembly);
  const cast=new T.MeshStandardMaterial({color:0x999fa3,metalness:.48,roughness:.48});
  const edge=new T.MeshStandardMaterial({color:0xbac0c3,metalness:.6,roughness:.34});
  const black=new T.MeshStandardMaterial({color:0x25292c,metalness:.08,roughness:.72});
  function mesh(name,geo,mat,pos=[0,0,0]){const m=new T.Mesh(geo,mat);m.name=name;m.position.set(...pos);assembly.add(m);return m;}
  function cylinder(name,r,len,mat,pos,axis='z'){
    const m=mesh(name,new T.CylinderGeometry(r,r,len,32),mat,pos);
    if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;return m;
  }
  function rib(a,b,r=.008,mat=cast){
    const start=new T.Vector3(...a),end=new T.Vector3(...b);
    const m=mesh('cast-rib',new T.CylinderGeometry(r,r,start.distanceTo(end),8),mat);
    m.position.copy(start).add(end).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return m;
  }
  function shell(name,profile){
    const points=[],indices=[],n=72;
    for(const [z,rx,ry,floor] of profile)for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2;points.push(Math.cos(a)*rx,Math.max(Math.sin(a)*ry,floor),z);
    }
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<n;i++){
      const a=j*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,a+1,b+1,b);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(name,geo,cast);
  }
  // Broad, open engine flange narrows into the long, asymmetric cast housing.
  shell('bellhousing',[[-.485,.311,.316,-.29],[-.46,.316,.318,-.29],[-.37,.302,.307,-.28],[-.22,.272,.276,-.255],[-.12,.232,.25,-.235]]);
  shell('bellhousing-inner',[[-.12,.216,.23,-.215],[-.22,.25,.254,-.235],[-.37,.28,.285,-.26],[-.49,.282,.282,-.27]]);
  shell('main-casing',[[-.13,.233,.25,-.235],[.02,.226,.245,-.225],[.28,.218,.233,-.218],[.40,.195,.214,-.20],[.49,.162,.175,-.17],[.55,.153,.162,-.155]]);
  const lip=new T.Shape();lip.absarc(0,0,.313,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,.282,0,Math.PI*2,true);lip.holes.push(hole);
  mesh('engine-flange',new T.ExtrudeGeometry(lip,{depth:.022,bevelEnabled:false,curveSegments:64}),edge,[0,0,-.49]);
  cylinder('converter-face',.276,.036,cast,[0,0,-.44]);
  cylinder('converter-dish',.209,.022,cast,[0,0,-.463]);
  cylinder('converter-hub',.076,.035,edge,[0,0,-.486]);
  cylinder('input-pilot',.032,.045,edge,[0,0,-.52]);
  for(let i=0;i<12;i++){
    const a=(i+.35)*Math.PI/6,x=Math.cos(a),y=Math.sin(a);
    cylinder('flange-boss',.022,.04,cast,[x*.303,y*.303,-.463]);
    cylinder('flange-bolt',.010,.01,edge,[x*.303,y*.303,-.491]);
    rib([x*.309,y*.309,-.45],[x*.239,Math.max(y*.257,-.232),-.135],.007);
  }
  for(const a of [.25,.85,1.4,2.05,2.75,3.5,5.7]){
    const x=Math.cos(a),y=Math.sin(a);
    rib([x*.236,y*.252,-.13],[x*.221,y*.238,.29]);
    rib([x*.221,y*.238,.29],[x*.163,y*.176,.49]);
  }
  // Cast side cover, perimeter fasteners and triangular webs (not cooling rings).
  for(const side of [-1,1]){
    const cover=new T.Shape();cover.moveTo(-.17,-.09);cover.lineTo(-.19,.22);cover.quadraticCurveTo(-.12,.38,.04,.39);cover.lineTo(.15,.27);cover.lineTo(.18,.0);cover.lineTo(.10,-.11);cover.closePath();
    const m=mesh('side-cover',new T.ExtrudeGeometry(cover,{depth:.018,bevelEnabled:true,bevelSize:.007,bevelThickness:.004,bevelSegments:2}),cast,[side*.218,0,0]);
    // Cover coordinates are Y/Z; its normal points outward along X.
    m.rotation.y=side*Math.PI/2;m.rotation.z=Math.PI/2;
    for(const z of [-.08,.08,.24,.36])for(const y of [-.15,.13])
      cylinder('cover-fastener',.012,.033,edge,[side*.231,y,z],'x');
    for(const z of [-.07,.10,.27]){
      rib([side*.235,-.17,z],[side*.234,.13,z+.09],.009);
      rib([side*.235,-.17,z],[side*.22,-.205,z+.13],.010);
    }
    cylinder('service-plug',.028,.03,edge,[side*.24,-.075,-.12],'x');
  }
  // Shallow black sump beneath the flatter lower housing.
  const pan=new T.Shape();pan.moveTo(-.18,-.15);pan.lineTo(.18,-.15);pan.quadraticCurveTo(.204,-.15,.204,-.12);pan.lineTo(.18,.37);pan.quadraticCurveTo(.17,.41,.14,.41);pan.lineTo(-.14,.41);pan.quadraticCurveTo(-.18,.41,-.18,.37);pan.lineTo(-.204,-.12);pan.quadraticCurveTo(-.204,-.15,-.18,-.15);
  const sump=mesh('oil-pan',new T.ExtrudeGeometry(pan,{depth:.047,bevelEnabled:true,bevelSize:.012,bevelThickness:.006,bevelSegments:3}),black,[0,-.23,0]);sump.rotation.x=Math.PI/2;
  for(const x of [-.185,.185])for(const z of [-.10,.01,.12,.23,.34])cylinder('pan-bolt',.010,.018,edge,[x,-.24,z],'y');
  for(const x of [-.13,-.065,0,.065,.13])rib([x,-.283,-.08],[x,-.283,.32],.005,black);
  cylinder('output-neck',.15,.08,cast,[0,0,.54]);cylinder('output-flange',.165,.024,edge,[0,0,.577]);
  for(const x of [-.17,.17]){
    const lug=mesh('rear-mount-ear',new T.BoxGeometry(.07,.075,.085),cast,[x,-.16,.46]);lug.rotation.z=x>0?-.3:.3;
    cylinder('mount-bolt',.015,.018,edge,[x,-.20,.46],'y');
  }
  const harness=new T.CatmullRomCurve3([[.08,.242,-.10],[.18,.20,.02],[.235,.12,.18],[.232,-.06,.32],[.18,-.185,.38]].map(p=>new T.Vector3(...p)));
  mesh('external-harness',new T.TubeGeometry(harness,40,.006,8,false),black);
  return assembly;
}
