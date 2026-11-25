import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  ScanLine,
  Sprout,
  History,
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Camera,
  X,
  Trash2,
  Search,
  Download,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Scissors,
  Droplets,
  ChevronDown,
  Lock,
  LogOut,
  CalendarDays,
  User as UserIcon,
  Flame,
  Bug,
  Info,
  Clock,
  ExternalLink
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import api, { setTokenProvider } from "./services/api.js";
import {
  saveUserScan,
  getUserScans,
  deleteUserScan
} from "./services/firestoreService.js";
import AuthModal from "./components/AuthModal.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LeafStage3D from "./components/LeafStage3D.jsx";
import Intro3DPreloader from "./components/Intro3DPreloader.jsx";

const monogramUrl = '/assets/449677f1a9ee15da-image_20261122_185002.webp';
const heroUrl = '/assets/57b82f0761bbaa6e-image_20261122_185002_1.webp';
const heroLeafUrl = '/assets/767e25ed6dbe382e-image_20261122_190128.webp';
const monographUrl = '/assets/3acd8e98dd5fd5b6-image_20261122_184954.webp';
const loaderUrl = '/assets/02790935305e5c59-image_20261122_184957.webp';

/* ---------- Crops & Stages ---------- */
const CROPS = ["Tomato", "Potato", "Corn", "Apple", "Grape", "Rice", "Wheat", "Pepper"];
const STAGES = ["Seedling", "Vegetative", "Flowering", "Mature"];

/* ---------- Rich Sample Leaves for Interactive Preview ---------- */
const SAMPLE_LEAVES = [
  {
    id: "sample-tomato",
    crop: "Tomato",
    condition: "Early Blight",
    scientific: "Alternaria solani",
    severity: "Moderate Action",
    severityType: "warning", // 'warning' | 'urgent' | 'healthy'
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    symptomSummary: "Concentric brown bullseye lesions starting on lowest mature foliage with surrounding chlorotic halo.",
    cureLine: "Prune bottom 30cm of leaves, apply copper hydroxide spray, and mulch soil bed.",
    futureAlert: {
      title: "High Spore Dispersion Warning",
      text: "Warm temperatures (24–29°C) combined with morning dew will cause rapid upward spread within 72 hours. Isolate plot irrigation immediately.",
      riskLevel: "High Risk within 48–72h"
    },
    curePlan: {
      immediate: "Sterilize pruning shears with 70% alcohol and clip all symptomatic leaves touching the soil.",
      organic: "Spray cold-pressed neem oil (5 ml/L) mixed with potassium bicarbonate every 5 days in early morning.",
      targeted: "Apply chlorothalonil or copper fungicide spray at the first sign of secondary spots on mid-tier stems.",
      soil: "Lay clean straw mulch around stems to halt soil splashback, and switch entirely to drip irrigation."
    }
  },
  {
    id: "sample-potato",
    crop: "Potato",
    condition: "Late Blight",
    scientific: "Phytophthora infestans",
    severity: "Immediate Action Needed",
    severityType: "urgent",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    symptomSummary: "Dark water-soaked lesions with white powdery sporulation visible on the leaf underside under moist conditions.",
    cureLine: "Immediately isolate infected plants, cease all overhead watering, and apply targeted metalaxyl-M.",
    futureAlert: {
      title: "Severe Tubercular Epidemic Alert",
      text: "Late blight zoospores travel rapidly via wind and water splashes. Without immediate copper intervention, 90% of adjacent rows can perish within 5 days.",
      riskLevel: "Critical Outbreak Condition"
    },
    curePlan: {
      immediate: "Bag and incinerate heavily collapsed foliage immediately. Never add blighted matter to compost piles.",
      organic: "Apply systemic Bacillus subtilis biological spray plus copper soap treatment at 7-day intervals.",
      targeted: "Spray systemic translaminar fungicide (Cymoxanil + Mancozeb) covering both top and bottom leaf blades.",
      soil: "Hill soil deeply over potato tubers to prevent downward spore runoff into developing potatoes."
    }
  },
  {
    id: "sample-grape",
    crop: "Grape",
    condition: "Healthy Foliage",
    scientific: "No pathogen detected",
    severity: "Routine Care",
    severityType: "healthy",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    symptomSummary: "Crisp vein integrity, uniform chlorophyll pigmentation, and resilient margins with zero parasitic lesions.",
    cureLine: "Maintain canopy aeration and schedule regular preventative leaf surface monitoring.",
    futureAlert: {
      title: "Favorable Growing Conditions",
      text: "Canopy aeration and leaf surface moisture levels are currently optimal. No fungal pathogen risks detected.",
      riskLevel: "Low Risk — Maintain Monitoring"
    },
    curePlan: {
      immediate: "Maintain current canopy airflow and continue standard shoot positioning.",
      organic: "Apply compost tea foliar spray monthly to stimulate beneficial phyllosphere microbes.",
      targeted: "No chemical fungicides required. Preserve natural leaf beneficial biome.",
      soil: "Ensure balanced nitrogen-potassium levels to prevent tender overgrowth susceptible to powdery mildew."
    }
  }
];

