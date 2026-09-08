// Rebuild the bundled G05 foundation from BMW's CC-BY-4.0 source.
// Usage: node scripts/build-body.mjs /path/to/downloaded/source-files
// Source filenames, URLs and digests are recorded in the generated manifest.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../dist/three.module.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = process.argv[2];
if (!input) throw new Error('Supply the directory containing BMW source glTF files (see dist/models/README.md).');
const revision = '6261f53b5ac63c6686039d106fbbbfb693339d72';
const existingManifest=path.join(root,'dist/models/g05-source.json');
const expected=fs.existsSync(existingManifest)?JSON.parse(fs.readFileSync(existingManifest,'utf8')):null;
if(expected&&expected.revision!==revision)throw new Error('Source revision differs from the pinned manifest. Review the source update first.');
const files = {
  paint: 'Exterior/O_G05_Exterior_Paint.gltf', trim: 'Exterior/O_G05_Exterior_non-Paint.gltf',
  hood: 'Exterior/O_G05_Hood.gltf', 'doors-front': 'Doors/O_G05_Doors_F.gltf',
  'doors-rear': 'Doors/O_G05_Doors_B.gltf', tailgate: 'Doors/O_G05_Tailgate.gltf',
  'lights-front': 'Exterior/O_G05_Headlights.gltf', 'lights-rear': 'Exterior/O_G05_Taillights.gltf'
};
// BMW's assembly file supplies these wheel pivots. Preserve the actual wheelbase,
// rather than fitting the shell to the old, oversized illustrative tyres.
const front = -6.309, rear = 293.30399, scale = 3.14 / (rear - front);
const sourceToWorld = ([x,y,z]) => [z*scale, (y+37.43)*scale, (x-front)*scale-1.52];
const parts = [], sources = [];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [file, remote] of Object.entries(files)) {
  const bytes = fs.readFileSync(path.join(input, file+'.gltf'));
  if(expected&&expected.sources.find(s=>s.file===file+'.gltf')?.sha256!==digest(bytes))throw new Error(`Source checksum mismatch: ${file}.gltf`);
  const gltf = JSON.parse(bytes);
  sources.push({file: file+'.gltf', url: `https://media.githubusercontent.com/media/bmwcarit/digital-car-3d/${revision}/G05/meshes/${remote}`, sha256: digest(bytes)});
  const buffers = gltf.buffers.map(b => Buffer.from(b.uri.split(',')[1], 'base64'));
  function accessor(id) {
    const a = gltf.accessors[id], b = gltf.bufferViews[a.bufferView];
    const types = {5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array};
    const Type = types[a.componentType], width = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    if (!Type || !width || a.sparse) throw new Error('Unsupported accessor');
    const size = Type.BYTES_PER_ELEMENT, start = (b.byteOffset||0)+(a.byteOffset||0);
    const result = new Type(a.count*width);
    for(let i=0;i<a.count;i++) {
      const slice = buffers[b.buffer].subarray(start+i*(b.byteStride||width*size), start+i*(b.byteStride||width*size)+width*size);
      result.set(new Type(Uint8Array.from(slice).buffer),i*width);
    }
    return result;
  }
  function visit(id, parent) {
    const node = gltf.nodes[id];
    const local = node.matrix ? new T.Matrix4().fromArray(node.matrix) : new T.Matrix4().compose(new T.Vector3(...(node.translation||[0,0,0])),new T.Quaternion(...(node.rotation||[0,0,0,1])),new T.Vector3(...(node.scale||[1,1,1])));
    const matrix = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      const m = gltf.meshes[node.mesh], name=m.name.replace(/_MeshData$/, '');
      let kind = /paint/i.test(name) && !/black/i.test(name) ? 'paint' : /glass/i.test(name) ? 'glass' : /chrome/i.test(name) ? 'chrome' : 'trim';
      let include = !/interior|void|lighteffect/i.test(name);
      if(file==='paint') include = node.mesh===0 || node.mesh===3;
      if(file==='trim') include = [0,1,3,6,7,9].includes(node.mesh);
      if(file==='lights-front') { include=/Lens_MeshData$/i.test(m.name); kind='headlight'; }
      if(file==='lights-rear') { include=[0,12].includes(node.mesh); kind='taillight'; }
      if(include) for(const p of m.primitives) {
        const raw = accessor(p.attributes.POSITION), indices=accessor(p.indices);
        const positions=[];
        for(let i=0;i<raw.length;i+=3) positions.push(new T.Vector3(raw[i],raw[i+1],raw[i+2]).applyMatrix4(matrix).toArray());
        const mirrored = file.startsWith('doors-') || (file==='hood'&&node.mesh===0) || (file==='trim'&&node.mesh===0);
        for(const side of mirrored ? [1,-1] : [1]) {
          const values = new Int16Array(raw.length);
          for(let i=0;i<positions.length;i++) {
            const [x,y,z] = positions[i], world = sourceToWorld([x,y,z*side]);
            for(let j=0;j<3;j++) { const value=Math.round(world[j]*10000); if(Math.abs(value)>32767) throw new Error('Coordinate overflow'); values[i*3+j]=value; }
          }
          // Swapping the longitudinal/lateral axes changes handedness once.
          const order = Uint16Array.from(indices);
          if(side===1) for(let i=0;i<order.length;i+=3) [order[i+1],order[i+2]]=[order[i+2],order[i+1]];
          if(positions.length>65535) throw new Error('Index overflow');
          parts.push({name:`${file}/${name}${mirrored?(side===1?'/left':'/right'):''}`,kind,vertices:positions.length,positions:Buffer.from(values.buffer).toString('base64'),indices:Buffer.from(order.buffer).toString('base64')});
        }
      }
    }
    for(const child of node.children||[]) visit(child,matrix);
  }
  for(const id of gltf.scenes[gltf.scene||0].nodes) visit(id,new T.Matrix4());
}
const out = path.join(root,'dist/models'); fs.mkdirSync(out,{recursive:true});
// Project the source surfaces into regular depth maps. Adapted bumper panels and
// light guides follow the real G05 surface curvature instead of a guessed box.
const profiles={};
for(const [name,minY,maxY,minZ,maxZ,back,accept]of [
  ['front',-15,48,0,100,false,p=>p.name.startsWith('paint/')||p.name.startsWith('trim/')],
  ['rear',-15,30,0,100,true,p=>p.name.startsWith('paint/')||p.name.startsWith('trim/')],
  ['headlamp',38,57,44,95,false,p=>p.kind==='headlight'],
  ['taillamp',60,80,32,90,true,p=>p.kind==='taillight']
]) {
  const width=maxZ-minZ+1,height=maxY-minY+1,depths=Array(width*height).fill(null);
  for(const part of parts.filter(accept)) {
    const raw=new Int16Array(Uint8Array.from(Buffer.from(part.positions,'base64')).buffer);
    const indices=new Uint16Array(Uint8Array.from(Buffer.from(part.indices,'base64')).buffer);
    const points=[];for(let i=0;i<raw.length;i+=3)points.push([(raw[i+2]/10000+1.52)/scale+front,raw[i+1]/10000/scale-37.43,raw[i]/10000/scale]);
    for(let i=0;i<indices.length;i+=3) {
      const [a,b,c]=[points[indices[i]],points[indices[i+1]],points[indices[i+2]]];
      if([a,b,c].some(p=>back?p[0]<330:p[0]>-30))continue;
      const lowY=Math.max(minY,Math.ceil(Math.min(a[1],b[1],c[1]))),highY=Math.min(maxY,Math.floor(Math.max(a[1],b[1],c[1])));
      const lowZ=Math.max(minZ,Math.ceil(Math.min(a[2],b[2],c[2]))),highZ=Math.min(maxZ,Math.floor(Math.max(a[2],b[2],c[2])));
      const den=(b[1]-c[1])*(a[2]-c[2])+(c[2]-b[2])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;
      for(let y=lowY;y<=highY;y++)for(let z=lowZ;z<=highZ;z++) {
        const u=((b[1]-c[1])*(z-c[2])+(c[2]-b[2])*(y-c[1]))/den;
        const v=((c[1]-a[1])*(z-c[2])+(a[2]-c[2])*(y-c[1]))/den,w=1-u-v;
        if(Math.min(u,v,w)<-.001)continue;
        const depth=u*a[0]+v*b[0]+w*c[0],index=(y-minY)*width+z-minZ;
        if(depths[index]===null||(back?depth>depths[index]:depth<depths[index]))depths[index]=depth;
      }
    }
  }
  // Extend the measured boundary over small apertures and the bumper's edge.
  for(let pass=0;depths.includes(null)&&pass<width+height;pass++) {
    const next=depths.slice();
    for(let y=0;y<height;y++)for(let z=0;z<width;z++) {
      const i=y*width+z;if(depths[i]!==null)continue;
      const near=[[y-1,z],[y+1,z],[y,z-1],[y,z+1]].filter(([a,b])=>a>=0&&a<height&&b>=0&&b<width).map(([a,b])=>depths[a*width+b]).filter(v=>v!==null);
      if(near.length)next[i]=near.reduce((a,b)=>a+b,0)/near.length;
    }
    depths.splice(0,depths.length,...next);
  }
  if(depths.includes(null))throw new Error(`Incomplete ${name} profile`);
  profiles[name]={minY,maxY,minZ,maxZ,width,depths:depths.map(v=>Math.round(v*100)/100)};
}
const asset = `// Generated by scripts/build-body.mjs. BMW G05 2018 foundation, CC-BY-4.0.\n// Facelift adaptation lives in ../body.js; this file alone is NOT an LCI model.\nexport const bodySource = ${JSON.stringify(parts)};\nexport const bodyProfiles = ${JSON.stringify(profiles)};\n`;
fs.writeFileSync(path.join(out,'g05-source.js'),asset);
fs.writeFileSync(path.join(out,'g05-source.json'),JSON.stringify({author:'BMW Car IT GmbH',license:'CC-BY-4.0',repository:'https://github.com/bmwcarit/digital-car-3d',revision,sourceVehicle:'BMW X5 G05 2018 (pre-LCI)',targetVehicle:'BMW X5 G05 LCI M Sport',coordinateScale:scale,frontAxleSource:front,rearAxleSource:rear,groundOffset:37.43,assetSha256:digest(asset),sources,meshes:parts.map(({positions,indices,...p})=>({...p,triangles:Buffer.from(indices,'base64').length/6}))},null,2)+'\n');
console.log(`Generated ${parts.length} meshes, ${parts.reduce((n,p)=>n+p.vertices,0)} vertices, ${(Buffer.byteLength(asset)/1024/1024).toFixed(2)} MiB`);
