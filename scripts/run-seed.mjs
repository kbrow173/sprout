// Seeds species_care with the same ~28 houseplants as supabase/seed.sql.
// Supabase's client library talks PostgREST (table CRUD), not raw SQL, so
// this is the executable counterpart to seed.sql — same data, expressed as
// JS objects and upserted via supabase-js. seed.sql stays as the copy-paste
// path for anyone using the SQL editor directly; keep both in sync if you
// add a species (this file is the source of truth for content — copy any
// edits back into seed.sql's comments/rows too).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const species = [
  s("Golden Pothos", "Epipremnum aureum", "vine", "easy", "medium", 9, 18,
    "Average household humidity is fine.",
    "Well-draining all-purpose potting mix with a handful of perlite.", 14, 24,
    "Toxic to cats and dogs if chewed — keep vines out of reach.",
    "Snip a 4–6\" stem below a node (the little brown bump) and root it in a jar of water; pot up once roots are 1–2\" long.",
    "Pinch the growing tips to keep it bushy, and trim leggy vines back to just above a leaf.", null,
    ["Let the top 2 inches of soil dry out before watering", "Wipe dusty leaves so they can breathe", "Give it a trellis or let it trail — it loves either"],
    ["Don't let it sit in standing water", "Don't panic over one yellow leaf — it's normal shedding"]),

  s("Heartleaf Philodendron", "Philodendron hederaceum", "vine", "easy", "medium", 9, 18,
    "Average humidity; enjoys occasional misting.",
    "Loose, well-draining mix — standard potting soil with extra perlite.", 14, 24,
    "Mildly toxic to pets — causes mouth irritation if chewed.",
    "Cut just below a node with an aerial root attached; roots readily in water within 2–3 weeks.",
    "Trim vines to encourage fuller growth; remove any yellowing leaves at the base.", null,
    ["Water when the top inch of soil feels dry", "Rotate for even, symmetrical growth", "Let it climb a moss pole for bigger leaves"],
    ["Don't overwater — soggy soil causes root rot fast", "Don't place in direct hot afternoon sun"]),

  s("Marble Queen Pothos", "Epipremnum aureum 'Marble Queen'", "vine", "easy", "bright", 8, 16,
    "Average humidity is fine.",
    "Well-draining all-purpose potting mix with perlite.", 14, 24,
    "Toxic to cats and dogs if chewed.",
    "Stem cuttings with a node root easily in water, same as regular pothos.",
    "Trim back any all-white (no chlorophyll) shoots that struggle to grow.", null,
    ["Give it bright, indirect light to keep the white variegation crisp", "Let soil dry between waterings"],
    ["Don't keep in low light — variegation will fade to solid green", "Don't overwater"]),

  s("English Ivy", "Hedera helix", "vine", "medium", "medium", 6, 12,
    "Prefers higher humidity than most houseplants.",
    "Rich, well-draining potting mix.", 14, 18,
    "Toxic to cats, dogs, and people if ingested.",
    "Root 4\" tip cuttings in water or moist soil; several cuttings together make a fuller pot.",
    "Pinch tips regularly to prevent legginess and encourage bushiness.", null,
    ["Keep soil lightly moist, never soggy", "Mist occasionally or use a humidity tray", "Watch for spider mites in dry indoor air"],
    ["Don't let it dry out completely", "Don't place near heating vents"]),

  s("Swiss Cheese Vine", "Monstera adansonii", "vine", "medium", "medium", 7, 14,
    "Enjoys above-average humidity.",
    "Airy, well-draining mix — potting soil, orchid bark, and perlite.", 14, 20,
    "Toxic to cats and dogs.",
    "Cut a stem section with at least one node and aerial root; roots well in water.",
    "Trim to control size and encourage bushier, more perforated new leaves.", null,
    ["Give it something to climb for bigger, more holey leaves", "Water when the top inch of soil is dry"],
    ["Don't keep in low light — fewer leaf holes will form", "Don't let roots sit wet"]),

  s("Monstera Deliciosa", "Monstera deliciosa", "monstera", "easy", "bright", 8, 16,
    "Average to above-average humidity.",
    "Chunky, well-draining aroid mix — potting soil, orchid bark, and perlite.", 14, 24,
    "Toxic to cats and dogs; unripe fruit is toxic to humans too.",
    "Cut a stem section with a node and aerial root, root in water or moist sphagnum moss.",
    "Trim to control size; wipe or rinse the big leaves so they can breathe.", null,
    ["Give it a moss pole to climb for full-sized, split leaves", "Water deeply, then let the top 2 inches dry"],
    ["Don't expect splits on a young plant — they come with maturity", "Don't keep in direct hot sun, which scorches leaves"]),

  s("Snake Plant", "Dracaena trifasciata", "snake", "easy", "low", 18, 35,
    "Not fussy about humidity at all.",
    "Fast-draining cactus/succulent mix.", 21, 24,
    "Mildly toxic to pets if chewed.",
    "Divide the rhizome at the base into sections with roots, or root a leaf cutting (variegated types lose their stripes this way).",
    "Trim any damaged leaves at the base with a clean cut.", null,
    ["Let the soil dry out completely between waterings", "Thrives on neglect — a great starter plant", "Tolerates low light beautifully"],
    ["Don't overwater — this is the #1 way to kill one", "Don't use a pot without drainage"]),

  s("ZZ Plant", "Zamioculcas zamiifolia", "snake", "easy", "low", 18, 35,
    "Not fussy about humidity.",
    "Fast-draining cactus/succulent mix.", 21, 24,
    "All parts are toxic if ingested — keep away from pets and kids.",
    "A leaflet with a bit of stem attached can root in soil, though it's slow (months).",
    "Trim any yellowing stalks at the base — usually a sign of overwatering.", null,
    ["Let soil dry out completely — the thick rhizomes store water", "It genuinely thrives in low light offices"],
    ["Don't water on a schedule — always check soil first", "Don't worry about the glossy leaves; that's natural, not a pest"]),

  s("Spider Plant", "Chlorophytum comosum", "spider", "easy", "medium", 7, 14,
    "Average humidity is fine.",
    "Standard well-draining potting mix.", 14, 18,
    "Non-toxic — safe for curious pets.",
    "Pot up the little plantlets (\"spiderettes\") that dangle on runners, or snip and root in water.",
    "Trim brown leaf tips (usually from tap-water fluoride) with scissors at an angle.", null,
    ["Water when the top inch of soil is dry", "Hang it or give it room for arching leaves", "Use filtered water if tips keep browning"],
    ["Don't worry about the brown tips — cosmetic, not fatal", "Don't let it dry out completely for long stretches"]),

  s("Peace Lily", "Spathiphyllum wallisii", "broadleaf", "easy", "medium", 5, 9,
    "Loves higher humidity; mist occasionally.",
    "Rich, moisture-retentive but well-draining potting mix.", 14, 18,
    "Toxic to cats and dogs if chewed.",
    "Divide the root ball at repotting time into sections with leaves and roots attached.",
    "Snip spent flower stalks at the base and remove any yellowing leaves.", null,
    ["It droops dramatically when thirsty — a built-in reminder to water", "Wipe leaves to keep them glossy and dust-free"],
    ["Don't panic at drooping — it perks right back up after watering", "Don't let it sit in a saucer of water"]),

  s("Calathea Orbifolia", "Calathea orbifolia", "broadleaf", "fussy", "medium", 5, 8,
    "Needs high humidity — a pebble tray or humidifier helps a lot.",
    "Light, moisture-retentive mix — potting soil with peat/coco coir and perlite.", 10, 18,
    "Non-toxic — safe for pets.",
    "Divide clumps at the roots when repotting; each division needs its own roots.",
    "Trim any crispy or damaged leaf edges with clean scissors.", null,
    ["Use filtered or distilled water — tap minerals cause leaf spotting", "Keep humidity high and out of drafts", "Leaves fold up at night — totally normal"],
    ["Don't place near a heating/cooling vent — crispy edges follow fast", "Don't let soil fully dry out"]),

  s("Prayer Plant", "Maranta leuconeura", "broadleaf", "fussy", "medium", 5, 9,
    "Prefers high humidity.",
    "Light, well-draining, moisture-retentive mix.", 10, 18,
    "Non-toxic — safe for pets.",
    "Divide at the roots when repotting, or root stem cuttings with a node in water.",
    "Trim damaged or crispy leaf edges as needed.", null,
    ["Leaves fold up like praying hands at night — that's the show", "Keep soil consistently moist but never soggy", "Use filtered water if possible"],
    ["Don't let it dry out completely between waterings", "Don't expose to cold drafts"]),

  s("Anthurium", "Anthurium andraeanum", "broadleaf", "medium", "medium", 6, 11,
    "Enjoys above-average humidity.",
    "Chunky, well-draining aroid mix with orchid bark and perlite.", 14, 24,
    "Toxic to cats and dogs.",
    "Divide at the roots at repotting, or air-layer a stem section.",
    "Snip spent waxy blooms at the base to encourage new ones.", null,
    ["Let the top 2 inches of soil dry before watering", "The waxy red blooms can last for months"],
    ["Don't overwater — roots rot quickly in soggy mix", "Don't place in direct hot sun"]),

  s("Fiddle Leaf Fig", "Ficus lyrata", "fiddle", "fussy", "bright", 8, 16,
    "Average humidity; benefits from occasional misting.",
    "Well-draining potting mix with extra perlite.", 14, 24,
    "Toxic to cats and dogs; sap can irritate skin.",
    "Air-layer a stem, or root a tip cutting with a node in water (slow and can be finicky).",
    "Trim to shape once established; wipe the big leaves regularly so they can photosynthesize.", null,
    ["Pick one bright spot and keep it there — it hates being moved", "Water when the top 2 inches are dry, then water deeply", "Rotate a quarter turn each week for even growth"],
    ["Don't move it around chasing light — it sulks and drops leaves", "Don't let it dry out completely or overwater — both cause leaf drop"]),

  s("Rubber Plant", "Ficus elastica", "fiddle", "easy", "bright", 9, 18,
    "Average humidity is fine.",
    "Well-draining potting mix.", 14, 24,
    "Toxic to cats and dogs; sap can irritate skin.",
    "Air-layer a stem section, or root a tip cutting in water (dip in rooting hormone for best odds).",
    "Trim to control height; wipe the glossy leaves to keep them dust-free.", null,
    ["Much more forgiving than its fiddle-leaf cousin", "Let the top 2 inches of soil dry before watering", "Bright indirect light keeps the leaves deep and glossy"],
    ["Don't overwater — yellowing leaves are usually the first sign", "Don't keep in deep shade for long"]),

  s("Aloe Vera", "Aloe vera", "succulent", "easy", "bright", 14, 28,
    "Prefers dry air — no misting needed.",
    "Fast-draining cactus/succulent mix.", 21, 24,
    "Toxic to cats and dogs if ingested; the gel is fine for topical human use.",
    "Twist off rooted offset \"pups\" from the base and pot separately.",
    "Snip any mushy or damaged leaves at the base.", null,
    ["Let soil dry out completely between waterings", "Give it your brightest windowsill", "Snap off a leaf for sunburn relief whenever you need it"],
    ["Don't overwater — mushy, translucent leaves mean root rot", "Don't use a pot without drainage"]),

  s("Jade Plant", "Crassula ovata", "succulent", "easy", "bright", 14, 28,
    "Prefers dry air.",
    "Fast-draining cactus/succulent mix.", 21, 30,
    "Mildly toxic to cats and dogs.",
    "Let a stem or leaf cutting callus over for a day or two, then set it on top of dry soil until it roots.",
    "Prune to shape — it responds well and can be trained into a little tree form.", null,
    ["Let soil dry out fully between waterings", "Give it as much bright light as you can", "A classic 'lucky plant' that lives for decades with basic care"],
    ["Don't overwater — this is the most common way to lose one", "Don't keep in low light or it gets leggy and pale"]),

  s("Echeveria", "Echeveria elegans", "succulent", "easy", "bright", 14, 28,
    "Prefers dry air.",
    "Fast-draining cactus/succulent mix, gritty and gravelly.", 21, 24,
    "Non-toxic — safe for pets.",
    "Twist off and dry offsets for a day, then set on soil to root; individual leaves can also be rooted.",
    "Remove dried lower leaves as the rosette naturally sheds them.", null,
    ["Water at the soil, not on the rosette, to avoid rot", "Give it your brightest spot — stretching means it wants more light"],
    ["Don't let water sit in the center of the rosette", "Don't overwater — always let it dry out fully first"]),

  s("String of Pearls", "Curio rowleyanus", "string", "medium", "bright", 12, 24,
    "Prefers dry air.",
    "Fast-draining cactus/succulent mix.", 21, 24,
    "Toxic to cats and dogs.",
    "Lay a trimmed strand across moist soil — new roots form at the nodes within a couple of weeks.",
    "Trim leggy or bare strands to encourage fuller new growth.", null,
    ["Let soil dry out between waterings — the pearls store water", "Hang it somewhere its strands can trail freely"],
    ["Don't overwater — pearls go mushy and shrivel fast when overwatered", "Don't keep in low light — strands get sparse and stretched"]),

  s("String of Hearts", "Ceropegia woodii", "string", "easy", "bright", 12, 24,
    "Prefers dry air.",
    "Fast-draining cactus/succulent mix.", 21, 24,
    "Generally considered non-toxic, but best kept away from curious pets.",
    "Lay a trimmed strand with nodes across moist soil, or root tip cuttings in water.",
    "Trim to control length; the trimmings are perfect for propagating more.", null,
    ["Let soil dry out between waterings", "The little tubers that form on strands can be potted for new plants too"],
    ["Don't overwater — thin heart-shaped leaves are easy to rot", "Don't worry about slow growth in winter — totally normal"]),

  s("Chinese Money Plant", "Pilea peperomioides", "pilea", "easy", "medium", 8, 16,
    "Average humidity is fine.",
    "Well-draining potting mix with extra perlite.", 10, 18,
    "Non-toxic — safe for pets.",
    "Pot up the baby plantlets that pop up around the base — they usually already have roots.",
    "Rotate regularly instead of pruning; leaves naturally shed from the bottom over time.", null,
    ["Rotate weekly — it grows hard toward light and tips over otherwise", "Let the top inch of soil dry before watering", "Share the free babies with friends"],
    ["Don't skip rotating or it'll lean dramatically", "Don't overwater — coin leaves go yellow and mushy"]),

  s("Dracaena Marginata", "Dracaena marginata", "palm", "easy", "medium", 10, 20,
    "Not fussy about humidity.",
    "Well-draining potting mix.", 21, 24,
    "Toxic to cats and dogs.",
    "Root a cane cutting (a bare stem section) in water or moist soil.",
    "Trim the top to encourage branching; remove any yellowing lower leaves.", null,
    ["Let the top 2 inches of soil dry before watering", "Very tolerant of missed waterings and low-ish light"],
    ["Don't overwater — brown leaf tips often mean too much water, not too little", "Don't use fluoridated tap water if tips keep browning"]),

  s("Areca Palm", "Dypsis lutescens", "palm", "medium", "bright", 7, 14,
    "Enjoys higher humidity; mist occasionally.",
    "Well-draining, slightly rich potting mix.", 14, 20,
    "Non-toxic — safe for pets.",
    "Not typically propagated at home; usually purchased as a multi-stem clump.",
    "Trim entirely brown fronds at the base; leave partially green ones to keep feeding the plant.", null,
    ["Keep soil evenly moist but never soggy", "Bright indirect light keeps fronds full and green", "Mist to help prevent dry-air brown tips"],
    ["Don't let it dry out completely — fronds brown fast", "Don't use water softened with salt — sensitive to it"]),

  s("Parlor Palm", "Chamaedorea elegans", "palm", "easy", "low", 9, 18,
    "Tolerant of average humidity.",
    "Well-draining potting mix.", 14, 24,
    "Non-toxic — safe for pets.",
    "Not typically propagated at home; grown from seed commercially.",
    "Trim only fully brown fronds at the base.", null,
    ["One of the best low-light palms for indoors", "Let the top 2 inches of soil dry before watering"],
    ["Don't overwater — root rot is the main risk", "Don't expect fast growth — it's a slow, patient grower"]),

  s("Basil", "Ocimum basilicum", "basil", "easy", "bright", 3, 5,
    "Average humidity is fine.",
    "Rich, well-draining potting mix.", 7, 6,
    "Non-toxic — it's food!",
    "Root a 4\" stem cutting in a glass of water; roots appear within a week.",
    "Pinch just above a leaf pair every week or two to keep it bushy and delay flowering.",
    "Pinch individual leaves from the top down anytime; harvesting encourages more growth.",
    ["Give it your sunniest windowsill — basil wants as much light as it can get", "Pinch flower buds off promptly to keep leaves tasty", "Harvest often — it wants to be picked"],
    ["Don't let it dry out completely — it wilts fast and dramatically", "Don't let it go to flower if you want the best-tasting leaves"], 5),

  s("Mint", "Mentha spicata", "mint", "easy", "bright", 3, 6,
    "Average humidity is fine.",
    "Rich, moisture-retentive potting mix.", 7, 8,
    "Non-toxic — it's food!",
    "Root a stem cutting in water — mint roots almost embarrassingly fast.",
    "Trim back hard whenever it gets leggy; it bounces back quickly.",
    "Snip sprigs anytime, ideally before flowering for the best flavor.",
    ["Keep soil consistently moist — mint is thirstier than most herbs", "Keep it in its own pot — mint spreads aggressively", "Trim regularly to keep it bushy and productive"],
    ["Don't let it dry out — leaves wilt and crisp quickly", "Don't plant it with other herbs in one pot — it'll take over"], 7),

  s("Rosemary", "Salvia rosmarinus", "rosemary", "medium", "bright", 6, 12,
    "Prefers dry air — good airflow prevents mildew.",
    "Fast-draining, slightly sandy mix — think half potting soil, half cactus mix.", 10, 12,
    "Non-toxic — it's food!",
    "Root a 4\" non-flowering stem tip in water or moist perlite; can be slow (a few weeks).",
    "Trim after flowering and pinch tips regularly to keep it bushy and woody growth in check.",
    "Snip sprigs anytime; the woody stems get tastier as the plant matures.",
    ["Give it your sunniest, brightest spot — it wants as much light as basil", "Let the soil dry out between waterings — better too dry than too wet", "Good airflow prevents powdery mildew"],
    ["Don't overwater — root rot is the #1 killer of indoor rosemary", "Don't crowd it against a damp window — needs airflow"], 14),

  s("Thyme", "Thymus vulgaris", "thyme", "easy", "bright", 7, 14,
    "Prefers dry air.",
    "Fast-draining, slightly sandy mix.", 10, 12,
    "Non-toxic — it's food!",
    "Root a 3\" stem cutting in water, or divide an established clump at the roots.",
    "Trim back by a third after flowering to keep it compact and prevent woodiness.",
    "Snip whole sprigs anytime — flavor is best just before it flowers.",
    ["Let the soil dry out fully between waterings — very drought-tolerant", "Give it your sunniest windowsill", "Trim after flowering to keep new growth coming"],
    ["Don't overwater — thyme would rather be too dry than too wet", "Don't use a rich, moisture-retentive soil — it wants lean and fast-draining"], 10),

  s("Oregano", "Origanum vulgare", "herb", "easy", "bright", 5, 10,
    "Average humidity is fine.",
    "Well-draining mix — standard potting soil with extra perlite.", 10, 10,
    "Non-toxic — it's food!",
    "Root a stem cutting in water, or divide the clump at the roots.",
    "Pinch tips regularly to prevent legginess and delay flowering.",
    "Harvest leaves before it flowers for the boldest flavor; snip whole stems as needed.",
    ["Let the top inch of soil dry before watering", "Pinch off flower buds to keep the leaves flavorful", "Give it a sunny spot — flavor intensifies with more light"],
    ["Don't overwater — soggy soil is the main risk", "Don't let it flower if you're growing it mainly to cook with"], 10),

  s("Parsley", "Petroselinum crispum", "parsley", "medium", "bright", 4, 7,
    "Average humidity is fine.",
    "Rich, well-draining potting mix.", 7, 5,
    "Non-toxic — it's food!",
    "Best grown from seed — its long taproot makes it resent transplanting or division.",
    "No real pruning needed; just remove any yellowing outer stems.",
    "Snip outer stems from the base, working outside-in, and let the center keep producing.",
    ["Keep soil consistently moist — parsley doesn't like to dry out", "Harvest outer stems first so the plant keeps growing", "Give it several hours of bright light daily"],
    ["Don't let it dry out completely between waterings", "Don't try to transplant a mature plant — the taproot rarely survives it"], 7),

  s("Cilantro", "Coriandrum sativum", "herb", "medium", "bright", 4, 7,
    "Average humidity is fine.",
    "Rich, well-draining potting mix.", 7, 4,
    "Non-toxic — it's food!",
    "Grows fastest and best from seed — it bolts and dislikes root disturbance from transplanting.",
    "Pinch the center growth point to slow bolting and encourage bushier leaf production.",
    "Snip outer leaves regularly; once it flowers and sets seed (bolts) the leaves turn bitter.",
    ["Keep soil evenly moist — it bolts to seed faster when stressed by dryness or heat", "Sow a new batch every few weeks for a steady supply", "Harvest often, before it has a chance to flower"],
    ["Don't let it get too hot or dry — both trigger rapid bolting", "Don't expect one plant to last long — cilantro is fast and short-lived by nature"], 5),

  s("Chives", "Allium schoenoprasum", "chives", "easy", "bright", 5, 9,
    "Average humidity is fine.",
    "Rich, well-draining potting mix.", 10, 12,
    "Non-toxic to people — it's food! Toxic to cats and dogs, though, like other alliums.",
    "Divide an established clump into smaller sections, each with roots and a few blades.",
    "Trim spent purple flower heads at the base to keep the plant productive.",
    "Snip blades from the outside with scissors, about 2 inches from the soil — they regrow quickly.",
    ["Let the top inch of soil dry before watering", "Snip from the outer edge so the center keeps growing", "Divide every couple of years to keep it vigorous"],
    ["Don't let pets nibble it — chives are toxic to cats and dogs even though they're fine for people", "Don't harvest the whole clump at once — always leave some growth behind"], 10),

  s("Sage", "Salvia officinalis", "herb", "easy", "bright", 7, 14,
    "Prefers dry air.",
    "Fast-draining, slightly sandy mix.", 10, 14,
    "Non-toxic — it's food!",
    "Root a 4\" stem cutting in water or perlite, or layer a low branch by pinning it to soil.",
    "Trim back woody stems in spring to keep growth fresh and prevent legginess.",
    "Snip individual leaves anytime; flavor is strongest right before flowering.",
    ["Let the soil dry out between waterings — sage is quite drought-tolerant", "Give it plenty of direct sun", "Trim yearly to keep the woody growth in check"],
    ["Don't overwater — soggy roots are the main risk", "Don't crowd it into a humid, poorly ventilated spot"], 14),

  s("Lemon Balm", "Melissa officinalis", "herb", "easy", "medium", 5, 9,
    "Average humidity is fine.",
    "Rich, moisture-retentive potting mix.", 10, 10,
    "Non-toxic — it's food!",
    "Root a stem cutting in water, or divide the clump at the roots — like its cousin mint, it roots eagerly.",
    "Cut back hard whenever it gets leggy or before it flowers; it regrows quickly.",
    "Snip leaves anytime — best flavor and aroma are just before flowering.",
    ["Keep soil consistently moist — thirstier than rosemary or thyme", "Keep it in its own pot — it spreads like mint", "Cut back hard occasionally to keep it fresh and bushy"],
    ["Don't let it dry out — leaves wilt quickly", "Don't plant it in a shared bed or pot — it takes over like mint does"], 7),

  s("Phalaenopsis Orchid", "Phalaenopsis amabilis", "orchid", "medium", "medium", 7, 10,
    "Loves higher humidity — a pebble tray helps.",
    "Chunky orchid bark mix, NOT regular potting soil — roots need airflow.", 14, 18,
    "Generally considered non-toxic to pets.",
    "Pot up a \"keiki\" (baby plantlet) that sometimes forms on the flower spike once it has its own roots.",
    "Cut the flower spike above a node after blooms fade to encourage a possible rebloom, or at the base if it yellows.", null,
    ["Water by soaking the bark thoroughly, then let it dry — never let roots sit wet", "Bright, indirect light — a sheer-curtained window is ideal", "Silvery-green roots mean thirsty; bright green means well-watered"],
    ["Don't use regular potting soil — it suffocates orchid roots", "Don't let water sit in the crown between leaves — invites rot"]),

  s("Boston Fern", "Nephrolepis exaltata", "fern", "fussy", "medium", 4, 7,
    "Needs high humidity — mist daily or use a pebble tray.",
    "Rich, moisture-retentive potting mix with peat or coco coir.", 10, 12,
    "Non-toxic — safe for pets.",
    "Divide the root clump into sections at repotting, each with fronds and roots.",
    "Trim any browning fronds at the base — they won't green back up.", null,
    ["Keep soil consistently moist — this one doesn't like to dry out", "Mist often or run a humidifier nearby", "A bathroom with a bright window is often the happiest spot"],
    ["Don't let it dry out — fronds crisp up quickly and permanently", "Don't place near a heating vent or drafty window"]),
];

function s(common_name, scientific_name, illustration_key, difficulty, light,
  water_days_summer, water_days_winter, humidity, soil_recommendation,
  rotate_days, repot_months, toxicity, propagation, pruning, harvesting,
  dos, donts, harvest_days = null) {
  return {
    common_name, scientific_name, illustration_key, difficulty, light,
    water_days_summer, water_days_winter, humidity, soil_recommendation,
    rotate_days, repot_months, toxicity, propagation, pruning, harvesting,
    harvest_days, dos, donts, source: "seed",
  };
}

const { data, error } = await supabase
  .from("species_care")
  .upsert(species, { onConflict: "scientific_name", ignoreDuplicates: true })
  .select("id");

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`Seeded/verified ${species.length} species (${data?.length ?? 0} inserted this run).`);

const { count } = await supabase
  .from("species_care")
  .select("*", { count: "exact", head: true });
console.log(`species_care now has ${count} total row(s).`);