/* ---------- Interactive Diagnostic Leaf Hotspots ---------- */
const LEAF_HOTSPOTS = [
  {
    id: "margin",
    x: "28%",
    y: "32%",
    title: "Leaf Margin",
    note: "Necrotic edge tissue indicates fungal lesion advancement or localized moisture stress."
  },
  {
    id: "vein",
    x: "54%",
    y: "50%",
    title: "Vein Architecture",
    note: "Main vascular channels show clear sap transport with no signs of systemic bacterial clogging."
  },
  {
    id: "spot",
    x: "72%",
    y: "40%",
    title: "Surface Spotting",
    note: "Early concentric ring formation typical of fungal spore colonization following dew exposure."
  }
];

/* ---------- Diagnosis Seed Data & Diagnosis Dictionary ---------- */
const DIAG = {
  Tomato: {
    disease: "Early Blight",
    scientific: "Alternaria solani",
    urgency: "Moderate Action",
    contagious: false,
    summary: "Concentric circular lesions with prominent yellow margins, predominantly concentrated on older mature foliage.",
    futureAlert: "Warm temperatures (24–29°C) combined with high humidity will accelerate spore generation upward to healthy fruits.",
    cure: {
      pesticide: "Apply chlorothalonil or copper-based protectant fungicide every 7–10 days during warm humid weather.",
      organic: "Mix cold-pressed neem oil (5 ml/L) with mild horticultural soap. Apply at dawn or dusk.",
      pruning: "Prune all bottom leaves within 25 cm of the soil. Sanitize shears between cuts.",
      watering: "Water strictly at the soil base. Install drip irrigation to avoid leaf moisture."
    }
  },
  Potato: {
    disease: "Late Blight",
    scientific: "Phytophthora infestans",
    urgency: "Immediate Action Needed",
    contagious: true,
    summary: "Water-soaked dark lesions spreading rapidly across foliage with white mildew on leaf undersides in damp weather.",
    futureAlert: "Critical epidemic risk: Airborne sporangia can spread across entire plots within 48 hours under cool wet spells.",
    cure: {
      pesticide: "Apply translaminar or systemic fungicide (Metalaxyl or Cymoxanil combined with Mancozeb) without delay.",
      organic: "Spray copper sulfate or Bacillus subtilis solution immediately after detecting initial water-soaked blotches.",
      pruning: "Cut and carefully bag heavily blighted vines. Destroy all infected tissue; do not compost.",
      watering: "Cease overhead sprinkling. Allow soil surface to dry thoroughly before careful furrow watering."
    }
  },
  Corn: {
    disease: "Northern Leaf Blight",
    scientific: "Exserohilum turcicum",
    urgency: "Moderate Action",
    contagious: false,
    summary: "Long elliptical cigar-shaped lesions running parallel along leaf veins, turning tan with grayish spore centers.",
    futureAlert: "Secondary infections will lower photosynthetic capacity during the silking stage if rainy periods persist.",
    cure: {
      pesticide: "Apply strobilurin or triazole fungicides if lesions appear on the ear leaf before tassel emergence.",
      organic: "Use resistant crop varieties and spray bio-fungicide formulations containing Trichoderma harzianum.",
      pruning: "Remove heavily infected lower leaf blades after pollination to boost airflow.",
      watering: "Ensure adequate plot drainage and practice a 2-year crop rotation with non-host legumes."
    }
  },
  Apple: {
    disease: "Apple Scab",
    scientific: "Venturia inaequalis",
    urgency: "Moderate Action",
    contagious: false,
    summary: "Olive-green to dark velvety circular spots on leaf surfaces and young fruit, causing early leaf drop.",
    futureAlert: "Ascospores release during springtime rainfalls; unprotected leaves risk high infection within 9 hours of wetness.",
    cure: {
      pesticide: "Apply captan, mancozeb, or myclobutanil beginning at tight cluster stage through petal fall.",
      organic: "Spray sulfur or liquid lime-sulfur early in the morning before anticipated wet periods.",
      pruning: "Prune the tree canopy to an open vase or central leader structure to speed up leaf drying.",
      watering: "Rake and compost or shred fallen leaf litter in autumn to deplete overwintering fungus reserves."
    }
  },
  Grape: {
    disease: "Healthy Canopy",
    scientific: "No pathogen detected",
    urgency: "Routine Care",
    contagious: false,
    summary: "Vein structure is fully intact, chlorophyll pigmentation is even, and no fungal lesions were identified.",
    futureAlert: "Current canopy airflow and humidity parameters are ideal. Continue preventive scouting twice weekly.",
    cure: {
      pesticide: "No chemical application required. Preserve beneficial insect and microbial populations.",
      organic: "Apply dilute seaweed extract foliar spray every 14 days to enhance systemic plant vigor.",
      pruning: "Perform canopy shoot positioning and selective leaf pulling around grape clusters for optimal sunlight.",
      watering: "Maintain regulated deficit irrigation to stimulate root strength without inducing foliage stress."
    }
  },
  Rice: {
    disease: "Bacterial Leaf Blight",
    scientific: "Xanthomonas oryzae",
    urgency: "Immediate Action Needed",
    contagious: true,
    summary: "Yellow-white wavy lesions advancing downward from leaf tips, exuding milky bacterial beads in early mornings.",
    futureAlert: "Heavy storm winds and irrigation runoff will easily transmit bacteria to neighboring paddy plots.",
    cure: {
      pesticide: "Apply copper bactericide or bronopol spray following high wind or flooding events.",
      organic: "Drain field standing water for 3 days to lower humidity and apply bleaching powder at water inlets.",
      pruning: "Clip diseased leaf tips only if practical; disinfect footwear and equipment between flooded paddies.",
      watering: "Avoid excess nitrogen fertilizer which creates succulent, vulnerable leaf tissue."
    }
  },
  Wheat: {
    disease: "Leaf Rust",
    scientific: "Puccinia triticina",
    urgency: "Moderate Action",
    contagious: false,
    summary: "Small, round, orange-brown pustules randomly scattered across upper leaf blades containing powdery urediniospores.",
    futureAlert: "Warm days (20–25°C) with persistent night dew trigger rapid rust spore cycles every 7–10 days.",
    cure: {
      pesticide: "Apply propiconazole or tebuconazole foliar spray when rust reaches the upper three leaves.",
      organic: "Select rust-resistant certified cultivars and apply protective sulfur dust at boot stage.",
      pruning: "Not applicable for broad-acre wheat; eliminate volunteer wheat seedlings between crop cycles.",
      watering: "Manage soil potassium to strengthen cell walls against fungal penetration."
    }
  },
  Pepper: {
    disease: "Bacterial Spot",
    scientific: "Xanthomonas campestris",
    urgency: "Moderate Action",
    contagious: false,
    summary: "Raised, dark, water-soaked spots with distinct yellow chlorotic halos on foliage and blistered fruit patches.",
    futureAlert: "Splashing rains in temperatures above 28°C will cause leaf defoliation, exposing fruit to sunscald.",
    cure: {
      pesticide: "Apply fixed copper bactericide mixed with mancozeb for improved bacterial suppression.",
      organic: "Treat seeds with hot water prior to sowing and spray copper octanoate at transplanting.",
      pruning: "Remove heavily spotted seedlings before field planting. Discard diseased fruit immediately.",
      watering: "Install plastic mulch and avoid touching or working in pepper rows while leaves remain wet."
    }
  }
};

