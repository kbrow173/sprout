/**
 * Curated SVG plant illustration library. Every plant in the garden renders
 * as one of these flat, friendly variants (never the raw photo) — fast,
 * consistent, works offline, and is the cleanest surface for a later Claude
 * Design pass (just swap the <LeavesForKey> paths, the pot stays put).
 *
 * illustration_key values are set at seed time (supabase/seed.sql) and copied
 * onto each `plants` row so a plant keeps its look even if the species record
 * changes. Unknown keys fall back to "generic".
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
  | "orchid"
  | "fern"
  | "generic";

const FOREST = "#1f5b39";
const SPROUT_600 = "#46b26a";
const SPROUT_500 = "#62c47d";
const SPROUT_400 = "#8ad79c";
const SPROUT_300 = "#b6e7c1";
const BLOOM = "#f2765e";
const SUN = "#f5b545";

function Pot() {
  return (
    <g>
      <ellipse cx="80" cy="146" rx="34" ry="6" fill="#000000" opacity="0.06" />
      <path
        d="M52 100h56l-6 40a10 10 0 0 1-9.9 8.6H67.9A10 10 0 0 1 58 140l-6-40Z"
        fill="#ffffff"
      />
      <rect x="47" y="90" width="66" height="14" rx="7" fill="#eef9f0" />
    </g>
  );
}

function Leaves({ variant }: { variant: IllustrationKey }) {
  switch (variant) {
    case "vine":
      return (
        <g>
          <path
            d="M80 96C58 108 44 128 40 148"
            stroke={SPROUT_600}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="66" cy="112" rx="9" ry="6.5" fill={SPROUT_500} transform="rotate(-30 66 112)" />
          <ellipse cx="52" cy="128" rx="9" ry="6.5" fill={SPROUT_400} transform="rotate(-45 52 128)" />
          <ellipse cx="42" cy="146" rx="8" ry="6" fill={SPROUT_300} transform="rotate(-55 42 146)" />
          <path
            d="M80 96C100 106 116 124 121 146"
            stroke={SPROUT_600}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="94" cy="110" rx="9" ry="6.5" fill={SPROUT_500} transform="rotate(30 94 110)" />
          <ellipse cx="109" cy="126" rx="9" ry="6.5" fill={SPROUT_400} transform="rotate(45 109 126)" />
          <ellipse cx="118" cy="144" rx="8" ry="6" fill={SPROUT_300} transform="rotate(55 118 144)" />
          <path d="M80 100V76" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <path d="M80 76c-12-10-30-10-38 0 10 16 28 16 38 0Z" fill={SPROUT_500} />
          <path d="M80 76c12-8 28-6 34 4-9 14-25 12-34-4Z" fill={SPROUT_600} />
        </g>
      );

    case "monstera":
      return (
        <g>
          <path d="M80 100V64" stroke={FOREST} strokeWidth="5" strokeLinecap="round" />
          <path
            d="M80 66c-30-4-46 16-44 40 4 24 24 34 44 26 20 8 40-2 44-26 2-24-14-44-44-40Z"
            fill={SPROUT_500}
          />
          <circle cx="66" cy="86" r="5.5" fill="#ffffff" />
          <circle cx="94" cy="86" r="5.5" fill="#ffffff" />
          <circle cx="80" cy="72" r="4.5" fill="#ffffff" />
          <path d="M80 66c-4 18-2 34 0 46" stroke={SPROUT_600} strokeWidth="2.5" fill="none" opacity="0.5" />
        </g>
      );

    case "snake":
      return (
        <g>
          <path d="M62 100c-4-24 0-42 6-52 4 12 6 30 4 52Z" fill={SPROUT_400} />
          <path d="M78 100c-3-30 1-52 6-64 5 14 7 38 3 64Z" fill={SPROUT_600} />
          <path d="M94 100c-4-22 0-38 5-48 4 10 5 28 3 48Z" fill={SPROUT_500} />
          <path d="M78 36c-2 18-1 40 0 58" stroke={FOREST} strokeWidth="2" opacity="0.4" />
        </g>
      );

    case "spider":
      return (
        <g>
          <path d="M80 100c-16-20-30-34-46-38" stroke={SPROUT_500} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M80 100c-10-24-18-42-24-56" stroke={SPROUT_600} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M80 100c2-26 4-44 4-60" stroke={SPROUT_500} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M80 100c10-24 18-42 24-56" stroke={SPROUT_600} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M80 100c16-20 30-34 46-38" stroke={SPROUT_500} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );

    case "broadleaf":
      return (
        <g>
          <path d="M62 100V78" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <path d="M62 78c-18-6-24 10-18 26 6 12 20 14 28 4 4-14 2-26-10-30Z" fill={SPROUT_500} />
          <path d="M98 100V70" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <path d="M98 70c20-4 28 14 20 30-8 12-22 12-30 0-4-14 0-26 10-30Z" fill={SPROUT_600} />
          <path d="M80 100V60" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="80" cy="52" rx="5.5" ry="9" fill="#ffffff" />
        </g>
      );

    case "fiddle":
      return (
        <g>
          <path d="M80 100V60" stroke={FOREST} strokeWidth="5" strokeLinecap="round" />
          <path
            d="M80 62c-22 2-30 22-22 40 6 14 16 20 22 20s16-6 22-20c8-18 0-38-22-40Z"
            fill={SPROUT_600}
          />
          <path d="M80 66v52" stroke={SPROUT_400} strokeWidth="2.5" opacity="0.6" />
          <path d="M80 78c-8 4-12 12-12 20M80 78c8 4 12 12 12 20" stroke={SPROUT_400} strokeWidth="2" fill="none" opacity="0.5" />
        </g>
      );

    case "succulent":
      return (
        <g>
          {[0, 51, 102, 153, 204, 255, 306].map((deg, i) => (
            <path
              key={deg}
              d="M80 98c-3-10 0-18 3-22 3 4 6 12 3 22Z"
              fill={i % 2 === 0 ? SPROUT_400 : SPROUT_600}
              transform={`rotate(${deg} 80 98)`}
            />
          ))}
          <circle cx="80" cy="98" r="4" fill={SPROUT_300} />
        </g>
      );

    case "string":
      return (
        <g>
          {[58, 72, 88, 102].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x} 96C${x - 4} 108 ${x + 4} 118 ${x} 132`}
                stroke={SPROUT_600}
                strokeWidth="2"
                fill="none"
              />
              {[104, 116, 128, 140].map((y) => (
                <circle key={y} cx={x + (i % 2 === 0 ? 2 : -2)} cy={y} r="3.4" fill={SPROUT_500} />
              ))}
            </g>
          ))}
        </g>
      );

    case "pilea":
      return (
        <g>
          <path d="M64 100V80" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
          <circle cx="64" cy="72" r="12" fill={SPROUT_500} />
          <path d="M96 100V72" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
          <circle cx="96" cy="62" r="14" fill={SPROUT_600} />
          <path d="M80 100V86" stroke={FOREST} strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="78" r="10" fill={SPROUT_400} />
        </g>
      );

    case "palm":
      return (
        <g>
          {[-60, -30, 0, 30, 60].map((deg) => (
            <path
              key={deg}
              d="M80 100C80 70 82 50 88 38"
              stroke={deg % 60 === 0 ? SPROUT_600 : SPROUT_500}
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              transform={`rotate(${deg} 80 100)`}
            />
          ))}
        </g>
      );

    case "herb":
      return (
        <g>
          {[
            [64, 88, SPROUT_500],
            [80, 82, SPROUT_600],
            [96, 88, SPROUT_500],
            [72, 96, SPROUT_400],
            [88, 96, SPROUT_400],
          ].map(([cx, cy, fill], i) => (
            <circle key={i} cx={cx as number} cy={cy as number} r="11" fill={fill as string} />
          ))}
        </g>
      );

    case "orchid":
      return (
        <g>
          <path d="M80 100C76 80 84 60 96 44" stroke={SPROUT_600} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="62" cy="98" rx="12" ry="7" fill={SPROUT_500} transform="rotate(-10 62 98)" />
          <ellipse cx="60" cy="86" rx="11" ry="6.5" fill={SPROUT_600} transform="rotate(-8 60 86)" />
          {[[96, 44], [88, 56]].map(([cx, cy], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx={cx}
                  cy={cy - 6}
                  rx="4.5"
                  ry="7"
                  fill={i === 0 ? BLOOM : "#f6a08e"}
                  transform={`rotate(${deg} ${cx} ${cy})`}
                />
              ))}
              <circle cx={cx} cy={cy} r="2.6" fill={SUN} />
            </g>
          ))}
        </g>
      );

    case "fern":
      return (
        <g>
          {[-40, -20, 0, 20, 40].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 80 100)`}>
              <path d="M80 100C80 76 80 56 80 44" stroke={SPROUT_600} strokeWidth="2" fill="none" />
              {[52, 62, 72, 82, 92].map((y) => (
                <g key={y}>
                  <ellipse cx={78} cy={y} rx="4.5" ry="2.4" fill={SPROUT_500} transform={`rotate(-25 78 ${y})`} />
                  <ellipse cx={82} cy={y} rx="4.5" ry="2.4" fill={SPROUT_400} transform={`rotate(25 82 ${y})`} />
                </g>
              ))}
            </g>
          ))}
        </g>
      );

    default:
      return (
        <g>
          <path d="M80 100V70" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
          <path d="M80 70c-14-6-30 2-32 18 14 10 28 4 32-18Z" fill={SPROUT_500} />
          <path d="M80 70c14-6 30 2 32 18-14 10-28 4-32-18Z" fill={SPROUT_600} />
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
      <Leaves variant={key} />
      <Pot />
    </svg>
  );
}
