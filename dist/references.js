// Visual provenance: distinguish the licensed G05 mesh from reconstructed LCI details and illustrative mechanical parts.
import {engineDiagrams} from './engine-references.js';
const supplied=(title,image,note,short)=>({title,image:'references/'+image,note,short,sourceLabel:'Your supplied reference'});
const web=(title,image,url,sourceLabel,note,short)=>({title,image:'references/'+image,url,sourceLabel,note,short});
export const references={
 wheel740:web('20-inch M Star-spoke 740 · Orbit Grey','wheel-740m.jpg','https://cdn.leebmann24.com/products/3/0/9/0/3090d3471c22c4708909f0b8628b809af4535d17_m_sternspeiche_740_orbitgrey_glanzgedreht.jpg?w=828&q=75','Leebmann24 · your wheel reference','Your selected 740 M reference guides the ten flared spokes, recessed Orbit Grey faces, machined edges and BMW centre cap. The photograph is a wheel-design reference; the pictured body is an earlier G05. Wheel surfaces are reconstructed, not factory CAD.','740 M wheel'),
 chassis:supplied('Chassis and drivetrain overview','chassis.png','Your original undercarriage image guides the broad arrangement of shafts, axle assemblies, springs and steering. Its exact model year is not established.','Chassis'),
 body:supplied('Earlier G05 wireframe reference','body-wireframe.png','Historical pre-facelift reference. This image does not establish the LCI M Sport exterior. The current body uses BMW’s licensed G05 panel mesh and a separate facelift adaptation.','Earlier wireframe'),
 msport:web('BMW X5 G05 LCI M Sport','body-m-sport.png','https://www.bmw.co.id/content/dam/bmw/marketID/bmw_co_id/Brochures/pdf/2024/BMW_ID_SpecCard_NIK24_X5_xDrive40iMSport.pdf.asset.1709617888551.pdf','BMW · 2024 xDrive40i M Sport brochure','Official M Sport exterior reference. The bundled image is page one of BMW’s brochure. The atlas reconstructs the LCI lights and M Sport trim; regional equipment and individual options can differ.','M Sport'),
 bodymesh:web('BMW G05 mesh foundation · CC BY 4.0','body-wireframe.png','https://github.com/bmwcarit/digital-car-3d/tree/6261f53b5ac63c6686039d106fbbbfb693339d72/G05','BMW Car IT · licensed G05 mesh','The linked source supplies the actual 2018 G05 panel mesh under CC BY 4.0. This older wireframe image is contextual, not a render of that source. The atlas modifies the source for the LCI M Sport exterior; it is not factory LCI CAD.','Mesh source'),
 transfer:supplied('Transfer case in the drivetrain','transfer-overview.png','The supplied illustration includes an older gear-driven example. It is used for contextual positioning, not as proof of the G05 internal layout.','Placement'),
 power:supplied('Clutch and power-path section','clutch-power-path.png','Your sectional diagram helps distinguish the direct rear output from the clutch-controlled front branch. The illustration is generic.','Power section'),
 gears:supplied('Gear-driven transfer-case comparison','gear-cutaway.png','This reference has a meshing gear train. The optional comparison view shows it separately from the chain-drive reconstruction. It is not identified as the 2024 X5 transfer case.','Gear reference'),
 chain:supplied('Chain-drive cutaway with named parts','chain-cutaway.png','Your labeled cutaway guides the coaxial input/rear output, offset front output, chain, drum and actuator arrangement. External details vary across generations.','Named parts'),
 closeup:supplied('Transfer-case chain and clutch close-up','chain-closeup.png','Your additional close-up guides the broad chain, clutch drum, plate stack and cast cutaway housing. Its exact transfer-case generation is not established.','Clutch close-up'),
 atc13:web('ATC13-1 exploded component reference','atc13-exploded.png','https://www.s-tec.at/data/stec/Kataloge26/Powertrain_Single-Parts_08_2026.pdf#page=38','S-TEC · catalogue pp. 38–41','Supplier drawing checked against S-TEC’s catalogue. It identifies the input shaft, chain, sprockets, drum, plates, actuator rings, three balls, bearings and motor. The displayed image was found in the linked supplier-kit reseller listing; the exact unit fitted to a particular X5 is not verified.','ATC13 parts'),
 engine:web('B58B30M2 · long block','engine/119408.jpg','https://www.koedbmw.com/en-dk/catalog/diagram/119408/1/21EU?steering=L&transmission=A','BMW AG · diagram via KOED','BMW long-block illustration for the G05N xDrive40i, type 21EU. BMW identifies its engine as B58N / B58B30M2. The 3D reconstruction follows these catalogue shapes; dimensions and concealed details remain approximate.','Long block'),
 enginePhoto:web('2024 X5 · B58B30M2 rear view','engine/b58b30m2-rear.jpg','https://ovoko.fi/osat/rag140370-b58b30-bmw-x5-g05-moottori','UAB Ragraunda · photograph via Ovoko','First-hand donor-engine photograph. The listing specifies a 2024 X5, 280 kW, AWD and B58B30M2. This rear view guides the flywheel, timing cover and wiring. Seller identification is supporting evidence, not a factory geometry certificate.','Rear photograph'),
 gearbox:web('ZF 8HP hybrid transmission cutaway','gearbox-zf.png','https://www.zf.com/products/en/cars/products_64275.html','ZF · 8HP product cutaway','Official ZF modular 8HP hybrid-family illustration. It guides the bell housing, motor region and transmission body. The pictured PHEV assembly is not claimed to be the exact 40i MHEV unit.','ZF cutaway'),
 frontshaft:web('BMW front propeller-shaft form','front-propshaft-full.jpg','https://www.ecstuning.com/b-genuine-bmw-parts/drive-shaft/26209488491~oeb/','ECS Tuning · BMW shaft','Seller photograph of a genuine BMW front shaft. Used to model universal-joint ends and tube form. Exact G05 LCI fitment of this photographed part is unverified.','Front shaft'),
 shaftlabel:web('G05 front-shaft identification photo','front-propshaft.jpg','https://citymotorsparts.com/shop/driveshafts/2016-2025-bmw-x5-g05-front-drive-shaft-propeller-axle-95k-miles-l-808-4-oem/','City Motors · donor shaft','Donor-part label photograph used to cross-check the G05 front-shaft search. It does not supply enough geometry by itself and does not verify your vehicle’s part number.','G05 donor'),
 rearshaft:web('G05 rear propeller-shaft form','rear-propshaft.jpg','https://www.ebay.com/itm/376123516682','Seller · G05 rear shaft','Photograph of a G05 sDrive rear shaft, used only for tube, flange and centre-support form. Its length and fitment are not used as xDrive specifications.','Rear shaft'),
 frontdiff:web('G05 front final-drive housing','front-differential.jpg','https://www.bmspares.com.au/product/0000155309/','BM Spares · front differential','First-hand photograph of a G05 front final-drive unit. Used for the silver cast housing, seam and input flange. Ratio and exact fitment are not transferred to the model.','Front final drive'),
 reardiff:web('G05 rear final-drive housing','rear-differential.jpg','https://www.bmspares.com.au/product/0000151118/','BM Spares · rear differential','First-hand photograph used for the rear housing and mounting ears. The generic model does not assert a particular axle ratio or optional locking differential.','Rear final drive'),
 halfshaft:web('CV half-shaft reference','halfshaft.jpg','https://www.autodoc.co.uk/car-parts/drive-shaft-10162/bmw/x5/x5-g05','AUTODOC · shaft catalogue','Catalogue photograph used for the shaft, CV-joint housings and bellows. It is a generic shape reference; catalogues can show representative parts across variants.','CV joints'),
 hub:web('G05 hub and bearing assembly','wheel-hub.jpg','https://www.ebay.com/itm/385334168164','Seller · genuine BMW hub','Seller photograph used for the concentric bearing seat, wheel flange and mounting holes. Dimensions and bearing internals are simplified.','Wheel hub'),
 brakes:web('G05 ventilated brake discs','brake-discs.jpg','https://www.ebay.com.au/itm/256247823384','Seller · BMW brake discs','Seller photograph guides the raised centre hat and ventilated friction ring. Exact rotor diameter and brake package are not asserted.','Brake discs'),
 subframe:web('G05 rear suspension subframe','rear-subframe.jpg','https://www.ebay.com/itm/126738990972','Seller · G05 subframe','First-hand G05 subframe photograph guides the crossmembers, mounting bushes and open centre. The simplified front subframe is separately guided by the supplied chassis image.','Subframe'),
 steering:web('G05-family electric steering rack','steering-rack.jpg','https://www.laglobalparts.com/Catalog/Details/42560','LA Global Parts · steering rack','Seller photograph guides the transverse rack, bellows and offset electric-assist motor. The column is an illustrative link to the steering wheel.','Steering rack'),
 springs:web('G05 adaptive spring and damper','spring-damper.jpg','https://www.ebay.com/itm/375058181748','Seller · G05 spring/damper','First-hand coil-spring/damper photograph guides the helical spring, damper body and mounting ends. This does not identify whether your X5 has optional air suspension.','Spring + damper'),
 lci:web('G05 LCI exterior proportions','body-lci.jpg','https://www.bimmertoday.de/2023/02/08/bmw-x5-facelift-2023-alle-bilder-und-infos-zum-g05-lci/','Bimmertoday · LCI photo','LCI xDrive50e xLine photograph. It establishes the shared silhouette only, not M Sport bumper or trim details.','LCI exterior'),
 bmw:web('BMW X5 LCI technical specification','body-lci.jpg','https://www.press.bmwgroup.com/canada/article/detail/T0408519EN/the-new-2024-bmw-x5-and-x6?language=en','BMW · 2024 X5 technical release','BMW confirms the 40i inline-six, 48V motor integrated into the eight-speed transmission, and double-wishbone front/five-link rear suspension. Geometry remains simplified.','BMW specification')
};
for(const diagram of engineDiagrams)references['engine'+diagram.id]=web(
  diagram.title+' · G05N 40i', 'engine/'+diagram.file, diagram.url,
  'BMW AG · diagram via KOED',
  'BMW catalogue illustration '+diagram.id+' for European G05N xDrive40i, type 21EU, left-hand drive and automatic transmission. Downloaded 8 September 2026. Catalogue drawings can cover shared parts and later replacements; VIN-specific part numbers and production revisions are not established. Original BMW attribution is retained.',
  diagram.title
);
export const componentRefs={
 overview:['chassis','bmw','lci'],engine:['engine','engine220271','engine119410','enginePhoto',...engineDiagrams.filter(d=>!['119408','220271','119410','220367'].includes(d.id)).map(d=>'engine'+d.id)],gearbox:['gearbox','engine220367','bmw'],
 transfer:['closeup','atc13','chain','gears','transfer'],clutch:['closeup','atc13','power'],chain:['chain','atc13','gears'],
 actuator:['atc13','chain'],ballramp:['atc13','power'],bearings:['atc13'],inputshaft:['atc13','chain'],outputshaft:['atc13','chain'],frontoutput:['atc13','chain'],casecover:['atc13','closeup'],
 frontshaft:['frontshaft','shaftlabel'],rearshaft:['rearshaft'],frontdiff:['frontdiff'],reardiff:['reardiff'],
 wheels:['wheel740','halfshaft','hub','brakes','body'],chassis:['chassis','subframe','springs','steering','bmw'],bodywork:['msport','bodymesh','bmw']
};
export const inventory=[
 {part:'B58B30M2 engine assembly',change:'Canted long block, sculpted acoustic cover, compact charge-air cooler, single twin-scroll turbo, belt drive, sump and rear timing/flywheel assembly.',refs:['engine','engine119410','engine119404','engine119406','enginePhoto']},
 {part:'Engine mounts',change:'Two caged hydraulic isolators, asymmetric ribbed cast supports, through-bolts and left-side tuned mass.',refs:['engine220271']},
 {part:'Transmission / 48V motor region',change:'Tapered bell housing, motor ring, casing ribs and lower pan.',refs:['gearbox','bmw']},
 {part:'Transfer-case housing / cover',change:'Cast-style outline, detachable cover, ribs and perimeter fasteners.',refs:['atc13','closeup']},
 {part:'Input shaft',change:'Splined central shaft and input flange.',refs:['atc13','chain']},
 {part:'Rear output shaft',change:'Coaxial extension, bearing and output flange.',refs:['atc13','chain']},
 {part:'Front output shaft',change:'Offset forward-facing output with sprocket and bearing.',refs:['atc13','chain']},
 {part:'Clutch drum / plates',change:'Annular drum, nine friction elements, ten steel plates and outward teeth. Spacing is exaggerated.',refs:['atc13','closeup']},
 {part:'Chain / sprockets',change:'Two sprockets connected by animated links; broad chain pack guided by the cutaway.',refs:['atc13','chain','closeup']},
 {part:'Actuator motor / shaft',change:'Compact underside motor with vertical reduction shaft.',refs:['atc13']},
 {part:'Actuator rings / three balls',change:'Paired annular rings around three bearing balls.',refs:['atc13','power']},
 {part:'Bearings / seals',change:'Concentric races, rolling elements and radial sealing rings.',refs:['atc13']},
 {part:'Gear-drive comparison',change:'Three meshing gears shown only as an alternative generic reference.',refs:['gears']},
 {part:'Front propeller shaft',change:'Tubular shaft, joint ends and flanges.',refs:['frontshaft','shaftlabel']},
 {part:'Rear propeller shaft',change:'Tube sections, centre support and end flanges.',refs:['rearshaft']},
 {part:'Front differential',change:'Rounded silver casting, joint seam, flange and lateral outputs.',refs:['frontdiff']},
 {part:'Rear differential',change:'Dark casting, input nose, mounting ears and lateral outputs.',refs:['reardiff']},
 {part:'Half-shafts / CV joints',change:'Four shafts with joint housings, splines and ribbed boots.',refs:['halfshaft']},
 {part:'Wheel hubs / bearings',change:'Concentric hub, mounting flange and wheel connection.',refs:['hub']},
 {part:'Brake discs / calipers',change:'Raised centre hats, ventilated disc rings and simplified calipers.',refs:['brakes','chassis']},
 {part:'Wheels / tyres',change:'740 M star-spoke wheels with recessed Orbit Grey faces, machined edges, five bolt seats and centre caps. Existing tyre scale and BMW axle calibration retained.',refs:['wheel740','bodymesh']},
 {part:'Subframes / mounting bushes',change:'Open-centre crossmembers and elastomer mounting points.',refs:['subframe','chassis']},
 {part:'Suspension links',change:'Front upper/lower wishbone form and a five-link rear illustration.',refs:['chassis','bmw']},
 {part:'Springs / dampers',change:'Helical coil springs, damper cylinders and upper mounts.',refs:['springs']},
 {part:'Steering rack / column',change:'Rack tube, bellows, assist motor and illustrative column.',refs:['steering','chassis']},
 {part:'Body shell / glazing / trim',change:'Licensed BMW G05 panels, with reconstructed LCI lights, M Sport aprons, breathers, Shadowline trim and trapezoidal exhaust surrounds.',refs:['msport','bodymesh','bmw']}
];