const SEED = [
  { id: "demo-1", crop: "Tomato", field: "North Plot — A2", disease: "Early Blight", urgency: "Moderate Action", cure: "Copper spray + bottom pruning", date: "Nov 19, 2026", stage: "Flowering", source: "demo" },
  { id: "demo-2", crop: "Potato", field: "East Field — B1", disease: "Late Blight", urgency: "Immediate Action Needed", cure: "Isolation + systemic fungicide", date: "Nov 18, 2026", stage: "Vegetative", source: "demo" },
  { id: "demo-3", crop: "Wheat", field: "West Field — C3", disease: "Leaf Rust", urgency: "Moderate Action", cure: "Propiconazole treatment", date: "Nov 16, 2026", stage: "Mature", source: "demo" },
  { id: "demo-4", crop: "Grape", field: "Vine Row — D4", disease: "Healthy Canopy", urgency: "Routine Care", cure: "Routine monitoring + shoot positioning", date: "Nov 15, 2026", stage: "Flowering", source: "demo" },
  { id: "demo-5", crop: "Rice", field: "Paddy — E2", disease: "Bacterial Leaf Blight", urgency: "Immediate Action Needed", cure: "Paddy drainage + copper bactericide", date: "Nov 13, 2026", stage: "Vegetative", source: "demo" },
  { id: "demo-6", crop: "Tomato", field: "North Plot — A2", disease: "Early Blight", urgency: "Moderate Action", cure: "Organic neem oil + sanitation", date: "Nov 10, 2026", stage: "Flowering", source: "demo" },
];

const READOUTS = ["Analyzing vein architecture…", "Mapping lesion boundaries…", "Evaluating pathogen risks…", "Synthesizing 4-part cure plan…"];

