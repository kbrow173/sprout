/**
 * Curated SVG plant illustration library. Every plant in the garden renders
 * as one of these flat, friendly variants (never the raw photo) — fast,
 * consistent, works offline, and is the cleanest surface for a later Claude
 * Design pass (just swap the <Leaves> paths, the pot stays put).
 *
 * illustration_key values are set at seed time (supabase/seed.sql) and copied
 * onto each `plants` row so a plant keeps its look even if the species record
 * changes. Unknown keys fall back to "generic".
 *
 * Each variant is built from a handful of reusable local-coordinate leaf
 * units (HeartLeaf, Blade, Coin, Pearl, Petal, Pinna, ...) placed via
 * `transform="translate(x,y) rotate(r) scale(s)"` — translate moves the
 * unit's own origin into place, rotate/scale apply around that same origin
 * first. The pot renders *before* the leaves (not after) so trailing/draping
 * foliage — string-of-pearls strands, a succulent rosette resting on the rim,
 * a vine's crown — can overlap the rim without being clipped by it.
 */

export type IllustrationKey =
  | "vine"
  | "monstera"
  | "snake"
  | "spider"
  | "broadleaf"
  | "fiddle"
  | "succulent"
  | "string"
  | "pilea"
  | "palm"
  | "herb"
  | "basil"
  | "rosemary"
  | "thyme"
  | "parsley"
  | "chives"
  | "mint"
  | "orchid"
  | "fern"
  | "generic";

const FOREST_800 = "#17422a";
const FOREST_700 = "#1f5b39";
const FOREST_600 = "#2b7a4b";
const FOREST_500 = "#379a5f";
const SPROUT_600 = "#46b26a";
const SPROUT_500 = "#62c47d";
const SPROUT_400 = "#8ad79c";
const SPROUT_200 = "#dcf4e1";
const BLOOM = "#f2765e";
const BLOOM_LIGHT = "#f6a08e";
const SUN = "#f5b545";

type Placed = { fill: string; transform: string };

