import * as T from './three.module.js';

// BMW 740 M: reconstructed from the user's OR24 and RevolutionParts front photographs.
// Coordinates retain the atlas's existing wheel/tyre scale and axle placement.
export function buildWheel740(parent,side) {
  const wheel=new T.Group();wheel.name='740-m-wheel';wheel.position.x=side*.126;wheel.rotation.y=side*Math.PI/2;
  wheel.userData.wheelStyle='740 M';parent.add(wheel);
  const alloy=new T.MeshStandardMaterial({color:0xe0e2e3,metalness:.45,roughness:.28});
  const orbit=new T.MeshStandardMaterial({color:0x414446,metalness:.35,roughness:.39,side:T.DoubleSide});
  const recess=new T.MeshStandardMaterial({color:0x141719,metalness:.15,roughness:.72});
  const white=new T.MeshStandardMaterial({color:0xf1f2f3,metalness:.2,roughness:.35});
  const blue=new T.MeshStandardMaterial({color:0x1777b3,metalness:.25,roughness:.32});
  const add=(name,geometry,material,z=0)=>{const m=new T.Mesh(geometry,material);m.name=name;m.position.z=z;wheel.add(m);return m;};
  const depth=r=>-.032+Math.pow(Math.min(r/.315,1),.65)*.064;
  function surface(name,points,material,z=0,thickness=.006,holes=[]){
    const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));
    for(const [x,y,r]of holes){const hole=new T.Path();hole.absarc(x,y,r,0,2*Math.PI,true);shape.holes.push(hole);}
    let geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.0015,bevelThickness:.001,bevelSegments:2,curveSegments:32});
    // Subdivide before bending: long face triangles otherwise cut through the
    // differently triangulated shoulder and create missing silver wedges.
    let triangles=geo.index?geo.toNonIndexed():geo;
    for(let pass=0;pass<4;pass++){
      const a=triangles.attributes.position,values=[];
      for(let i=0;i<a.count;i+=3){
        const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,i+j));
        if(Math.max(p[0].distanceTo(p[1]),p[1].distanceTo(p[2]),p[2].distanceTo(p[0]))<.04){for(const v of p)values.push(...v.toArray());continue;}
        const ab=p[0].clone().add(p[1]).multiplyScalar(.5),bc=p[1].clone().add(p[2]).multiplyScalar(.5),ca=p[2].clone().add(p[0]).multiplyScalar(.5);
        for(const v of [p[0],ab,ca,ab,p[1],bc,ca,bc,p[2],ab,bc,ca])values.push(...v.toArray());
      }
      triangles.dispose();triangles=new T.BufferGeometry();triangles.setAttribute('position',new T.Float32BufferAttribute(values,3));
    }
    geo=triangles;
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
  const lip=new T.RingGeometry(.282,.315,96);add('broad-orbit-rim-lip',lip,orbit,.024);
  const lipEdge=new T.RingGeometry(.311,.319,96);add('polished-rim-lip',lipEdge,alloy,.038);

  const circle=[];for(let i=0;i<80;i++){const a=i*Math.PI/40;circle.push([Math.cos(a)*.093,Math.sin(a)*.093]);}
  const holes=[];
  for(let i=0;i<5;i++){const a=Math.PI/2+i*Math.PI*2/5;holes.push([Math.cos(a)*.064,Math.sin(a)*.064,.019]);}
  surface('five-bolt-hub',circle,orbit,-.014,.021,holes);
  // Trace one upper spoke pair from the square front reference (centre 320,320).
  // Repeat the pair at 72 degrees; each branch has a narrow machined face,
  // a wider sculpted shoulder and an open tapered window beside it.
  const trace=points=>points.map(([x,y])=>[(x-320)*.001,(320-y)*.001]);
  const shoulder=trace([[328,283],[328,242],[338,183],[356,110],[373,42],[383,15],[430,26],[421,61],[408,115],[389,146],[379,223],[365,279],[346,291]]);
  const face=trace([[337,273],[345,234],[362,166],[379,88],[396,13],[410,18],[391,91],[379,132],[369,139],[360,183],[349,259],[344,277]]);
  const channel=trace([[378,125],[390,84],[408,24],[416,27],[401,84],[390,116],[384,123]]);
  const hubFace=trace([[309,286],[319,283],[331,286],[347,278],[359,274],[351,289],[353,304],[366,315],[360,322],[347,325],[337,339],[328,350],[315,350],[307,337],[294,329],[278,325],[277,315],[292,303],[292,287],[301,277]]);
  surface('machined-star-centre',hubFace,alloy,.003,.003);
  for(let pair=0;pair<5;pair++){
    const angle=pair*Math.PI*2/5,c=Math.cos(angle),s=Math.sin(angle);
    for(const side of [-1,1]){
      const rotate=points=>points.map(([x,y])=>[side*x*c-y*s,side*x*s+y*c]);
      const tag=pair+'-'+side;
      surface('paired-spoke-shoulder-'+tag,rotate(shoulder),orbit,-.018,.028);
      surface('machined-spoke-'+tag,rotate(face),alloy,.012,.003);
      surface('recessed-spoke-channel-'+tag,rotate(channel),recess,.011,.001);
    }
    // Short machined arc at the outer edge of each trapezoidal opening.
    const arc=[];for(let j=0;j<=16;j++){const a=Math.PI/2+angle-.24+j*.48/16;arc.push([Math.cos(a)*.313,Math.sin(a)*.313]);}
    for(let j=16;j>=0;j--){const a=Math.PI/2+angle-.24+j*.48/16;arc.push([Math.cos(a)*.307,Math.sin(a)*.307]);}
    surface('window-rim-'+pair,arc,alloy,.004,.003);
  }
  for(const [x,y]of holes){
    const socket=disc('recessed-bolt-seat',.017,.014,recess,.013);socket.position.set(x,y,.013);
    const boltGeo=new T.CylinderGeometry(.0065,.0065,.005,6);boltGeo.rotateX(Math.PI/2);
    const bolt=add('wheel-bolt',boltGeo,orbit,.019);bolt.position.set(x,y,.019);
  }
  disc('centre-cap-surround',.035,.009,alloy,.040);
  disc('centre-cap',.032,.006,recess,.047);
  for(let i=0;i<4;i++){
    add('bmw-roundel-quarter',new T.CircleGeometry(.023,24,i*Math.PI/2,Math.PI/2),i%2?white:blue,.052);
  }
  // Lettering follows the black outer annulus, independently of font loading.
  const glyphs={B:[[[0,0],[0,1],[.55,1],[.8,.8],[.55,.52],[0,.52]],[[.55,.52],[.8,.27],[.55,0],[0,0]]],M:[[[0,0],[0,1],[.4,.48],[.8,1],[.8,0]]],W:[[[0,1],[.18,0],[.4,.55],[.62,0],[.8,1]]]};
  for(const [letter,angle]of [['B',-.62],['M',0],['W',.62]]){
    const center=new T.Vector2(Math.sin(angle)*.0275,Math.cos(angle)*.0275);
    for(const line of glyphs[letter])for(let i=1;i<line.length;i++){
      const points=[line[i-1],line[i]].map(([x,y])=>{
        const u=(x-.4)*.0065,v=(y-.5)*.007;
        return new T.Vector3(center.x+u*Math.cos(angle)+v*Math.sin(angle),center.y-u*Math.sin(angle)+v*Math.cos(angle),.053);
      });
      const path=new T.LineCurve3(...points);add('bmw-letter-'+letter,new T.TubeGeometry(path,1,.00065,6,false),white);
    }
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

// Generic road tyre: continuous rubber casing with recessed tread, not a claimed
// tyre make or fitment. X is the axle; dimensions preserve the existing envelope.
export function buildTyre(parent) {
  const tyre=new T.Group();tyre.name='road-tyre';parent.add(tyre);
  const side=[[-.126,.318],[-.137,.332],[-.147,.365],[-.148,.399],[-.142,.433],[-.130,.457],[-.112,.475]];
  const shoulder=new T.CatmullRomCurve3(side.map(([x,r])=>new T.Vector3(x,r,0)));
  const left=shoulder.getPoints(28).map(p=>[p.x,p.y]);
  const profile=[...left];
  for(let j=1;j<=112;j++){
    const x=-.112+j*.002;
    profile.push([x,.483-.008*Math.pow(Math.abs(x)/.112,4)]);
  }
  profile.push(...left.slice(0,-1).reverse().map(([x,r])=>[-x,r]),side[0]);
  const segments=512,positions=[],indices=[];
  const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  for(let i=0;i<=segments;i++){
    const angle=i/segments*Math.PI*2;
    for(const [x,radius] of profile){
      let groove=0;
      if(radius>.445){
        // Four drainage channels, and staggered angled slots between tread blocks.
        for(const center of [-.075,-.025,.025,.075])
          groove=Math.max(groove,.006*smooth((.0045-Math.abs(x-center))/.0015));
        const band=Math.floor((x+.125)/.05);
        const phase=angle/(Math.PI*2)*64+x*7+(band%2)*.43;
        const distance=Math.abs(phase-Math.round(phase));
        const lateral=.0038*smooth((.13-distance)/.065);
        groove=Math.max(groove,lateral)*smooth((radius-.445)/.029);
      }
      const r=radius-groove;
      positions.push(x,r*Math.cos(angle),r*Math.sin(angle));
    }
  }
  const stride=profile.length;
  for(let i=0;i<segments;i++)for(let j=0;j<stride-1;j++){
    const a=i*stride+j,b=a+stride;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  // Weld lighting at the angular seam without changing the indexed surface.
  const normals=geometry.attributes.normal;
  for(let j=0;j<stride;j++){
    const a=new T.Vector3().fromBufferAttribute(normals,j);
    a.add(new T.Vector3().fromBufferAttribute(normals,segments*stride+j)).normalize();
    normals.setXYZ(j,a.x,a.y,a.z);normals.setXYZ(segments*stride+j,a.x,a.y,a.z);
  }
  const rubber=new T.MeshStandardMaterial({color:0x242629,metalness:0,roughness:.88});
  tyre.add(new T.Mesh(geometry,rubber));
  return tyre;
}