function urgencyBadge(u) {
  if (u === "Routine Care" || u === "Monitor Only" || u === "Healthy") {
    return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Healthy / Routine Care", dot: "bg-emerald-500" };
  }
  if (u === "Moderate Action") {
    return { bg: "bg-amber-50 text-amber-800 border-amber-200", label: "Moderate Action", dot: "bg-amber-500" };
  }
  return { bg: "bg-rose-50 text-rose-800 border-rose-200", label: "Immediate Action Needed", dot: "bg-rose-500" };
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function App() {
  const { user: authUser, logout, getIdToken } = useAuth();

  const [view, setView] = useState("landing");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [savedEntries, setSavedEntries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* Interactive Showcase & Sample Preview States */
  const [activeHotspot, setActiveHotspot] = useState(LEAF_HOTSPOTS[0]);
  const [selectedSample, setSelectedSample] = useState(SAMPLE_LEAVES[0]);

  /* Diagnose state */
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [crop, setCrop] = useState("");
  const [field, setField] = useState("North Plot — A2");
  const [stage, setStage] = useState("Flowering");
  const [scanning, setScanning] = useState(false);
  const [readout, setReadout] = useState(0);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState(0);
  const [isolated, setIsolated] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  /* History controls */
  const [query, setQuery] = useState("");
  const [cropFilter, setCropFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [focusGroup, setFocusGroup] = useState("");

  // Wire token provider for API calls
  useEffect(() => {
    setTokenProvider(getIdToken);
  }, [getIdToken]);

  // Load user's personal history from Cloud Firestore
  const reloadRecords = async () => {
    if (!authUser) {
      setSavedEntries([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const records = await getUserScans(authUser.uid);
      setSavedEntries(records);
    } catch (e) {
      console.warn("Could not load scans from Firestore:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      reloadRecords();
    } else {
      setSavedEntries([]);
    }
  }, [authUser]);

  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(() => setReadout((r) => (r + 1) % READOUTS.length), 400);
    return () => clearInterval(t);
  }, [scanning]);

  const allEntries = useMemo(() => {
    if (savedEntries.length > 0) return savedEntries;
    return authUser ? [] : SEED;
  }, [savedEntries, authUser]);

  const groups = useMemo(() => {
    const m = new Map();
    allEntries.forEach((e) => {
      const k = `${e.crop} in ${e.field}`;
      m.set(k, [...(m.get(k) || []), e]);
    });
    return [...m.entries()].filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
  }, [allEntries]);
  const topGroup = groups[0];

  const filtered = useMemo(() => {
    let list = allEntries.filter((e) => {
      const q = query.toLowerCase();
      return (
        (!q || (e.disease + " " + e.crop + " " + e.field).toLowerCase().includes(q)) &&
        (cropFilter === "All" || e.crop === cropFilter) &&
        (urgencyFilter === "All" || e.urgency === urgencyFilter) &&
        (!focusGroup || `${e.crop} in ${e.field}` === focusGroup)
      );
    });
    return list;
  }, [allEntries, query, cropFilter, urgencyFilter, sort, focusGroup]);

  function go(v) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setSaveMsg("");
  }

  function runDiagnosis() {
    if (!file || !crop) return;
    setScanning(true);
    setResult(null);
    setIsolated(false);
    setSaveMsg("");

    api
      .diagnose(file, crop, field.trim() || "Unnamed Plot", stage)
      .then((res) => {
        setScanning(false);
        if (res.success && res.data) {
          const d = res.data;
          setResult({
            disease: d.diseaseName,
            scientific: d.scientificName || DIAG[crop]?.scientific || "Identified Plant Pathogen",
            urgency:
              d.urgency === "moderate"
                ? "Moderate Action"
                : d.urgency === "high" || d.urgency === "Immediate Action"
                ? "Immediate Action Needed"
                : "Routine Care",
            contagious: d.contagious || false,
            summary: d.summary || DIAG[crop]?.summary,
            futureAlert: DIAG[crop]?.futureAlert || "Scout surrounding rows twice weekly to intercept early spore migration.",
            _cure: d.cure || DIAG[crop]?.cure,
            _backendId: d.id
          });
        } else {
          setResult(DIAG[crop]);
        }
        setTab(0);
      })
      .catch(() => {
        setScanning(false);
        setResult(DIAG[crop]);
        setTab(0);
      });
  }

  async function saveToHistory() {
    if (!result || !crop) return;
    if (!authUser) {
      setAuthModalOpen(true);
      return;
    }
    setBusy(true);
    setSaveMsg("");

    const scanData = {
      id: `scan-${Date.now()}`,
      userId: authUser.uid,
      userEmail: authUser.email || "",
      crop,
      field: field.trim() || "Unnamed Plot",
      disease: result.disease,
      scientific: result.scientific || "",
      urgency: result.urgency,
      cure:
        tab === 0
          ? "Targeted chemical treatment"
          : tab === 1
          ? "Organic foliar treatment"
          : tab === 2
          ? "Canopy pruning & disposal"
          : "Soil & moisture regulation",
      futureAlert: result.futureAlert || "",
      date: todayLabel(),
      stage,
      summary: result.summary || ""
    };

    try {
      await saveUserScan(authUser.uid, scanData);
      setSaveMsg("Diagnosis report saved securely to your private account.");
      await reloadRecords();
    } catch (err) {
      console.error("Firestore save error:", err);
      setSavedEntries((prev) => [scanData, ...prev]);
      setSaveMsg("Saved locally to your session.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(e) {
    if (authUser && e.id) {
      setBusy(true);
      try {
        await deleteUserScan(authUser.uid, e.id);
        setSavedEntries((prev) => prev.filter((x) => x.id !== e.id));
      } catch (err) {
        console.error("Failed to delete from Firestore:", err);
      } finally {
        setBusy(false);
      }
    } else {
      setSavedEntries((prev) => prev.filter((x) => x.id !== e.id));
    }
  }

  function downloadPlan() {
    if (!result) return;
    const text = `FOLIA — CROP HEALTH & TREATMENT REPORT
Crop: ${crop} | Field: ${field} | Growth Stage: ${stage}
Condition: ${result.disease} (${result.scientific})
Urgency Level: ${result.urgency}

OUTBREAK WARNING:
${result.futureAlert || "Maintain routine field scouting to prevent spore progression."}

4-PART CURE PLAN:
1. TARGETED ACTION: ${result._cure?.pesticide || "Apply recommended protective treatment."}
2. ORGANIC ALTERNATIVE: ${result._cure?.organic || "Spray diluted neem solution (5ml/L)."}
3. PRUNING & SANITATION: ${result._cure?.pruning || "Remove symptomatic leaves 2cm below lesions."}
4. SOIL & MOISTURE: ${result._cure?.watering || "Water at base; avoid leaf surface wetness."}

Report generated on ${todayLabel()} by Folia Plant Intelligence.
`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `folia-treatment-plan-${crop.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    {
      icon: FlaskConical,
      label: "Targeted Treatment",
      title: "Protective & Curative Control",
      body: result?._cure?.pesticide || "Apply a protectant fungicide to both leaf surfaces, with complete coverage on the underside where infection often begins. Treat in calm conditions and reapply after heavy rain."
    },
    {
      icon: Leaf,
      label: "Organic Remedy",
      title: "Eco-Friendly Botanical Treatment",
      body: result?._cure?.organic || "Mix cold-pressed neem oil at 5 ml per litre with a few drops of mild liquid soap. Spray in early morning or late evening. Remove heavily infected foliage first so the remedy reaches healthy tissue."
    },
    {
      icon: Scissors,
      label: "Pruning & Sanitation",
      title: "Halt Physical Disease Vectors",
      body: result?._cure?.pruning || "Use clean, sharp shears. Cut 2 cm below visible lesions, disinfect blades between cuts with rubbing alcohol, and seal infected trimmings in bags. Never compost infected plant matter."
    },
    {
      icon: Droplets,
      label: "Soil & Moisture Care",
      title: "Modify Micro-Climate Conditions",
      body: result?._cure?.watering || "Water strictly at soil level in early morning. Improve canopy spacing and add organic straw mulch to stop fungal spores from splashing up from bare soil."
    }
  ];

  return (
    <div
      data-safe-area-inset-root
      style={{
        boxSizing: "border-box",
        paddingTop: "var(--safe-area-inset-top)",
        minHeight: "100vh",
        background: "var(--bg)",
        overflowX: "clip"
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <header
        data-safe-area-sticky-top
        className="sticky z-40 bg-white/95 backdrop-blur-md border-b border-slate-200"
        style={{ top: "var(--safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => go("landing")} className="flex items-center gap-2.5 min-w-0 group" aria-label="Folia home">
            <svg
              className="w-8 h-8 transition-transform group-hover:scale-105"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="foliaLeafGrad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#14532D" />
                  <stop offset="0.5" stopColor="#16A34A" />
                  <stop offset="1" stopColor="#4ADE80" />
                </linearGradient>
                <linearGradient id="foliaAccentGrad" x1="10" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22C55E" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#14532D" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {/* Primary Botanical Leaf Contour */}
              <path
                d="M18 34C18 34 5 28 4 15C3 3 17 2 17 2C17 2 31 3 32 15C33 28 18 34 18 34Z"
                fill="url(#foliaLeafGrad)"
              />
              {/* Overlapping Secondary Leaf Wing */}
              <path
                d="M18 5C22 10 27 15 26 23C25 30 18 33 18 33C18 33 22 26 21 19C20 12 18 5 18 5Z"
                fill="url(#foliaAccentGrad)"
                opacity="0.9"
              />
              {/* Central Vein Line */}
              <path
                d="M18 4V31"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Branching Lateral Veins */}
              <path
                d="M18 12L23 9M18 17L24 14M18 22L23 20M18 13L13 10M18 18L12 15M18 23L13 21"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.65"
              />
            </svg>
            <span className="font-display font-bold text-2xl text-slate-900 tracking-tight leading-none">
              Folia
            </span>
          </button>

          {/* Desktop Nav Links (Clean Title Case, 14-15px medium) */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-600">
            <button
              className={`transition-colors py-1 ${view === "landing" ? "text-[#14532D] font-semibold border-b-2 border-[#14532D]" : "hover:text-slate-900"}`}
              onClick={() => go("landing")}
            >
              Overview
            </button>
            <button
              className={`transition-colors py-1 ${view === "diagnose" ? "text-[#14532D] font-semibold border-b-2 border-[#14532D]" : "hover:text-slate-900"}`}
              onClick={() => go("diagnose")}
            >
              Diagnose
            </button>
            <button
              className={`transition-colors py-1 ${view === "history" ? "text-[#14532D] font-semibold border-b-2 border-[#14532D]" : "hover:text-slate-900"}`}
              onClick={() => go("history")}
            >
              History
            </button>
          </nav>

          {/* User Account / Auth Actions */}
          <div className="flex items-center gap-3">
            {authUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <UserIcon size={14} className="text-[#14532D]" />
                  <span className="text-xs font-semibold text-slate-800 max-w-[130px] truncate">
                    {authUser.displayName || authUser.email?.split("@")[0] || "Farmer"}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 border border-slate-200 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#14532D] hover:bg-[#166534] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition shadow-sm hover:shadow"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-6 px-4 pb-3 text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
          <button className={view === "landing" ? "text-[#14532D] font-bold" : ""} onClick={() => go("landing")}>Overview</button>
          <button className={view === "diagnose" ? "text-[#14532D] font-bold" : ""} onClick={() => go("diagnose")}>Diagnose</button>
          <button className={view === "history" ? "text-[#14532D] font-bold" : ""} onClick={() => go("history")}>History</button>
        </div>
      </header>

      <main className="pb-16">
        {view === "landing" && (
          <>
            {/* HERO SECTION (Above the Fold) */}
            <section className="bg-white overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-14 sm:pb-16 grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-10">
                {/* Left Column: Heading, Subtitle & Immediate CTAs */}
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-[#14532D] px-3 py-1 rounded-full text-xs font-semibold mb-5">
                    <Sprout size={14} className="text-emerald-600" />
                    <span>Instant AI Leaf Health Analysis</span>
                  </div>

                  {/* Balanced 2-line heading at clamp(2.5rem, 4.2vw, 3.5rem) */}
                  <h1 className="font-display font-bold leading-[1.05] tracking-tight text-slate-900 text-[clamp(2.5rem,4.2vw,3.5rem)]">
                    Read the leaf.<br />
                    <span className="text-[#14532D]">Save the crop.</span>
                  </h1>

                  <p className="max-w-[540px] text-slate-600 text-base sm:text-lg leading-relaxed mt-4">
                    Photograph any diseased crop leaf to identify pathogens instantly, review localized outbreak warnings, and follow a 4-part treatment plan before infections spread.
                  </p>

                  {/* CTAs directly below the subtitle */}
                  <div className="flex flex-wrap items-center gap-3.5 mt-7">
                    <button
                      onClick={() => go("diagnose")}
                      className="bg-[#14532D] hover:bg-[#166534] text-white font-semibold text-base px-7 py-3.5 rounded-full flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all"
                    >
                      <span>Start Diagnosis</span>
                      <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => go("history")}
                      className="border border-slate-300 hover:border-slate-800 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-base px-6 py-3.5 rounded-full transition"
                    >
                      View History
                    </button>
                  </div>

                  {/* Quick Value Points */}
                  <div className="flex flex-wrap items-center gap-6 mt-8 text-xs font-medium text-slate-500 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Zero hardware required</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Immediate 4-part cure plans</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Early outbreak alerts</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Moving 3D Leaf */}
                <div className="relative">
                  <LeafStage3D />
                </div>
              </div>
            </section>
          </>
        )}

        {/* PROTECTED PAGE: DIAGNOSE */}
        {view === "diagnose" && (
          <ProtectedRoute onOpenLogin={() => setAuthModalOpen(true)} fallbackTitle="Leaf Scanner">
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade">
              {/* Refined Header */}
              <div className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-[#14532D] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3">
                  <Sprout size={15} className="text-emerald-600" />
                  <span>Crop Health & Pathology Analysis</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 leading-tight">
                  Leaf Pathology Scanner
                </h1>
                <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                  Upload or capture a sharp photo of any symptomatic crop leaf. Folia analyzes pathogen signs, evaluates environmental spread risks, and synthesizes a structured 4-part treatment strategy.
                </p>
              </div>

              {/* Redesigned 2-Column Workspace */}
              <div className="grid lg:grid-cols-[1.05fr_1.25fr] gap-8 items-start">
                {/* Left Column: Interactive Upload & Crop Specs Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Step 1: Upload Box */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#14532D] text-white flex items-center justify-center text-[10px]">1</span>
                        <span>Foliage Sample Photo</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">JPG, PNG (Daylight photo)</span>
                    </div>

                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />

                    {!preview ? (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="group border-2 border-dashed border-slate-200 hover:border-[#14532D] bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-[#14532D] text-[#14532D] group-hover:text-white flex items-center justify-center shadow-sm transition-colors mb-3">
                          <Upload size={24} />
                        </div>
                        <h4 className="font-display text-base font-bold text-slate-800 group-hover:text-[#14532D] transition-colors">
                          Click to select a leaf image, or drop it here
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                          Center the affected leaf surface with good natural lighting for highest diagnostic precision.
                        </p>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-inner">
                        <img src={preview} alt="Selected crop leaf sample" className="w-full h-full object-cover" />
                        
                        {scanning && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="animate-scan absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_16px_#34D399]" />
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setPreview("");
                            setFile(null);
                            setResult(null);
                          }}
                          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-md transition"
                          title="Remove image"
                        >
                          <X size={16} />
                        </button>

                        {scanning && (
                          <div className="absolute bottom-3 left-3 bg-slate-900/90 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-emerald-800/80 backdrop-blur-sm">
                            {READOUTS[readout]}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auxiliary Image Buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition"
                      >
                        Choose File
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition"
                      >
                        <Camera size={14} />
                        <span>Take Photo</span>
                      </button>
                      {preview && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="text-xs text-slate-500 hover:text-slate-800 ml-auto underline"
                        >
                          Replace image
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Field & Plant Metadata */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#14532D] text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Crop Parameters</span>
                    </span>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="crop">
                          Crop Specie
                        </label>
                        <select
                          id="crop"
                          value={crop}
                          onChange={(e) => setCrop(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#14532D] transition"
                        >
                          <option value="">Select crop…</option>
                          {CROPS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field">
                          Field / Plot Label
                        </label>
                        <input
                          id="field"
                          value={field}
                          onChange={(e) => setField(e.target.value)}
                          placeholder="e.g. Plot B — Row 3"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#14532D] transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Growth Stage
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {STAGES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStage(s)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                              stage === s
                                ? "bg-[#14532D] text-white border-[#14532D] shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Main Action Button */}
                    <button
                      disabled={!file || !crop || scanning}
                      onClick={runDiagnosis}
                      className="w-full mt-2 bg-[#14532D] hover:bg-[#166534] text-white font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
                    >
                      {scanning ? (
                        <span>Analyzing Leaf Morphology…</span>
                      ) : (
                        <>
                          <span>Run Complete Diagnosis</span>
                          <ScanLine size={18} />
                        </>
                      )}
                    </button>
                    {(!file || !crop) && (
                      <p className="text-xs text-slate-400 text-center">
                        Attach a leaf photograph and choose a crop to run the diagnosis.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Clean Diagnosis Results & Treatment Blueprint */}
                <div className="space-y-6">
                  {!result && !scanning ? (
                    <div className="bg-white border border-slate-200/90 rounded-3xl min-h-[500px] flex flex-col items-center justify-center text-center p-8 sm:p-12 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#14532D] flex items-center justify-center mb-4">
                        <Leaf size={32} />
                      </div>
                      <h3 className="font-display text-2xl font-bold text-slate-800">
                        Ready to Diagnose
                      </h3>
                      <p className="text-slate-500 text-sm max-w-sm mt-2 leading-relaxed">
                        Attach a leaf sample and click <strong className="text-slate-700">Run Complete Diagnosis</strong>. Results will synthesize disease classification, environmental outbreak risks, and an immediate 4-step treatment plan.
                      </p>
                    </div>
                  ) : scanning ? (
                    <div className="bg-white border border-slate-200/90 rounded-3xl min-h-[500px] flex flex-col items-center justify-center p-8 sm:p-12 text-center shadow-sm">
                      <div className="w-12 h-12 border-3 border-slate-200 border-t-[#14532D] rounded-full animate-spin mb-4" />
                      <h4 className="font-display text-xl font-bold text-slate-900">{READOUTS[readout]}</h4>
                      <p className="text-xs text-slate-500 mt-2 max-w-xs">
                        Isolating leaf margins, calculating lesion concentricity, and matching pathogen vectors…
                      </p>
                    </div>
                  ) : (
                    result && (
                      <div className="space-y-5 animate-fade">
                        {/* Outbreak Spread Warning Banner */}
                        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-start gap-3">
                            <Flame className="text-amber-700 shrink-0 mt-0.5" size={20} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Outbreak Spread Advisory
                                </h4>
                                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                                  Active Risk
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                                {result.futureAlert || "Warm, humid conditions accelerate fungal spore generation. Keep surrounding rows under strict 48-hour inspection."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Contagious Alert */}
                        {result.contagious && (
                          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-950 shadow-sm">
                            <div className="flex gap-3">
                              <ShieldAlert className="shrink-0 text-rose-600 mt-0.5" size={20} />
                              <div>
                                <h4 className="font-bold text-sm text-slate-900">
                                  High Pathogen Transmissibility — Isolate Immediately
                                </h4>
                                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                                  This pathogen spreads quickly through rain splash and equipment. Remove and bag symptomatic tissue, and halt overhead irrigation.
                                </p>
                                <label className="flex items-center gap-2 mt-3 text-xs font-semibold cursor-pointer text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={isolated}
                                    onChange={(e) => setIsolated(e.target.checked)}
                                    className="w-4 h-4 accent-[#14532D] rounded"
                                  />
                                  <span>I have marked and isolated this affected plot</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Diagnosis Overview Card */}
                        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm">
                          <div className="flex flex-wrap justify-between items-start gap-3">
                            <div>
                              <span className="text-xs font-bold text-[#14532D] uppercase tracking-wider block">
                                {crop} • {field}
                              </span>
                              <h2 className="font-display text-3xl font-bold text-slate-900 mt-1">
                                {result.disease}
                              </h2>
                              <p className="text-xs text-slate-500 italic mt-0.5">{result.scientific}</p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${urgencyBadge(result.urgency).bg}`}>
                              {urgencyBadge(result.urgency).label}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-4">
                            {result.summary}
                          </p>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Stage: <strong className="text-slate-800">{stage}</strong></span>
                            <span>Plot: <strong className="text-slate-800">{field}</strong></span>
                          </div>
                        </div>

                        {/* 4-Part Cure Plan Card */}
                        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
                          <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-slate-50/70">
                            {tabs.map((t, i) => (
                              <button
                                key={t.label}
                                onClick={() => setTab(i)}
                                className={`whitespace-nowrap px-4 py-3.5 text-xs font-semibold transition border-b-2 ${
                                  tab === i
                                    ? "bg-white text-[#14532D] border-[#14532D]"
                                    : "text-slate-600 border-transparent hover:text-slate-900"
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <div className="p-6">
                            <div className="flex items-center gap-2.5 mb-2">
                              {React.createElement(tabs[tab].icon, { size: 18, className: "text-[#14532D]" })}
                              <h4 className="font-display text-lg font-bold text-slate-900">
                                {tabs[tab].title}
                              </h4>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2">
                              {tabs[tab].body}
                            </p>

                            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                              <span className="font-bold text-slate-800 block mb-1">Recommended Schedule:</span>
                              Day 1: Pruning & initial application • Day 3: Monitor lesion margins • Day 7: Secondary protective spray if symptoms persist.
                            </div>
                          </div>
                        </div>

                        {/* Save Confirmation */}
                        {saveMsg && (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <span>{saveMsg}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                          <button
                            disabled={busy}
                            onClick={saveToHistory}
                            className="bg-[#14532D] hover:bg-[#166534] text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-full shadow-sm hover:shadow transition disabled:opacity-50"
                          >
                            {busy ? "Saving to Account…" : "Save to History"}
                          </button>
                          <button
                            onClick={downloadPlan}
                            className="border border-slate-300 hover:border-slate-800 bg-white text-slate-800 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full inline-flex items-center gap-2 transition"
                          >
                            <Download size={15} />
                            <span>Download Plan</span>
                          </button>
                          <button
                            onClick={() => {
                              setResult(null);
                              setPreview("");
                              setFile(null);
                              setCrop("");
                            }}
                            className="px-4 py-3 text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition"
                          >
                            <RotateCcw size={14} />
                            <span>Scan Another Leaf</span>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </ProtectedRoute>
        )}

        {/* PROTECTED PAGE: HISTORY */}
        {view === "history" && (
          <ProtectedRoute onOpenLogin={() => setAuthModalOpen(true)} fallbackTitle="Diagnosis History">
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade">
              <div className="flex flex-wrap justify-between items-end gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-[#14532D] uppercase tracking-wider block mb-1">
                    Treatment Archive
                  </span>
                  <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900">
                    Field Diagnosis Records
                  </h1>
                  <p className="text-slate-600 mt-2 text-sm">
                    Logged in as <strong className="text-slate-900">{authUser?.email}</strong>. Every past scan is cataloged by plot and crop stage.
                  </p>
                </div>
                <button
                  onClick={reloadRecords}
                  disabled={loadingHistory}
                  className="text-xs font-semibold border border-slate-300 hover:border-slate-800 bg-white px-4 py-2 rounded-full transition shadow-sm"
                >
                  {loadingHistory ? "Refreshing Records…" : "Refresh Records"}
                </button>
              </div>

              {/* Recurring Issue Notice */}
              {topGroup && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-3 items-center">
                    <AlertTriangle className="shrink-0 text-amber-600" size={20} />
                    <p className="text-xs sm:text-sm text-slate-800 font-medium">
                      <strong>Recurring Plot Issue:</strong> {topGroup[0]} has recorded {topGroup[1].length} positive detections. Consider crop rotation and soil solarization.
                    </p>
                  </div>
                  <button
                    onClick={() => setFocusGroup(topGroup[0])}
                    className="bg-[#14532D] hover:bg-[#166534] text-white px-4 py-2 rounded-full text-xs font-semibold transition"
                  >
                    Filter to this plot
                  </button>
                </div>
              )}

              {focusGroup && (
                <button onClick={() => setFocusGroup("")} className="mt-3 text-xs text-slate-500 hover:text-slate-800 underline">
                  Clear active plot filter: {focusGroup}
                </button>
              )}

              {/* Search & Filter Bar */}
              <div className="flex flex-col lg:flex-row gap-3 mt-6">
                <label className="flex-1 flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3.5 shadow-sm">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by crop, disease, or plot identifier…"
                    className="w-full bg-transparent py-2.5 outline-none text-xs sm:text-sm text-slate-800"
                  />
                </label>
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm shadow-sm"
                >
                  <option value="All">All Crops</option>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="bg-white text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm shadow-sm"
                >
                  <option value="All">All Urgency Levels</option>
                  <option value="Routine Care">Routine Care</option>
                  <option value="Moderate Action">Moderate Action</option>
                  <option value="Immediate Action Needed">Immediate Action Needed</option>
                </select>
              </div>

              {/* Records List */}
              {loadingHistory ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 mt-6 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-[#14532D] rounded-full animate-spin mb-3" />
                  <span className="text-xs">Loading records…</span>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {filtered.map((e) => (
                    <article key={e.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition">
                      <div className="relative h-[160px] bg-slate-100">
                        <img
                          src={preview && e.source === "saved" ? preview : heroUrl}
                          alt={`${e.crop} leaf condition`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-white/95 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-[11px] font-bold">
                          {e.crop}
                        </span>
                        <button
                          onClick={() => deleteEntry(e)}
                          className="absolute top-3 right-3 bg-white/95 text-slate-600 hover:text-rose-600 border border-slate-200 p-2 rounded-full transition shadow-sm"
                          aria-label={`Delete record for ${e.disease}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-display text-xl font-bold text-slate-900 leading-tight">
                            {e.disease}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{e.field} • Stage: {e.stage}</p>
                        <p className="text-xs text-slate-700 mt-3">
                          <strong className="text-slate-900 font-semibold">Treatment:</strong> {e.cure}
                        </p>
                        <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${urgencyBadge(e.urgency).bg}`}>
                            {e.urgency}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <CalendarDays size={13} />
                            <span>{e.date}</span>
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!loadingHistory && filtered.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 mt-6">
                  <Leaf className="mx-auto text-emerald-600 mb-2" size={32} />
                  <p className="font-display text-lg font-bold text-slate-800">No records found</p>
                  <p className="text-xs mt-1">Start a scan in the leaf scanner to save your first diagnosis record.</p>
                  <button
                    onClick={() => go("diagnose")}
                    className="mt-4 bg-[#14532D] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-[#166534] transition"
                  >
                    Go to Scanner
                  </button>
                </div>
              )}
            </section>
          </ProtectedRoute>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-medium text-slate-500">
            © 2026 Folia
          </p>
        </div>
      </footer>

      {/* FIREBASE AUTH MODAL (Google + Email/Password with Verification) */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
