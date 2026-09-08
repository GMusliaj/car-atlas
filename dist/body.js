import * as T from './three.module.js';
import {bodySource,bodyProfiles} from './models/g05-source.js';

export const BODY_IDENTITY = Object.freeze({make:'BMW',model:'X5',generation:'G05',facelift:'LCI',trim:'M Sport',paint:'Alpine White III',paintCode:'300',sourceYear:2018,derivative:true});
export const BODY_SCALE = 3.14 / (293.30399 + 6.309);
export const bodyPoint = ([x,y,z]) => [z*BODY_SCALE,(y+37.43)*BODY_SCALE,(x+6.309)*BODY_SCALE-1.52];
const decode = (text,Type) => new Type(Uint8Array.from(atob(text),c=>c.charCodeAt(0)).buffer);
const sourcePoint = ([x,y,z]) => [(z+1.52)/BODY_SCALE-6.309,y/BODY_SCALE-37.43,x/BODY_SCALE];
function depthAt(name,z,y) {
  const p=bodyProfiles[name];z=T.MathUtils.clamp(z,p.minZ,p.maxZ)-p.minZ;y=T.MathUtils.clamp(y,p.minY,p.maxY)-p.minY;
  const x0=Math.floor(z),y0=Math.floor(y),x1=Math.min(x0+1,p.width-1),y1=Math.min(y0+1,p.maxY-p.minY);
  return T.MathUtils.lerp(T.MathUtils.lerp(p.depths[y0*p.width+x0],p.depths[y0*p.width+x1],z-x0),T.MathUtils.lerp(p.depths[y1*p.width+x0],p.depths[y1*p.width+x1],z-x0),y-y0);
}

// Remove the 2018 xLine-specific bumper surfaces, silver skid trims and badges.
// The common bonnet, roof, doors, fenders and glazing retain BMW's mesh.
function retainTriangle(name,[x,y,z]) {
  const frontBumper=x < -40 && y < 40 && !(Math.abs(z)<48 && y>20);
  const rearBumper=x > 350 && y < 23;
  if(name==='paint/Exterior_paint') return !frontBumper && !rearBumper;
  if(name.startsWith('trim/Exterior_Chrome_Matte')) return y>112;
  if(name==='tailgate/Tailgate_U_chrome') return false;
  if(name.startsWith('trim/') && !/glass|Gass|chrome$/.test(name)) return !frontBumper && !rearBumper;
  return true;
}
function splitPolygon(polygon,axis,value) {
  const halves=[[],[]];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[axis]-value,db=b[axis]-value;
    halves[da>=0?1:0].push(a);
    if((da>0&&db<0)||(da<0&&db>0)) {
      const t=da/(da-db),p=a.map((v,j)=>T.MathUtils.lerp(v,b[j],t));halves[0].push(p);halves[1].push(p);
    }
  }
  return halves.filter(p=>p.length>=3);
}