/** A trailing heart-leaf (pothos/philodendron) — tip points down, notch up. */
function HeartLeaf({ fill, transform }: Placed) {
  return (
    <g transform={transform}>
      <path
        d="M0,-4 C-6,-12 -12,-6 -11,2 C-10,10 -4,14 0,19 C4,14 10,10 11,2 C12,-6 6,-12 0,-4 Z"
        fill={fill}
      />
      <path d="M-3,-3 C-6,1 -5,5 -2,8" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

/** A narrow tapered sword leaf (snake plant, spider plant, palm leaflet), growing up from its base. */
function Blade({ fill, transform }: Placed) {
  return (
    <path
      d="M0,0 C-6,-8 -7,-24 -3,-38 C-1,-45 0,-48 0,-48 C1,-44 4,-36 6,-24 C8,-10 5,-4 0,0 Z"
      fill={fill}
      transform={transform}
    />
  );
}

/** A broader pointed leaf (broadleaf, fiddle-leaf fig, orchid strap leaves, generic). */
function WideBlade({ fill, transform }: Placed) {
  return (
    <path
      d="M0,0 C-11,-8 -13,-26 -7,-44 C-4,-52 0,-56 0,-56 C0,-56 4,-52 7,-44 C13,-26 11,-8 0,0 Z"
      fill={fill}
      transform={transform}
    />
  );
}

/** A round coin leaf (Chinese money plant) with a baked-in gloss highlight. */
function Coin({ fill, transform }: Placed) {
  return (
    <g transform={transform}>
      <path d="M0,-14 C9,-14 14,-7 14,0 C14,8 8,14 0,14 C-9,14 -14,7 -14,0 C-14,-8 -8,-14 0,-14 Z" fill={fill} />
      <ellipse cx="-4" cy="-4" rx="4.5" ry="3.5" fill="#ffffff" opacity="0.3" />
    </g>
  );
}

/** A single string-of-pearls bead with a gloss dot. */
function Pearl({ fill, transform }: Placed) {
  return (
    <g transform={transform}>
      <circle r="4.6" fill={fill} />
      <circle cx="-1.4" cy="-1.4" r="1.4" fill="#ffffff" opacity="0.5" />
    </g>
  );
}

/** A short teardrop petal, base at the origin — succulent rosette leaves. */
function Petal({ fill, transform }: Placed) {
  return (
    <path
      d="M0,0 C-5,-3 -5,-11 -2,-17 C-1,-19 0,-20 0,-20 C0,-20 1,-19 2,-17 C5,-11 5,-3 0,0 Z"
      fill={fill}
      transform={transform}
    />
  );
}

/** A tiny fern leaflet. */
function Pinna({ fill, transform }: Placed) {
  return <ellipse rx="4.2" ry="2.1" fill={fill} transform={transform} />;
}

/** A broad rounded-tip oval leaf (basil) — base at origin, pointing up, with a center vein. */
function RoundLeaf({ fill, transform }: Placed) {
  return (
    <g transform={transform}>
      <path
        d="M0,0 C-11,-5 -15,-16 -12,-27 C-10,-36 -4,-42 0,-44 C4,-42 10,-36 12,-27 C15,-16 11,-5 0,0 Z"
        fill={fill}
      />
      <path d="M0,-4 L0,-38" stroke="#ffffff" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    </g>
  );
}

/** A small pointed herb leaflet, base at the origin. */
function HerbUnit({ fill, transform }: Placed) {
  return (
    <path
      d="M0,0 C-6,-3 -8,-10 -4,-15 C-2,-17 0,-18 0,-18 C0,-18 2,-17 4,-15 C8,-10 6,-3 0,0 Z"
      fill={fill}
      transform={transform}
    />
  );
}

/** One elongated orchid petal, arranged radially around a bloom center. */
function OrchidPetal({ fill, transform }: Placed) {
  return <ellipse rx="4.5" ry="8" cy="-6" fill={fill} transform={transform} />;
}

// Rim fill deliberately does NOT reuse SPROUT_200/100 — those match the
// bg-sprout-100 circle every illustration sits on, so a rim in that color
// blends invisibly into its own backdrop and reads as a floating disconnected
// lid (only the white highlight bar above it stays visible). This is a
// distinct warm sage, plus the rim now sits low/narrow enough to overlap the
// body's flat top edge (y=99, x51–109) rather than overhanging past it.
const POT_RIM = "#dce8de";

function Pot() {
  return (
    <g>
      <ellipse cx="80" cy="147" rx="33" ry="6" fill="#000000" opacity="0.06" />
      <path d="M51 99c-2 15-3 30 2 40a11 11 0 0 0 9.9 6h34.2A11 11 0 0 0 107 139c5-10 4-25 2-40Z" fill="#ffffff" />
      <path d="M51 99c-2 15-3 30 2 40a11 11 0 0 0 5 5.4C54 132 53 115 56 99Z" fill="#eef3ee" opacity="0.8" />
      <rect x="49" y="90" width="62" height="13" rx="6.5" fill={POT_RIM} />
      <rect x="49" y="90" width="62" height="5" rx="2.5" fill="#ffffff" />
    </g>
  );
}

function Leaves({ variant }: { variant: IllustrationKey }) {
  switch (variant) {
    case "vine":
      return (
        <g>
          <path d="M78 92C60 100 44 118 37 146" stroke={FOREST_600} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M82 92C100 100 116 118 123 146" stroke={FOREST_600} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <HeartLeaf fill={SPROUT_600} transform="translate(66,104) rotate(-12) scale(1.3)" />
          <HeartLeaf fill={SPROUT_500} transform="translate(50,124) rotate(-22) scale(1.1)" />
          <HeartLeaf fill={SPROUT_400} transform="translate(40,144) rotate(-30) scale(0.9)" />
          <HeartLeaf fill={SPROUT_600} transform="translate(94,104) rotate(12) scale(1.3)" />
          <HeartLeaf fill={SPROUT_500} transform="translate(110,124) rotate(22) scale(1.1)" />
          <HeartLeaf fill={SPROUT_400} transform="translate(120,144) rotate(30) scale(0.9)" />
          <HeartLeaf fill={FOREST_700} transform="translate(70,84) rotate(-10) scale(1.4)" />
          <HeartLeaf fill={FOREST_600} transform="translate(90,84) rotate(10) scale(1.4)" />
        </g>
      );

    case "monstera":
      return (
        <g>
          <path d="M80 98V70" stroke={FOREST_700} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <g fill={FOREST_500}>
            <ellipse cx="80" cy="66" rx="27" ry="25" />
            <ellipse cx="55" cy="76" rx="15" ry="19" transform="rotate(-24 55 76)" />
            <ellipse cx="105" cy="76" rx="15" ry="19" transform="rotate(24 105 76)" />
            <ellipse cx="62" cy="48" rx="13" ry="17" transform="rotate(-38 62 48)" />
            <ellipse cx="98" cy="48" rx="13" ry="17" transform="rotate(38 98 48)" />
            <ellipse cx="80" cy="38" rx="13" ry="15" />
          </g>
          <path d="M58,80 C52,72 53,60 60,52 C55,62 54,72 58,80 Z" fill={FOREST_600} opacity="0.45" />
          <ellipse cx="80" cy="50" rx="3.6" ry="9" fill="#ffffff" transform="rotate(4 80 50)" />
          <ellipse cx="60" cy="66" rx="3" ry="7.5" fill="#ffffff" transform="rotate(-32 60 66)" />
          <ellipse cx="100" cy="66" rx="3" ry="7.5" fill="#ffffff" transform="rotate(32 100 66)" />
          <ellipse cx="80" cy="82" rx="2.6" ry="6.5" fill="#ffffff" transform="rotate(2 80 82)" />
        </g>
      );

    case "snake":
      return (
        <g>
          <Blade fill={FOREST_600} transform="translate(64,100) rotate(-16) scale(1.55)" />
          <Blade fill={SPROUT_600} transform="translate(74,100) rotate(-6) scale(2)" />
          <Blade fill={SPROUT_500} transform="translate(86,100) rotate(6) scale(1.85)" />
          <Blade fill={FOREST_500} transform="translate(96,100) rotate(16) scale(1.35)" />
          <path d="M62,70 C68,68 72,66 76,64" stroke={FOREST_800} strokeWidth="1.4" opacity="0.35" fill="none" strokeLinecap="round" />
          <path d="M70,84 C78,82 84,80 90,79" stroke={FOREST_800} strokeWidth="1.4" opacity="0.3" fill="none" strokeLinecap="round" />
          <path d="M80,50 C86,49 90,48 94,48" stroke={FOREST_800} strokeWidth="1.2" opacity="0.3" fill="none" strokeLinecap="round" />
        </g>
      );

    case "spider":
      return (
        <g>
          <Blade fill={FOREST_500} transform="translate(80,98) rotate(-58) scale(1.5)" />
          <Blade fill={SPROUT_600} transform="translate(80,98) rotate(-32) scale(1.85)" />
          <Blade fill={SPROUT_500} transform="translate(80,98) rotate(-8) scale(2.05)" />
          <Blade fill={SPROUT_500} transform="translate(80,98) rotate(12) scale(2)" />
          <Blade fill={SPROUT_600} transform="translate(80,98) rotate(34) scale(1.8)" />
          <Blade fill={FOREST_500} transform="translate(80,98) rotate(58) scale(1.45)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(-58) scale(0.55,1.35)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(-32) scale(0.55,1.65)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(-8) scale(0.55,1.8)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(12) scale(0.55,1.75)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(34) scale(0.55,1.6)" />
          <Blade fill={SPROUT_200} transform="translate(80,98) rotate(58) scale(0.55,1.3)" />
        </g>
      );

    case "broadleaf":
      return (
        <g>
          <path d="M65,98V70" stroke={FOREST_700} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <WideBlade fill={FOREST_500} transform="translate(65,70) rotate(-14) scale(1.15)" />
          <path d="M95,98V64" stroke={FOREST_700} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <WideBlade fill={SPROUT_600} transform="translate(95,64) rotate(10) scale(1.3)" />
          <path d="M80,98V80" stroke={FOREST_700} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <WideBlade fill={SPROUT_500} transform="translate(80,80) rotate(-2) scale(1.05)" />
          <path d="M65,68 V96" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" transform="rotate(-14 65 70)" fill="none" />
          <path d="M95,62 V94" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" transform="rotate(10 95 64)" fill="none" />
        </g>
      );

    case "fiddle":
      return (
        <g>
          <WideBlade fill={FOREST_600} transform="translate(58,98) rotate(-18) scale(0.65)" />
          <path d="M80,98V90" stroke={FOREST_700} strokeWidth="5.5" strokeLinecap="round" fill="none" />
          <WideBlade fill={FOREST_500} transform="translate(80,90) rotate(0) scale(1.2)" />
          <path d="M80,86 L80,27" stroke={SPROUT_400} strokeWidth="1.8" opacity="0.75" fill="none" strokeLinecap="round" />
          <path
            d="M80,44 C74,41 68,39 63,38 M80,44 C86,41 92,39 97,38 M80,58 C73,57 67,57 61,59 M80,58 C87,57 93,57 99,59 M80,72 C74,73 68,75 63,78 M80,72 C86,73 92,75 97,78"
            stroke={SPROUT_400}
            strokeWidth="1.2"
            opacity="0.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );

    case "succulent":
      return (
        <g>
          <Petal fill={FOREST_500} transform="translate(80,96) rotate(-95) scale(1.15)" />
          <Petal fill={SPROUT_600} transform="translate(80,96) rotate(-63) scale(1.25)" />
          <Petal fill={FOREST_500} transform="translate(80,96) rotate(-31) scale(1.35)" />
          <Petal fill={SPROUT_600} transform="translate(80,96) rotate(0) scale(1.4)" />
          <Petal fill={FOREST_500} transform="translate(80,96) rotate(31) scale(1.35)" />
          <Petal fill={SPROUT_600} transform="translate(80,96) rotate(63) scale(1.25)" />
          <Petal fill={FOREST_500} transform="translate(80,96) rotate(95) scale(1.15)" />
          <Petal fill={SPROUT_400} transform="translate(80,96) rotate(-47) scale(0.9)" />
          <Petal fill={SPROUT_500} transform="translate(80,96) rotate(-15) scale(1)" />
          <Petal fill={SPROUT_500} transform="translate(80,96) rotate(15) scale(1)" />
          <Petal fill={SPROUT_400} transform="translate(80,96) rotate(47) scale(0.9)" />
          <circle cx="80" cy="96" r="4" fill={FOREST_600} />
        </g>
      );

    case "string":
      return (
        <g>
          <path d="M64,96 C60,110 66,122 61,138" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
          <Pearl fill={SPROUT_500} transform="translate(63,104)" />
          <Pearl fill={SPROUT_600} transform="translate(65,114) scale(1.1)" />
          <Pearl fill={SPROUT_500} transform="translate(60,124) scale(0.95)" />
          <Pearl fill={SPROUT_400} transform="translate(63,134) scale(0.85)" />
          <path d="M76,96 C80,112 74,120 78,140" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
          <Pearl fill={SPROUT_600} transform="translate(78,106) scale(1.05)" />
          <Pearl fill={SPROUT_500} transform="translate(74,118) scale(1.15)" />
          <Pearl fill={SPROUT_600} transform="translate(77,129) scale(0.9)" />
          <Pearl fill={SPROUT_400} transform="translate(78,139) scale(0.8)" />
          <path d="M88,96 C92,108 87,124 91,136" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
          <Pearl fill={SPROUT_500} transform="translate(90,103) scale(0.95)" />
          <Pearl fill={SPROUT_600} transform="translate(87,115) scale(1.1)" />
          <Pearl fill={SPROUT_500} transform="translate(90,126) scale(1)" />
          <Pearl fill={SPROUT_400} transform="translate(91,136) scale(0.85)" />
          <path d="M100,96 C97,112 103,120 99,142" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
          <Pearl fill={SPROUT_600} transform="translate(99,105) scale(1)" />
          <Pearl fill={SPROUT_500} transform="translate(102,117) scale(1.1)" />
          <Pearl fill={SPROUT_600} transform="translate(98,129) scale(0.9)" />
          <Pearl fill={SPROUT_400} transform="translate(99,141) scale(0.8)" />
        </g>
      );

    case "pilea":
      return (
        <g>
          <path d="M78,98 C74,88 68,82 60,78" stroke={FOREST_700} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Coin fill={SPROUT_600} transform="translate(58,74) rotate(-8) scale(0.95)" />
          <path d="M84,98 C90,86 98,78 108,74" stroke={FOREST_700} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Coin fill={SPROUT_500} transform="translate(110,70) rotate(6) scale(0.85)" />
          <path d="M80,98 C80,84 82,70 80,58" stroke={FOREST_700} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <Coin fill={FOREST_500} transform="translate(80,54) rotate(2) scale(1.25)" />
        </g>
      );

    case "palm":
      return (
        <g>
          <path d="M80,98 C79,80 76,64 66,50" stroke={FOREST_700} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M80,98 C80,76 80,58 80,42" stroke={FOREST_700} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M80,98 C81,80 84,64 94,50" stroke={FOREST_700} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M80,98 C77,82 68,68 52,60" stroke={FOREST_700} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M80,98 C83,82 92,68 108,60" stroke={FOREST_700} strokeWidth="2.3" fill="none" strokeLinecap="round" />

          <Blade fill={FOREST_500} transform="translate(78,80) rotate(-52) scale(0.6)" />
          <Blade fill={SPROUT_600} transform="translate(72,66) rotate(-40) scale(0.65)" />
          <Blade fill={FOREST_500} transform="translate(66,52) rotate(-25) scale(0.7)" />

          <Blade fill={SPROUT_600} transform="translate(80,76) rotate(-14) scale(0.68)" />
          <Blade fill={SPROUT_500} transform="translate(80,58) rotate(0) scale(0.75)" />
          <Blade fill={SPROUT_600} transform="translate(80,42) rotate(14) scale(0.68)" />

          <Blade fill={FOREST_500} transform="translate(82,80) rotate(52) scale(0.6)" />
          <Blade fill={SPROUT_600} transform="translate(88,66) rotate(40) scale(0.65)" />
          <Blade fill={FOREST_500} transform="translate(94,52) rotate(25) scale(0.7)" />

          <Blade fill={SPROUT_500} transform="translate(60,66) rotate(-70) scale(0.55)" />
          <Blade fill={SPROUT_500} transform="translate(100,66) rotate(70) scale(0.55)" />
        </g>
      );

    case "herb":
      // Generic fallback for any herb without its own variant below (e.g.
      // cilantro, dill, oregano) — the six named herbs each get a shape that
      // reflects their real growth habit instead of sharing this one.
      return (
        <g>
          <path d="M70,98 C68,90 66,84 62,78" stroke={FOREST_500} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M80,98 C80,88 80,80 80,72" stroke={FOREST_500} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M90,98 C92,90 94,84 98,78" stroke={FOREST_500} strokeWidth="2" fill="none" strokeLinecap="round" />
          <HerbUnit fill={SPROUT_600} transform="translate(62,78) rotate(-20) scale(1.1)" />
          <HerbUnit fill={SPROUT_500} transform="translate(62,78) rotate(20) scale(0.95)" />
          <HerbUnit fill={FOREST_500} transform="translate(80,72) rotate(-15) scale(1.2)" />
          <HerbUnit fill={SPROUT_600} transform="translate(80,72) rotate(0) scale(1.3)" />
          <HerbUnit fill={SPROUT_500} transform="translate(80,72) rotate(18) scale(1.15)" />
          <HerbUnit fill={SPROUT_500} transform="translate(98,78) rotate(-20) scale(0.95)" />
          <HerbUnit fill={SPROUT_600} transform="translate(98,78) rotate(20) scale(1.1)" />
        </g>
      );

    case "basil":
      // Broad round leaf pairs stacked on a single stem — basil's real habit.
      return (
        <g>
          <path d="M80,98 C80,86 80,76 80,66" stroke={FOREST_600} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <RoundLeaf fill={SPROUT_600} transform="translate(80,88) rotate(-38) scale(0.85)" />
          <RoundLeaf fill={SPROUT_600} transform="translate(80,88) rotate(38) scale(0.85)" />
          <RoundLeaf fill={FOREST_500} transform="translate(80,74) rotate(-30) scale(1.05)" />
          <RoundLeaf fill={FOREST_500} transform="translate(80,74) rotate(30) scale(1.05)" />
          <RoundLeaf fill={SPROUT_500} transform="translate(80,66) rotate(0) scale(0.95)" />
        </g>
      );

    case "mint":
      // Pointed leaf pairs on a single tall stem — same stacked habit as
      // basil, but a pointed (not round) leaf, distinguishing the two.
      return (
        <g>
          <path d="M80,98 C80,84 80,70 80,58" stroke={FOREST_600} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <HerbUnit fill={SPROUT_600} transform="translate(80,86) rotate(-42) scale(1.5)" />
          <HerbUnit fill={SPROUT_600} transform="translate(80,86) rotate(42) scale(1.5)" />
          <HerbUnit fill={FOREST_500} transform="translate(80,70) rotate(-34) scale(1.65)" />
          <HerbUnit fill={FOREST_500} transform="translate(80,70) rotate(34) scale(1.65)" />
          <HerbUnit fill={SPROUT_500} transform="translate(80,58) rotate(0) scale(1.3)" />
        </g>
      );

    case "rosemary": {
      // Woody upright sprigs, densely lined with tiny needle blades — a
      // bottlebrush silhouette, nothing like a broad-leaf herb.
      const sprig = (x: number, topY: number, fill1: string, fill2: string) => (
        <>
          <path d={`M${x},98 L${x},${topY}`} stroke={FOREST_700} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const y = 98 - i * ((98 - topY) / 6) - 6;
            const fill = i % 2 === 0 ? fill1 : fill2;
            return (
              <g key={i}>
                <Blade fill={fill} transform={`translate(${x - 1},${y}) rotate(-60) scale(0.2,0.45)`} />
                <Blade fill={fill} transform={`translate(${x + 1},${y}) rotate(60) scale(0.2,0.45)`} />
              </g>
            );
          })}
        </>
      );
      return (
        <g>
          {sprig(66, 44, FOREST_600, FOREST_500)}
          {sprig(80, 34, FOREST_700, FOREST_600)}
          {sprig(94, 44, FOREST_600, FOREST_500)}
        </g>
      );
    }

    case "chives": {
      // Tall, thin, uniform grass-like blades bunched tight — with a small
      // blossom accent, since chives are one of the few herbs that flower.
      const blades: [number, number, number, string][] = [
        [70, -10, 1.05, FOREST_600],
        [75, -4, 1.15, SPROUT_600],
        [80, 0, 1.25, FOREST_500],
        [85, 4, 1.1, SPROUT_500],
        [90, 10, 1, FOREST_600],
      ];
      return (
        <g>
          {blades.map(([x, rot, scaleY, fill]) => (
            <Blade key={x} fill={fill} transform={`translate(${x},98) rotate(${rot}) scale(0.26,${scaleY})`} />
          ))}
          <circle cx="80" cy="45" r="4.2" fill={BLOOM_LIGHT} opacity="0.85" />
        </g>
      );
    }

    case "thyme":
      // Low, wide, trailing mound of tiny leaflets hugging the rim — thyme
      // grows outward, not upward.
      return (
        <g>
          <path d="M60,96 C50,92 42,90 34,92" stroke={FOREST_500} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M100,96 C110,92 118,90 126,92" stroke={FOREST_500} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M70,96 C68,88 64,82 56,78" stroke={FOREST_600} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M90,96 C92,88 96,82 104,78" stroke={FOREST_600} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M80,96 C80,86 80,76 80,68" stroke={FOREST_600} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {(
            [
              [40, 90],
              [48, 86],
              [56, 92],
              [64, 80],
              [72, 86],
              [80, 72],
              [80, 82],
              [88, 86],
              [96, 80],
              [104, 92],
              [112, 86],
              [120, 90],
            ] as const
          ).map(([x, y], i) => (
            <Pinna
              key={`${x}-${y}`}
              fill={i % 2 === 0 ? SPROUT_500 : FOREST_500}
              transform={`translate(${x},${y}) rotate(${((i % 5) - 2) * 15}) scale(0.7)`}
            />
          ))}
        </g>
      );

    case "parsley": {
      // Dense, rounder, higher-sitting frilly clumps — a curly-leaf silhouette
      // distinct from thyme's low wide mat.
      const frill = (cx: number, cy: number, fill1: string, fill2: string) => (
        <>
          <Pinna fill={fill1} transform={`translate(${cx - 4},${cy - 2}) rotate(-40) scale(0.85)`} />
          <Pinna fill={fill2} transform={`translate(${cx + 4},${cy - 2}) rotate(40) scale(0.85)`} />
          <Pinna fill={fill1} transform={`translate(${cx - 6},${cy - 8}) rotate(-70) scale(0.75)`} />
          <Pinna fill={fill2} transform={`translate(${cx + 6},${cy - 8}) rotate(70) scale(0.75)`} />
          <Pinna fill={fill1} transform={`translate(${cx},${cy - 10}) rotate(0) scale(0.8)`} />
        </>
      );
      return (
        <g>
          <path d="M68,98 C66,88 64,80 60,72" stroke={FOREST_600} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M80,98 C80,86 80,74 80,64" stroke={FOREST_600} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M92,98 C94,88 96,80 100,72" stroke={FOREST_600} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {frill(60, 72, SPROUT_600, SPROUT_500)}
          {frill(80, 64, FOREST_500, SPROUT_600)}
          {frill(100, 72, SPROUT_600, SPROUT_500)}
        </g>
      );
    }

    case "orchid":
      return (
        <g>
          <WideBlade fill={FOREST_600} transform="translate(66,98) rotate(-16) scale(0.7)" />
          <WideBlade fill={FOREST_500} transform="translate(94,98) rotate(16) scale(0.6)" />
          <path d="M80,96 C74,78 78,58 92,42" stroke={FOREST_500} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <g transform="translate(60,88)">
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(0) scale(0.85)" />
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(72) scale(0.85)" />
            <OrchidPetal fill={BLOOM} transform="rotate(144) scale(0.85)" />
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(216) scale(0.85)" />
            <OrchidPetal fill={BLOOM} transform="rotate(288) scale(0.85)" />
            <circle r="2.4" fill={SUN} />
          </g>
          <g transform="translate(93,42)">
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(0)" />
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(72)" />
            <OrchidPetal fill={BLOOM} transform="rotate(144)" />
            <OrchidPetal fill={BLOOM_LIGHT} transform="rotate(216)" />
            <OrchidPetal fill={BLOOM} transform="rotate(288)" />
            <circle r="2.8" fill={SUN} />
          </g>
        </g>
      );

    case "fern": {
      const frond = (fill1: string, fill2: string) => (
        <>
          <Pinna fill={fill1} transform="translate(1,-10) rotate(-35) scale(1.1)" />
          <Pinna fill={fill2} transform="translate(2,-10) rotate(35) scale(1.1)" />
          <Pinna fill={fill1} transform="translate(2,-19) rotate(-32) scale(1)" />
          <Pinna fill={fill2} transform="translate(3,-19) rotate(32) scale(1)" />
          <Pinna fill={fill1} transform="translate(4,-28) rotate(-28) scale(0.9)" />
          <Pinna fill={fill2} transform="translate(5,-28) rotate(28) scale(0.9)" />
          <Pinna fill={fill1} transform="translate(5,-37) rotate(-24) scale(0.75)" />
          <Pinna fill={fill2} transform="translate(6,-37) rotate(24) scale(0.75)" />
          <Pinna fill={fill1} transform="translate(6,-45) rotate(-18) scale(0.55)" />
          <Pinna fill={fill2} transform="translate(6.5,-45) rotate(18) scale(0.55)" />
        </>
      );
      return (
        <g>
          <g transform="translate(80,98) rotate(-42)">
            <path d="M0,0 C3,-16 9,-32 6,-50" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
            {frond(SPROUT_600, SPROUT_500)}
          </g>
          <g transform="translate(80,98) rotate(-14)">
            <path d="M0,0 C2,-18 6,-36 3,-56" stroke={FOREST_600} strokeWidth="2" fill="none" />
            {frond(FOREST_500, SPROUT_600)}
          </g>
          <g transform="translate(80,98) rotate(14) scale(-1,1)">
            <path d="M0,0 C2,-18 6,-36 3,-56" stroke={FOREST_600} strokeWidth="2" fill="none" />
            {frond(FOREST_500, SPROUT_600)}
          </g>
          <g transform="translate(80,98) rotate(42) scale(-1,1)">
            <path d="M0,0 C3,-16 9,-32 6,-50" stroke={FOREST_500} strokeWidth="1.8" fill="none" />
            {frond(SPROUT_600, SPROUT_500)}
          </g>
        </g>
      );
    }

    default:
      return (
        <g>
          <path d="M80,98V78" stroke={FOREST_700} strokeWidth="4" strokeLinecap="round" fill="none" />
          <WideBlade fill={SPROUT_500} transform="translate(80,78) rotate(-22) scale(0.95)" />
          <WideBlade fill={SPROUT_600} transform="translate(80,78) rotate(22) scale(0.95)" />
        </g>
      );
  }
}

export default function PlantIllustration({
  illustrationKey,
  className,
  size = 96,
}: {
  illustrationKey: string;
  className?: string;
  size?: number;
}) {
  const KNOWN_KEYS: readonly string[] = [
    "vine",
    "monstera",
    "snake",
    "spider",
    "broadleaf",
    "fiddle",
    "succulent",
    "string",
    "pilea",
    "palm",
    "herb",
    "basil",
    "rosemary",
    "thyme",
    "parsley",
    "chives",
    "mint",
    "orchid",
    "fern",
  ];
  const key: IllustrationKey = KNOWN_KEYS.includes(illustrationKey)
    ? (illustrationKey as IllustrationKey)
    : "generic";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={className}
      role="img"
      aria-label="Plant illustration"
    >
      <Pot />
      <Leaves variant={key} />
    </svg>
  );
}
