import * as T from './three.module.js';

// BMW 740 M: reconstructed from the user's Leebmann photograph.
// Coordinates retain the atlas's existing wheel/tyre scale and axle placement.
export function buildWheel740(parent,side) {
  const wheel=new T.Group();wheel.name='740-m-wheel';wheel.position.x=side*.126;wheel.rotation.y=side*Math.PI/2;
  wheel.userData.wheelStyle='740 M';parent.add(wheel);
  const alloy=new T.MeshStandardMaterial({color:0xcbd0d2,metalness:.8,roughness:.25});
  const orbit=new T.MeshStandardMaterial({color:0x414446,metalness:.65,roughness:.39});
  const recess=new T.MeshStandardMaterial({color:0x141719,metalness:.15,roughness:.72});
  const white=new T.MeshStandardMaterial({color:0xf1f2f3,metalness:.2,roughness:.35});
  const blue=new T.MeshStandardMaterial({color:0x1777b3,metalness:.25,roughness:.32});
  const add=(name,geometry,material,z=0)=>{const m=new T.Mesh(geometry,material);m.name=name;m.position.z=z;wheel.add(m);return m;};
  const depth=r=>.008+Math.pow(Math.min(r/.315,1),1.6)*.025;
  function surface(name,points,material,z=0,thickness=.006,holes=[]){
    const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));
    for(const [x,y,r]of holes){const hole=new T.Path();hole.absarc(x,y,r,0,2*Math.PI,true);shape.holes.push(hole);}
    const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.0015,bevelThickness:.001,bevelSegments:2,curveSegments:32});
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+depth(Math.hypot(p.getX(i),p.getY(i))));
    geo.computeVertexNormals();return add(name,geo,material,z);
  }
  function ring(name,r,t,material,z){return add(name,new T.TorusGeometry(r,t,10,96),material,z);}
  function disc(name,r,h,material,z){const geo=new T.CylinderGeometry(r,r,h,64);geo.rotateX(Math.PI/2);return add(name,geo,material,z);}
  // Open barrel and fine machined rim flanges; brake discs stay visible through the spokes.
  const barrel=new T.CylinderGeometry(.308,.302,.24,80,1,true);barrel.rotateX(Math.PI/2);
  add('orbit-grey-barrel',barrel,orbit,-.103);
  ring('inner-barrel-lip',.301,.006,orbit,-.225);
  ring('outer-rim',.313,.008,orbit,.030);
  ring('machined-rim-edge',.319,.0035,alloy,.036);
  ring('inner-machined-edge',.305,.0025,alloy,.033);

  const circle=[];for(let i=0;i<64;i++){const a=i*Math.PI/32;circle.push([Math.cos(a)*.081,Math.sin(a)*.081]);}
  const holes=[];
  for(let i=0;i<5;i++){const a=Math.PI/10+i*Math.PI*2/5;holes.push([Math.cos(a)*.063,Math.sin(a)*.063,.012]);}
  surface('five-bolt-hub',circle,alloy,0,.016,holes);
  // Ten broad star spokes, with a recessed Orbit Grey face between machined edges.
  const spoke=[[.058,-.010],[.128,-.017],[.247,-.035],[.306,-.044],[.310,.043],[.248,.034],[.127,.017],[.058,.010]];
  const inset=[[.104,-.007],[.153,-.013],[.255,-.028],[.300,-.034],[.302,.033],[.256,.027],[.151,.012],[.104,.007]];
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,c=Math.cos(a),s=Math.sin(a);
    const rotate=points=>points.map(([r,t])=>[r*c-t*s,r*s+t*c]);
    surface(`star-spoke-${i+1}`,rotate(spoke),orbit,-.020,.028);
    surface(`machined-spoke-${i+1}`,rotate(spoke),alloy,.009,.002);
    surface(`orbit-grey-spoke-${i+1}`,rotate(inset),orbit,.014,.001);
  }
  for(const [x,y]of holes){
    const socket=disc('recessed-bolt-seat',.011,.014,recess,.013);socket.position.set(x,y,.013);
    const boltGeo=new T.CylinderGeometry(.0065,.0065,.005,6);boltGeo.rotateX(Math.PI/2);
    const bolt=add('wheel-bolt',boltGeo,orbit,.019);bolt.position.set(x,y,.019);
  }
  disc('centre-cap-surround',.035,.009,alloy,.031);
  disc('centre-cap',.032,.011,recess,.033);
  for(let i=0;i<4;i++){
    const shape=new T.Shape();shape.moveTo(0,0);shape.absarc(0,0,.023,i*Math.PI/2,(i+1)*Math.PI/2,false);shape.closePath();
    add('bmw-roundel-quarter',new T.ShapeGeometry(shape),i%2?white:blue,.039);
  }
  // Small M insert below the centre cap and valve at the outer rim.
  const badge=add('m-badge-background',new T.BoxGeometry(.024,.012,.002),recess,.036);badge.position.y=-.046;
  for(const [i,color]of [0x43a9db,0x244a92,0xc72d45].entries()){
    const m=add('m-colour-stripe',new T.BoxGeometry(.003,.008,.001),new T.MeshStandardMaterial({color,roughness:.4}),.038);
    m.position.set(-.008+i*.0035,-.046,.038);m.rotation.z=-.20;
  }
  const stem=disc('tyre-valve',.005,.019,recess,.039);stem.position.y=-.283;
  return wheel;
}