// The original G05 panels are bundled locally. Never substitute a primitive shell
// when the source is missing: the module load must fail visibly.
export function buildBody(group) {
  group.userData.vehicle = BODY_IDENTITY;
  const materials = {
    paint:new T.MeshStandardMaterial({color:0xf4f4ef,metalness:.05,roughness:.3,side:T.DoubleSide}),
    trim:new T.MeshStandardMaterial({color:0x26343c,metalness:.25,roughness:.42,side:T.DoubleSide}),
    chrome:new T.MeshStandardMaterial({color:0x879ba5,metalness:.85,roughness:.26,side:T.DoubleSide}),
    glass:new T.MeshStandardMaterial({color:0x506b78,metalness:.1,roughness:.22,side:T.DoubleSide}),
    headlight:new T.MeshStandardMaterial({color:0x182d3b,metalness:.4,roughness:.19,side:T.DoubleSide}),
    taillight:new T.MeshStandardMaterial({color:0x391d29,metalness:.2,roughness:.22,side:T.DoubleSide}),
    drl:new T.MeshStandardMaterial({color:0xdcefff,emissive:0xb1d8ff,emissiveIntensity:.8,side:T.DoubleSide}),
    red:new T.MeshStandardMaterial({color:0xdd263b,emissive:0xc11728,emissiveIntensity:.6,side:T.DoubleSide})
  };
  const lines=new T.LineBasicMaterial({color:0x3e6679,transparent:true,opacity:.28});
  const topology=new T.LineBasicMaterial({color:0x547e92,transparent:true,opacity:.035});
  function add(name,geometry,kind,wire=false) {
    geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,materials[kind]);mesh.name=name;group.add(mesh);
    const edge=new T.LineSegments(new T.EdgesGeometry(geometry,28),lines);edge.name=name+'/edges';group.add(edge);
    if(wire) {const line=new T.LineSegments(new T.WireframeGeometry(geometry),topology);line.name=name+'/topology';group.add(line);}
    return mesh;
  }
  for(const source of bodySource) {
    const geometry=new T.BufferGeometry();
    const positions=Array.from(decode(source.positions,Int16Array),v=>v/10000);
    const raw=decode(source.indices,Uint16Array),indices=[];
    for(let i=0;i<raw.length;i+=3) {
      const p=[0,1,2].map(j=>sourcePoint(positions.slice(raw[i+j]*3,raw[i+j]*3+3)));
      const keep=p.map(point=>retainTriangle(source.name,point));
      if(keep.every(Boolean)) {indices.push(raw[i],raw[i+1],raw[i+2]);continue;}
      if(!keep.some(Boolean))continue;
      let polygons=[p];
      for(const [axis,value]of [[0,-40],[1,40],[2,-48],[2,48],[1,20],[0,350],[1,23]])polygons=polygons.flatMap(poly=>splitPolygon(poly,axis,value));
      for(const poly of polygons) {
        const center=[0,1,2].map(axis=>poly.reduce((n,v)=>n+v[axis],0)/poly.length);
        if(!retainTriangle(source.name,center))continue;
        const base=positions.length/3;for(const point of poly)positions.push(...bodyPoint(point));
        for(let j=1;j<poly.length-1;j++)indices.push(base,base+j,base+j+1);
      }
    }
    if(!indices.length)continue;
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    let kind=source.kind;
    if(source.name.includes('Gass'))kind='glass';
    // Shadowline surrounds and rails; chrome kidneys remain single-bar 40i style.
    if(kind==='chrome'&&source.name!=='trim/Exterior_chrome'&&!source.name.includes('SideMirrors_chrome'))kind='trim';
    if(kind==='headlight') {
      // Close the lower portion of the old aperture with body colour, then move
      // the narrowed lens just forward. The 2018 DRLs are never imported.
      add('lci/headlamp-aperture-infill',geometry.clone(),'paint');
      for(let i=0;i<positions.length;i+=3) {
        const p=sourcePoint(positions.slice(i,i+3));p[1]=56.45-(56.45-p[1])*.8;p[0]-=.5;
        const point=bodyPoint(p);for(let j=0;j<3;j++)positions[i+j]=point[j];
      }
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    }
    if(source.name==='trim/Exterior_plastic_grained_black') {
      const coloured=[],remaining=[];
      for(let i=0;i<indices.length;i+=3) {
        const center=[0,0,0];for(let j=0;j<3;j++)for(let a=0;a<3;a++)center[a]+=positions[indices[i+j]*3+a]/3;
        const [x,y,z]=sourcePoint(center),radius=Math.min(Math.hypot(x+6.309,y),Math.hypot(x-293.30399,y));
        (Math.abs(z)>91&&radius>41&&radius<59?coloured:remaining).push(indices[i],indices[i+1],indices[i+2]);
      }
      const arches=geometry.clone();arches.setIndex(coloured);add('m-sport/body-colour-arches',arches,'paint',true);geometry.setIndex(remaining);
    }
    add(source.name,geometry,kind,kind==='paint');
  }
  // LCI M Sport adaptation, traced from the official 2024 40i M Sport brochure.
  // Coordinates below share the BMW source frame (cm); these are reference-
  // modelled surfaces, not factory LCI CAD. See models/README.md for attribution.
  function panel(name,outline,holes,project,kind) {
    const shape=new T.Shape(outline.map(p=>new T.Vector2(...p)));
    for(const hole of holes)shape.holes.push(new T.Path(hole.map(p=>new T.Vector2(...p))));
    const geometry=new T.ShapeGeometry(shape,12);
    // Subdivide long triangles before bending so surfaces follow the bumper.
    let triangles=geometry.index?geometry.toNonIndexed():geometry;
    for(let pass=0;pass<4;pass++) {
      const a=triangles.attributes.position, next=[];
      for(let i=0;i<a.count;i+=3) {
        const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,i+j));
        const ab=p[0].clone().add(p[1]).multiplyScalar(.5),bc=p[1].clone().add(p[2]).multiplyScalar(.5),ca=p[2].clone().add(p[0]).multiplyScalar(.5);
        for(const v of [p[0],ab,ca,ab,p[1],bc,ca,bc,p[2],ab,bc,ca])next.push(...v.toArray());
      }
      triangles.dispose();triangles=new T.BufferGeometry();triangles.setAttribute('position',new T.Float32BufferAttribute(next,3));
    }
    const attr=triangles.attributes.position;
    for(let i=0;i<attr.count;i++)attr.setXYZ(i,...bodyPoint(project(attr.getX(i),attr.getY(i))));
    // Shared vertices give the curved skin continuous shading.
    const unique=new Map(),positions=[],indices=[];
    for(let i=0;i<attr.count;i++) {
      const point=[attr.getX(i),attr.getY(i),attr.getZ(i)],key=point.map(v=>Math.round(v*1e6)).join(',');
      if(!unique.has(key)){unique.set(key,positions.length/3);positions.push(...point);}indices.push(unique.get(key));
    }
    triangles.dispose();const smooth=new T.BufferGeometry();smooth.setAttribute('position',new T.Float32BufferAttribute(positions,3));smooth.setIndex(indices);
    geometry.dispose();return add(name,smooth,kind);
  }
  function stroke(name,points,radius,kind) {
    const path=new T.CurvePath();const p=points.map(p=>new T.Vector3(...bodyPoint(p)));
    for(let i=1;i<p.length;i++)path.add(new T.LineCurve3(p[i-1],p[i]));
    return add(name,new T.TubeGeometry(path,(p.length-1)*5,radius*BODY_SCALE,5,false),kind);
  }
  // Smooth envelopes fitted to the measured source sections. Sampling the old
  // intake recesses directly would fold the new surfaces into the old holes.
  const frontX=(z,y)=>{
    const w=z/100,t=T.MathUtils.clamp((y+8)/50,0,1);
    const x=T.MathUtils.lerp(-88+6*w*w+37*w**6,-93+34*w*w+30*w**10,t)-4*Math.sin(Math.PI*t);
    return y>35&&z>48?T.MathUtils.lerp(x,depthAt('front',z,40),T.MathUtils.clamp((y-35)/5,0,1)):x;
  };
  const rearX=(z,y)=>398-6*(z/100)**2-95*(z/100)**8-7*Math.max(0,(y-15)/12)-5*Math.max(0,-y/12);
  const smoothDepth=(name,z,y)=>{
    let sum=0;for(const dz of [-1,0,1])for(const dy of [-1,0,1])sum+=depthAt(name,z+dz,y+dy);return sum/9;
  };
  function surfaceStroke(name,points,project,radius,kind) {
    const sampled=[];
    for(let i=1;i<points.length;i++)for(let j=0;j<8;j++) {
      const t=j/8;sampled.push(project(T.MathUtils.lerp(points[i-1][0],points[i][0],t),T.MathUtils.lerp(points[i-1][1],points[i][1],t)));
    }
    sampled.push(project(...points.at(-1)));return stroke(name,sampled,radius,kind);
  }
  function section(y,rows) {
    if(y<=rows[0][0])return rows[0].slice(1);
    for(let i=1;i<rows.length;i++)if(y<=rows[i][0]) {
      const t=(y-rows[i-1][0])/(rows[i][0]-rows[i-1][0]);return rows[i].slice(1).map((v,j)=>T.MathUtils.lerp(rows[i-1][j+1],v,t));
    }
    return rows.at(-1).slice(1);
  }
  for(const side of [-1,1]) {
    const front=(u,y,depth=0)=>{
      const [endX,width]=section(y,[[-5,-56.1,91.9],[0,-55.9,92.7],[10,-54.5,94.1],[20,-51.1,95.2],[30,-45.2,96],[40,-33.7,96.8]]);
      const z=u*width/100,x=T.MathUtils.lerp(frontX(z,y),endX,T.MathUtils.smoothstep(u,90,100));
      return [x+depth,y,z*side];
    };
    const rear=(z,y,depth=0)=>[rearX(z,y)+depth,y,z*side];
    const tag=side===1?'left':'right';
    const intake=[[0,-7],[59,-7],[55,13],[49,18],[0,18]];
    const curtain=[[83,-5],[93,-3],[92,30],[86,38],[82,30]];
    panel(`m-sport/front-apron/${tag}`,[[0,-13],[80,-13],[100,-5],[100,40],[48,40],[46,22],[0,20]],[intake,curtain],front,'paint');
    panel(`m-sport/lower-intake/${tag}`,intake,[],(z,y)=>front(z,y,2),'trim');
    panel(`m-sport/air-curtain/${tag}`,curtain,[],(z,y)=>front(z,y,2),'trim');
    stroke(`m-sport/intake-surround/${tag}`,[[0,-9],[62,-9],[59,16],[50,21],[0,21]].map(([z,y])=>front(z,y,-.7)),1.25,'trim');
    stroke(`m-sport/curtain-surround/${tag}`,[...curtain,curtain[0]].map(([z,y])=>front(z,y,-.8)),1.05,'trim');
    // Sculpted diagonal cheek and lower lip, characteristic of the M apron.
    panel(`m-sport/bumper-cheek/${tag}`,[[55,30],[82,37],[83,30],[63,19],[61,-9],[57,-8]],[],(z,y)=>front(z,y,-2.2),'trim');
    stroke(`m-sport/front-lip/${tag}`,[[0,-12],[57,-12],[78,-10],[96,-4]].map(([z,y])=>front(z,y,-1)),.85,'trim');
    for(const y of [-3,3,9])stroke(`m-sport/intake-fin/${tag}/${y}`,[front(0,y,1.3),front(54,y,1.3)],.4,'trim');
    for(const y of [3,14,25])stroke(`m-sport/curtain-blade/${tag}/${y}`,[front(84,y,1),front(92,y,1)],.6,'trim');
    // Two outward-pointing arrows in each slim LCI headlamp, not halo rings.
    const lamp=(z,y)=>[smoothDepth('headlamp',z,56.45-(56.45-y)/.8)-1.2,y,z*side];
    for(const z of [57,75]) {
      surfaceStroke(`lci/drl-arrow/${tag}/${z}`,[[z,52],[z+6,48.6],[z,44.8]],lamp,.8,'drl');
      stroke(`lci/projector/${tag}/${z}`,[lamp(z-3,48.8),lamp(z-1,48.8)],1.05,'chrome');
    }
    // Dark LCI lens backing and the mirrored L signatures forming an X motif.
    const tail=(z,y)=>[smoothDepth('taillamp',z,y)+.2,y,z*side];
    panel(`lci/rear-lens/${tag}`,[[35,68],[67,67],[84,71],[84,74],[68,75],[35,73]],[],tail,'taillight');
    for(const [name,pts]of [['upper',[[35,75],[62,75],[70,68],[82,72],[88,75]]],['lower',[[35,64],[62,64],[70,71],[82,67],[88,65]]]])
      surfaceStroke(`lci/x-signature/${tag}/${name}`,pts,(z,y)=>{const p=tail(z,y);p[0]+=.9;return p;},1.05,'red');
    panel(`m-sport/rear-apron/${tag}`,[[0,-12],[82,-12],[93,-4],[93,22],[76,27],[0,27]],[],rear,'paint');
    const exhaust=[[61,-5],[82,-5],[88,6],[62,7]];
    panel(`m-sport/rear-diffuser/${tag}`,[[0,-11],[84,-11],[94,-2],[93,13],[73,22],[0,22]],[exhaust],(z,y)=>rear(z,y,.8),'trim');
    panel(`m-sport/exhaust-opening/${tag}`,exhaust,[],(z,y)=>rear(z,y,1),'trim');
    stroke(`m-sport/trapezoidal-exhaust/${tag}`,[...exhaust,exhaust[0]].map(([z,y])=>rear(z,y,1.4)),1.15,'chrome');
    stroke(`m-sport/rear-reflector/${tag}`,[rear(76,25,1),rear(90,24,1)],.8,'red');
    // Three trailing blades on the revised side breather; black with M Sport.
    for(const y of [10,16,22])stroke(`lci/side-breather/${tag}/${y}`,[[47,y,95.3*side],[57,y,95.3*side]],.5,'trim');
    stroke(`lci/breather-leading-edge/${tag}`,[[53,31,95.4*side],[46,25,95.4*side],[42,6,95.4*side]],.8,'trim');
  }
  return {update(selected,alone=false) {
    for(const [kind,m]of Object.entries(materials)) {
      m.transparent=true;m.depthWrite=alone&&kind!=='glass';
      // Keep the wire on top of the fill without coplanar depth flicker.
      m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;
      m.opacity=alone?(kind==='paint'?.82:kind==='glass'?.22:.95):selected?(kind==='paint'?.32:kind==='glass'?.16:.6):.055;
    }
    lines.opacity=selected?.36:.12;topology.opacity=alone?.065:selected?.045:.015;
  }};
}
