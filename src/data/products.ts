import drill from "@/assets/product-drill-cordless.jpg";
import pump from "@/assets/product-water-pump.jpg";
import grinder from "@/assets/product-angle-grinder.jpg";
import impact from "@/assets/product-impact-driver.jpg";
import electricDrill from "@/assets/product-electric-drill.jpg";
import cutting from "@/assets/product-cutting-machine.jpg";
import heatGun from "@/assets/product-heat-gun.jpg";
import welding from "@/assets/product-welding-machine.jpg";
import compressor from "@/assets/product-air-compressor.jpg";
import handTools from "@/assets/product-hand-tools.jpg";

/**
 * Static catalogue. Swap this module for API/database calls later —
 * the rest of the app only depends on these types and helper functions.
 */

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  spec: string;
  description: string;
  brand: string;
  category: string; // category slug
  type: "Cordless" | "Corded" | "Machine" | "Manual";
  price: number;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockLabel?: string;
  badges: string[];
  images: string[];
  features: string[];
  specs: { label: string; value: string }[];
};

export const categories: Category[] = [
  {
    slug: "drill-machines",
    name: "Drill Machines",
    description: "Cordless and corded drills for wood, metal and masonry.",
    image: drill,
  },
  {
    slug: "water-pumps",
    name: "Water Pumps",
    description: "Domestic and high-pressure pumps built for daily duty.",
    image: pump,
  },
  {
    slug: "angle-grinders",
    name: "Angle Grinders",
    description: "Grinding, cutting and polishing with pure torque.",
    image: grinder,
  },
  {
    slug: "cutting-tools",
    name: "Cutting Tools",
    description: "Chop saws, cut-off machines and precision blades.",
    image: cutting,
  },
  {
    slug: "impact-tools",
    name: "Impact Tools",
    description: "Impact drivers and wrenches for high-torque fastening.",
    image: impact,
  },
  {
    slug: "welding-machines",
    name: "Welding Machines",
    description: "Inverter welders with stable arc performance.",
    image: welding,
  },
  {
    slug: "air-compressors",
    name: "Air Compressors",
    description: "Portable and workshop compressors for pneumatic work.",
    image: compressor,
  },
  {
    slug: "hand-tools",
    name: "Hand Tools",
    description: "Wrenches, pliers and drivers with hardened finishes.",
    image: handTools,
  },
  {
    slug: "other-power-tools",
    name: "Other Power Tools",
    description: "Heat guns, blowers and workshop essentials.",
    image: heatGun,
  },
];

