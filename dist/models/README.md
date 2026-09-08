# BMW X5 G05 LCI M Sport body

This project is inspired by **my own car: a 2024 BMW X5 40i M-Sport (G05 LCI)**.

The atlas body is a modified version of **BMW's 2018 X5 G05 model**, published by
[BMW Car IT in digital-car-3d](https://github.com/bmwcarit/digital-car-3d).
The original model and these adaptations are available under
[Creative Commons Attribution 4.0](LICENSE-CC-BY-4.0.txt).
BMW has not endorsed this atlas or the adaptations.

The original asset is **pre-LCI**, not factory LCI CAD. Its bonnet, roof, doors,
glazing, fenders and main panel contours form the foundation. `../body.js`
removes the older bumper trim and badges and adds reference-modelled LCI M Sport
aprons, slim headlamps with two outward arrows per side, revised side breathers,
rear X light signatures, dark diffuser and trapezoidal exhaust surrounds.
The chassis, wheel design and drivetrain remain illustrative. This is an
educational exterior reconstruction, not a manufacturing or fitment model.

The M Sport reference is BMW's
[2024 X5 xDrive40i M Sport brochure](https://www.bmw.co.id/content/dam/bmw/marketID/bmw_co_id/Brochures/pdf/2024/BMW_ID_SpecCard_NIK24_X5_xDrive40iMSport.pdf.asset.1709617888551.pdf).
The bundled `../references/body-m-sport.png` is its first page, rendered without
changing the pictured vehicle. The photograph remains BMW's material; the
model's CC license is not asserted for that brochure image. The
[BMW 2024 launch release](https://www.press.bmwgroup.com/usa/article/detail/T0408460EN_US/the-2024-bmw-x5-and-x6)
describes the LCI and M Sport features. Regional equipment and individual options
can differ. M Sport must not be confused with the M60i or X5 M body.

## Rebuild the foundation

`g05-source.json` records the pinned upstream revision, each source URL and
SHA-256, the generated asset digest, and the mesh inventory. Download the eight
files into a temporary directory using the filenames in that manifest, then run:

```sh
node scripts/build-body.mjs /path/to/downloaded/source-files
npm run check
```

The converter applies glTF node transforms, mirrors the one-sided panels,
removes interiors and unused light internals, and packs indexed positions into
local JavaScript. It also records measured surface profiles used by the LCI
adaptation. There is no runtime download or external model service.

BMW's assembly uses centimetres, with longitudinal X, vertical Y and lateral Z.
The front and rear wheel pivots are X=-6.309 and X=293.30399. Both are mapped to
the atlas axles at Z=-1.52 and Z=1.62 with **one uniform scale**. The source demo
is not dimensionally exact production CAD; no precise vehicle dimensions are
inferred from it. Packed coordinates have a maximum rounding error of 0.00005
atlas units.

The LCI changes are intentionally maintained separately from the pinned source.
Do not rename the 2018 asset as an unmodified LCI model or replace it with a
generic SUV primitive. Check front, rear and side renders after geometry edits;
the automated source and geometry checks cannot certify photographic accuracy.