export const products: Product[] = [
  {
    id: "tnt-001",
    slug: "tnt-cordless-drill-machine-21v",
    name: "TNT Cordless Drill Machine 21V",
    spec: "21V brushless · 2 × 2.0Ah batteries · 45Nm torque",
    description:
      "A brushless 21V drill driver built for continuous site work. Two lithium-ion packs, a 13mm keyless chuck and 25 torque settings make it equally at home in wood, steel and light masonry.",
    brand: "TNT Pro",
    category: "drill-machines",
    type: "Cordless",
    price: 14500,
    oldPrice: 18900,
    rating: 4.8,
    reviewCount: 214,
    inStock: true,
    badges: ["Best Seller"],
    images: [drill, impact, electricDrill],
    features: [
      "Brushless motor for longer runtime and life",
      "25+1 torque settings with two-speed gearbox",
      "13mm keyless metal chuck",
      "LED work light and belt clip",
    ],
    specs: [
      { label: "Voltage", value: "21V" },
      { label: "Max torque", value: "45 Nm" },
      { label: "Chuck", value: "13 mm keyless" },
      { label: "No-load speed", value: "0–450 / 0–1650 rpm" },
      { label: "Battery", value: "2 × 2.0Ah Li-ion" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-002",
    slug: "heavy-duty-water-pump-1hp",
    name: "Heavy Duty Water Pump 1HP",
    spec: "1HP copper winding · 750W · 35m head",
    description:
      "A full-copper 1HP self-priming pump for homes, farms and small workshops. Cast-iron housing and thermal overload protection keep it running through long duty cycles.",
    brand: "TNT Industrial",
    category: "water-pumps",
    type: "Machine",
    price: 21900,
    oldPrice: 25500,
    rating: 4.6,
    reviewCount: 132,
    inStock: true,
    badges: ["Popular"],
    images: [pump, compressor, welding],
    features: [
      "100% copper winding motor",
      "Cast-iron body with anti-rust coating",
      "Thermal overload protection",
      "Self-priming up to 8 metres",
    ],
    specs: [
      { label: "Power", value: "1 HP / 750W" },
      { label: "Max head", value: "35 m" },
      { label: "Flow rate", value: "40 L/min" },
      { label: "Inlet / outlet", value: "1 inch" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-003",
    slug: "professional-angle-grinder-850w",
    name: "Professional Angle Grinder 850W",
    spec: "850W · 115mm disc · 11,000 rpm",
    description:
      "A compact 850W grinder with a slim body grip, tool-free guard adjustment and restart protection — built for cutting, grinding and surface prep all day.",
    brand: "TNT Pro",
    category: "angle-grinders",
    type: "Corded",
    price: 8900,
    oldPrice: 11200,
    rating: 4.7,
    reviewCount: 178,
    inStock: true,
    badges: ["Limited Stock"],
    stockLabel: "Only 6 left",
    images: [grinder, cutting, handTools],
    features: [
      "Tool-free guard adjustment",
      "Anti-restart protection",
      "Slim grip for better control",
      "Side handle mounts in 3 positions",
    ],
    specs: [
      { label: "Power", value: "850 W" },
      { label: "Disc size", value: "115 mm" },
      { label: "No-load speed", value: "11,000 rpm" },
      { label: "Spindle", value: "M14" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-004",
    slug: "cordless-impact-driver",
    name: "Cordless Impact Driver 18V",
    spec: "18V · 180Nm · 1/4in hex quick-change",
    description:
      "High-torque impact driver for decking, framing and heavy fastening. Three-speed control and a quick-change hex chuck keep the workflow fast.",
    brand: "TNT Pro",
    category: "impact-tools",
    type: "Cordless",
    price: 16750,
    rating: 4.9,
    reviewCount: 96,
    inStock: true,
    badges: ["Best Seller"],
    images: [impact, drill, handTools],
    features: [
      "180 Nm of fastening torque",
      "Three-speed electronic control",
      "1/4in hex quick-change chuck",
      "Rubber overmould for grip and shock",
    ],
    specs: [
      { label: "Voltage", value: "18V" },
      { label: "Max torque", value: "180 Nm" },
      { label: "Impact rate", value: "0–3,600 ipm" },
      { label: "Weight", value: "1.4 kg" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-005",
    slug: "heavy-duty-electric-drill",
    name: "Heavy Duty Electric Drill 810W",
    spec: "810W corded · reversible · 13mm chuck",
    description:
      "A corded workhorse with variable speed, forward/reverse and a metal gear housing. Ideal for repetitive drilling where battery life is a bottleneck.",
    brand: "TNT Industrial",
    category: "drill-machines",
    type: "Corded",
    price: 9750,
    oldPrice: 12400,
    rating: 4.5,
    reviewCount: 141,
    inStock: true,
    badges: [],
    images: [electricDrill, drill, cutting],
    features: [
      "810W high-output motor",
      "Metal gear housing for heat dissipation",
      "Variable speed trigger with lock",
      "Forward / reverse rotation",
    ],
    specs: [
      { label: "Power", value: "810 W" },
      { label: "Chuck", value: "13 mm" },
      { label: "No-load speed", value: "0–3,000 rpm" },
      { label: "Cable", value: "2 m" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-006",
    slug: "high-pressure-water-pump",
    name: "High Pressure Water Pump 1.5HP",
    spec: "1.5HP · 1100W · 50m head · booster ready",
    description:
      "A booster-ready high-pressure pump for multi-storey supply, washing and irrigation. Stainless impeller and heavy cast body for long service life.",
    brand: "TNT Industrial",
    category: "water-pumps",
    type: "Machine",
    price: 32500,
    oldPrice: 38900,
    rating: 4.7,
    reviewCount: 88,
    inStock: true,
    badges: ["Popular"],
    images: [pump, welding, compressor],
    features: [
      "Stainless steel impeller",
      "50 m maximum head",
      "Booster and irrigation ready",
      "Low-noise capacitor start",
    ],
    specs: [
      { label: "Power", value: "1.5 HP / 1100W" },
      { label: "Max head", value: "50 m" },
      { label: "Flow rate", value: "60 L/min" },
      { label: "Inlet / outlet", value: "1 inch" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-007",
    slug: "cutting-machine-355mm",
    name: "Cutting Machine 355mm",
    spec: "2200W · 355mm blade · metal chop saw",
    description:
      "A 2200W metal cut-off saw with a quick-lock vice and adjustable fence for repeat angle cuts. Spark deflector and heavy base keep the cut clean and steady.",
    brand: "TNT Industrial",
    category: "cutting-tools",
    type: "Machine",
    price: 27400,
    rating: 4.6,
    reviewCount: 74,
    inStock: true,
    badges: ["Limited Stock"],
    stockLabel: "Only 4 left",
    images: [cutting, grinder, welding],
    features: [
      "2200W induction-grade motor",
      "Quick-lock vice with adjustable fence",
      "0–45° mitre cutting",
      "Spark deflector and safety guard",
    ],
    specs: [
      { label: "Power", value: "2200 W" },
      { label: "Blade", value: "355 mm" },
      { label: "No-load speed", value: "3,900 rpm" },
      { label: "Cut capacity", value: "115 mm round" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-008",
    slug: "industrial-heat-gun",
    name: "Industrial Heat Gun 2000W",
    spec: "2000W · 60–600°C · dual airflow",
    description:
      "Dual-airflow heat gun with a wide temperature range for shrink wrap, paint stripping, pipe bending and thawing. Comes with four nozzle attachments.",
    brand: "TNT Pro",
    category: "other-power-tools",
    type: "Corded",
    price: 6450,
    oldPrice: 7900,
    rating: 4.4,
    reviewCount: 63,
    inStock: false,
    stockLabel: "Out of stock",
    badges: [],
    images: [heatGun, handTools, grinder],
    features: [
      "60–600°C adjustable temperature",
      "Two airflow settings",
      "Four nozzle attachments included",
      "Overheat cut-off protection",
    ],
    specs: [
      { label: "Power", value: "2000 W" },
      { label: "Temperature", value: "60–600 °C" },
      { label: "Airflow", value: "300 / 500 L/min" },
      { label: "Weight", value: "0.8 kg" },
      { label: "Warranty", value: "6 months" },
    ],
  },
  {
    id: "tnt-009",
    slug: "inverter-welding-machine-200a",
    name: "Inverter Welding Machine 200A",
    spec: "200A MMA · IGBT inverter · hot start",
    description:
      "A light, stable IGBT inverter welder with hot start and anti-stick. Handles 2.5–4.0mm electrodes on standard site power.",
    brand: "TNT Industrial",
    category: "welding-machines",
    type: "Machine",
    price: 24900,
    oldPrice: 29500,
    rating: 4.6,
    reviewCount: 57,
    inStock: true,
    badges: ["Popular"],
    images: [welding, compressor, cutting],
    features: [
      "IGBT inverter technology",
      "Hot start and anti-stick",
      "Handles 2.5–4.0 mm electrodes",
      "Lightweight portable body",
    ],
    specs: [
      { label: "Current range", value: "20–200 A" },
      { label: "Duty cycle", value: "60% @ 160A" },
      { label: "Input", value: "220V / 50Hz" },
      { label: "Weight", value: "5.2 kg" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-010",
    slug: "portable-air-compressor-50l",
    name: "Portable Air Compressor 50L",
    spec: "2HP · 50L tank · 8 bar",
    description:
      "A 50-litre workshop compressor for spraying, inflation and pneumatic tools. Twin gauges, pressure regulator and heavy castors.",
    brand: "TNT Industrial",
    category: "air-compressors",
    type: "Machine",
    price: 48900,
    rating: 4.5,
    reviewCount: 41,
    inStock: true,
    badges: [],
    images: [compressor, pump, welding],
    features: [
      "50 L receiver tank",
      "8 bar working pressure",
      "Twin gauges with regulator",
      "Heavy-duty castors and handle",
    ],
    specs: [
      { label: "Motor", value: "2 HP" },
      { label: "Tank", value: "50 L" },
      { label: "Max pressure", value: "8 bar" },
      { label: "Air delivery", value: "180 L/min" },
      { label: "Warranty", value: "12 months" },
    ],
  },
  {
    id: "tnt-011",
    slug: "professional-hand-tool-set-42pc",
    name: "Professional Hand Tool Set 42pc",
    spec: "Chrome vanadium · 42 pieces · case included",
    description:
      "A 42-piece chrome vanadium set covering wrenches, pliers, drivers and sockets — the everyday kit for technicians and maintenance teams.",
    brand: "TNT Pro",
    category: "hand-tools",
    type: "Manual",
    price: 11900,
    oldPrice: 14500,
    rating: 4.7,
    reviewCount: 165,
    inStock: true,
    badges: ["Best Seller"],
    images: [handTools, heatGun, drill],
    features: [
      "Chrome vanadium steel construction",
      "Anti-slip dual-material grips",
      "Blow-moulded carry case",
      "42 pieces covering daily tasks",
    ],
    specs: [
      { label: "Pieces", value: "42" },
      { label: "Material", value: "Chrome vanadium" },
      { label: "Case", value: "Included" },
      { label: "Warranty", value: "Lifetime on hand tools" },
    ],
  },
  {
    id: "tnt-012",
    slug: "compact-cordless-grinder-20v",
    name: "Compact Cordless Grinder 20V",
    spec: "20V · 100mm disc · brushless",
    description:
      "A cordless brushless grinder for cutting rebar, tile and steel where cables get in the way. Paddle switch with kickback brake.",
    brand: "TNT Pro",
    category: "angle-grinders",
    type: "Cordless",
    price: 18900,
    oldPrice: 22400,
    rating: 4.5,
    reviewCount: 52,
    inStock: true,
    badges: ["Popular"],
    images: [grinder, impact, cutting],
    features: [
      "Brushless motor",
      "Paddle switch with kickback brake",
      "100 mm disc",
      "Battery platform shared with TNT 20V tools",
    ],
    specs: [
      { label: "Voltage", value: "20V" },
      { label: "Disc size", value: "100 mm" },
      { label: "No-load speed", value: "8,500 rpm" },
      { label: "Weight", value: "2.1 kg" },
      { label: "Warranty", value: "12 months" },
    ],
  },
];

export const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
export const productTypes = Array.from(new Set(products.map((p) => p.type))).sort();
export const maxPrice = Math.max(...products.map((p) => p.price));

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getRelated(product: Product, limit = 4) {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, limit);
}

export function formatPrice(value: number) {
  return `Rs ${value.toLocaleString("en-PK")}`;
}

export function discountPercent(product: Product) {
  if (!product.oldPrice) return 0;
  return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
}
