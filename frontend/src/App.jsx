import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, ScanLine, Sprout, History, ArrowRight, ArrowUpRight, Leaf, Camera, X, Trash2, Search, Download, RotateCcw, ShieldAlert, CheckCircle2, AlertTriangle, FlaskConical, Scissors, Droplets, ChevronDown, Github, Chrome, Lock, CalendarDays } from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import api, { setTokenProvider } from "./services/api.js";

const monogramUrl = '/assets/449677f1a9ee15da-image_20261122_185002.webp';
const heroUrl = '/assets/57b82f0761bbaa6e-image_20261122_185002_1.webp';
const heroLeafUrl = '/assets/767e25ed6dbe382e-image_20261122_190128.webp';
const monographUrl = '/assets/3acd8e98dd5fd5b6-image_20261122_184954.webp';
const loaderUrl = '/assets/02790935305e5c59-image_20261122_184957.webp';

/* ---------- Data ---------- */
const CROPS = ["Tomato","Potato","Corn","Apple","Grape","Rice","Wheat","Pepper"];
const STAGES = ["Seedling","Vegetative","Flowering","Mature"];
const DIAG = {
  Tomato:{ disease:"Early Blight", scientific:"Alternaria solani", confidence:92, urgency:"Moderate Action", contagious:false, summary:"Concentric lesions with yellowing margins, concentrated on older foliage." },
  Potato:{ disease:"Late Blight", scientific:"Phytophthora infestans", confidence:96, urgency:"Immediate Action Needed", contagious:true, summary:"Water-soaked lesions spreading rapidly in cool, wet conditions." },
  Corn:{ disease:"Northern Leaf Blight", scientific:"Exserohilum turcicum", confidence:88, urgency:"Moderate Action", contagious:false, summary:"Long cigar-shaped lesions running parallel to leaf veins." },
  Apple:{ disease:"Apple Scab", scientific:"Venturia inaequalis", confidence:89, urgency:"Moderate Action", contagious:false, summary:"Olive-green to black velvety spots on leaves and developing fruit." },
  Grape:{ disease:"Healthy", scientific:"No pathogen detected", confidence:98, urgency:"Monitor Only", contagious:false, summary:"Vein structure is clear, margins are intact, and no lesion geometry was found." },
  Rice:{ disease:"Bacterial Leaf Blight", scientific:"Xanthomonas oryzae", confidence:91, urgency:"Immediate Action Needed", contagious:true, summary:"Yellow-white striping advancing from leaf tips with wavy margins." },
  Wheat:{ disease:"Leaf Rust", scientific:"Puccinia triticina", confidence:87, urgency:"Moderate Action", contagious:false, summary:"Small orange-brown pustules distributed across the leaf blade." },
  Pepper:{ disease:"Bacterial Spot", scientific:"Xanthomonas campestris", confidence:90, urgency:"Moderate Action", contagious:false, summary:"Raised, water-soaked spots with chlorotic halos on leaves." },
};
const SEED = [
  { id:"demo-1", crop:"Tomato", field:"North Plot — A2", disease:"Early Blight", confidence:92, urgency:"Moderate Action", cure:"Chlorothalonil + pruning", date:"Nov 19, 2026", stage:"Flowering", source:"demo" },
  { id:"demo-2", crop:"Potato", field:"East Field — B1", disease:"Late Blight", confidence:96, urgency:"Immediate Action Needed", cure:"Isolation + copper fungicide", date:"Nov 18, 2026", stage:"Vegetative", source:"demo" },
  { id:"demo-3", crop:"Wheat", field:"West Field — C3", disease:"Leaf Rust", confidence:87, urgency:"Moderate Action", cure:"Propiconazole, Day 1 / 7", date:"Nov 16, 2026", stage:"Mature", source:"demo" },
  { id:"demo-4", crop:"Grape", field:"Vine Row — D4", disease:"Healthy", confidence:98, urgency:"Monitor Only", cure:"Routine monitoring", date:"Nov 15, 2026", stage:"Flowering", source:"demo" },
  { id:"demo-5", crop:"Rice", field:"Paddy — E2", disease:"Bacterial Leaf Blight", confidence:91, urgency:"Immediate Action Needed", cure:"Isolation + copper hydroxide", date:"Nov 13, 2026", stage:"Vegetative", source:"demo" },
  { id:"demo-6", crop:"Tomato", field:"North Plot — A2", disease:"Early Blight", confidence:89, urgency:"Moderate Action", cure:"Organic neem + sanitation", date:"Nov 10, 2026", stage:"Flowering", source:"demo" },
];
const EXAMPLES = [
  { disease:"Early Blight", crop:"Tomato", pct:92, urgency:"Moderate Action", tone:"#B45309", note:"Concentric lesions on lower leaves." },
  { disease:"Late Blight", crop:"Potato", pct:96, urgency:"Immediate Action Needed", tone:"#B91C1C", note:"Rapid spread in wet, cool weather." },
  { disease:"Healthy", crop:"Grape", pct:98, urgency:"Monitor Only", tone:"#047857", note:"No lesion geometry detected." },
];
const READOUTS = ["ANALYZING VEINS…","MAPPING LESIONS…","CLASSIFYING…","CHECKING GROWTH STAGE…"];

/* ---------- Helpers ---------- */
function urgencyColor(u){ return u==="Monitor Only" ? "#10B981" : u==="Moderate Action" ? "#F59E0B" : "#EF4444"; }
function todayLabel(){ return new Date().toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric" }); }

export default function App(){
  const { user: authUser, signInWithGoogle, signInWithGithub, logout, getIdToken, isConfigured: firebaseConfigured } = useAuth();

  const [view,setView] = useState("landing");
  const [preloader,setPreloader] = useState(true);
  const [exiting,setExiting] = useState(false);
  const [progress,setProgress] = useState(0);
  const [loginOpen,setLoginOpen] = useState(false);
  const [previewMode,setPreviewMode] = useState(true);
  const [user,setUser] = useState(null);
  const [authNotice,setAuthNotice] = useState("");
  const [demoEntries,setDemoEntries] = useState(SEED);
  const [savedEntries,setSavedEntries] = useState([]);
  const [apiStatus,setApiStatus] = useState("Checking backend…");
  const [backendAvailable,setBackendAvailable] = useState(false);

  /* Diagnose state */
  const [file,setFile] = useState(null);
  const [preview,setPreview] = useState("");
  const [crop,setCrop] = useState("");
  const [field,setField] = useState("North Plot — A2");
  const [stage,setStage] = useState("Flowering");
  const [scanning,setScanning] = useState(false);
  const [readout,setReadout] = useState(0);
  const [result,setResult] = useState(null);
  const [tab,setTab] = useState(0);
  const [isolated,setIsolated] = useState(false);
  const [saveMsg,setSaveMsg] = useState("");
  const [busy,setBusy] = useState(false);
  const [apiOpen,setApiOpen] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  /* History controls */
  const [query,setQuery] = useState("");
  const [cropFilter,setCropFilter] = useState("All");
  const [urgencyFilter,setUrgencyFilter] = useState("All");
  const [sort,setSort] = useState("Newest");
  const [focusGroup,setFocusGroup] = useState("");

  // ── Sync auth user ──
  useEffect(() => {
    if (authUser) {
      setUser(authUser.displayName || authUser.email || "Authenticated User");
    }
  }, [authUser]);

  // ── Wire token provider for API calls ──
  useEffect(() => {
    setTokenProvider(getIdToken);
  }, [getIdToken]);

  // ── Check backend availability on mount ──
  useEffect(() => {
    api.checkBackend().then(available => {
      setBackendAvailable(available);
      if (available) {
        setApiStatus("Backend connected — live mode.");
        setPreviewMode(false);
      } else {
        setApiStatus("Local Preview Mode — demo data, no backend required.");
      }
    });
  }, []);

  // ── Load saved history from backend ──
  const reloadRecords = async () => {
    if (!backendAvailable) return;
    try {
      const res = await api.getHistory();
      if (res.success && res.data) {
        const rows = res.data.map(r => ({
          id: r.id || r._id,
          crop: r.cropName,
          field: r.fieldName,
          disease: r.diseaseName,
          confidence: typeof r.confidence === 'number' && r.confidence <= 1 ? Math.round(r.confidence * 100) : r.confidence,
          urgency: r.urgency,
          cure: r.cure ? (r.cure.pesticide || "Treatment plan").substring(0, 40) : "See cure plan",
          date: new Date(r.createdAt).toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric" }),
          stage: r.growthStage,
          source: "saved"
        }));
        setSavedEntries(rows);
        setApiStatus("Saved history loaded from backend.");
      }
    } catch(e) {
      setApiStatus("Local Preview Mode — demo data, no backend required.");
    }
  };

  useEffect(() => { if (backendAvailable) reloadRecords(); }, [backendAvailable]);

  /* Preloader */
  useEffect(()=>{
    if(!preloader) return;
    setExiting(false); setProgress(0);
    const t = setInterval(()=> setProgress(p=> Math.min(100, p + 4 + Math.floor(Math.random()*4))), 120);
    return ()=> clearInterval(t);
  },[preloader]);
  useEffect(()=>{
    if(progress>=100 && preloader){
      const t=setTimeout(()=>{ setExiting(true); setTimeout(()=> setPreloader(false), 520); }, 180);
      return ()=> clearTimeout(t);
    }
  },[progress,preloader]);
  useEffect(()=>{
    if(!scanning) return;
    const t=setInterval(()=> setReadout(r=>(r+1)%READOUTS.length), 420);
    return ()=> clearInterval(t);
  },[scanning]);

  const allEntries = useMemo(()=> [...savedEntries, ...demoEntries], [savedEntries,demoEntries]);
  const groups = useMemo(()=>{
    const m = new Map();
    allEntries.forEach(e=>{ const k=`${e.crop} in ${e.field}`; m.set(k, [...(m.get(k)||[]), e]); });
    return [...m.entries()].filter(([,v])=> v.length>=2).sort((a,b)=> b[1].length-a[1].length);
  },[allEntries]);
  const topGroup = groups[0];
  const filtered = useMemo(()=>{
    let list = allEntries.filter(e=>{
      const q=query.toLowerCase();
      return (!q || (e.disease+" "+e.crop+" "+e.field).toLowerCase().includes(q)) && (cropFilter==="All"||e.crop===cropFilter) && (urgencyFilter==="All"||e.urgency===urgencyFilter) && (!focusGroup || `${e.crop} in ${e.field}`===focusGroup);
    });
    list = [...list].sort((a,b)=> sort==="Confidence" ? b.confidence-a.confidence : 0);
    return list;
  },[allEntries,query,cropFilter,urgencyFilter,sort,focusGroup]);
  const healthyPct = allEntries.length ? Math.round(allEntries.filter(e=>e.urgency==="Monitor Only").length/allEntries.length*100) : 0;

  function go(v){ setView(v); window.scrollTo({top:0,behavior:"smooth"}); }
  function handleFile(f){ if(!f) return; setFile(f); if(preview) URL.revokeObjectURL(preview); setPreview(URL.createObjectURL(f)); setResult(null); setSaveMsg(""); }

  function runDiagnosis(){
    if(!file || !crop) return;
    setScanning(true); setResult(null); setIsolated(false); setSaveMsg("");

    if (backendAvailable) {
      api.diagnose(file, crop, field.trim() || "Unnamed Plot", stage)
        .then(res => {
          setScanning(false);
          if (res.success && res.data) {
            const d = res.data;
            setResult({
              disease: d.diseaseName,
              scientific: d.scientificName,
              confidence: typeof d.confidence === 'number' && d.confidence <= 1 ? Math.round(d.confidence * 100) : d.confidence,
              urgency: d.urgency === 'moderate' ? 'Moderate Action' : d.urgency === 'high' || d.urgency === 'Immediate Action' ? 'Immediate Action Needed' : d.urgency === 'low' || d.urgency === 'Monitor Only' ? 'Monitor Only' : d.urgency,
              contagious: d.contagious || false,
              summary: d.summary,
              _cure: d.cure,
              _backendId: d.id
            });
          } else {
            // Fallback to demo
            setResult(DIAG[crop]);
          }
          setTab(0);
        })
        .catch(() => {
          setScanning(false);
          setResult(DIAG[crop]);
          setTab(0);
        });
    } else {
      setTimeout(()=>{ setScanning(false); setResult(DIAG[crop]); setTab(0); }, 1800);
    }
  }

  async function saveToHistory(){
    if(!result || !crop) return;
    setBusy(true); setSaveMsg("");
    const row = { id:`scan-${Date.now()}`, crop, field:field.trim()||"Unnamed Plot", disease:result.disease, confidence:result.confidence, urgency:result.urgency, cure: tab===0?"Chemical spray plan":tab===1?"Organic remedy plan":tab===2?"Pruning guide":"Watering & soil care", date:todayLabel(), stage, source:"saved" };

    if (result._backendId) {
      // Already saved by /api/diagnose
      setSaveMsg("Saved to history — scan stored.");
      await reloadRecords();
    } else {
      // Local-only save
      setSavedEntries(prev=>[row,...prev]);
      setSaveMsg("Saved locally for this session.");
    }
    setBusy(false);
  }

  async function deleteEntry(e){
    if(e.source==="saved" && backendAvailable){
      setBusy(true);
      try{ await api.deleteEntry(e.id); await reloadRecords(); }
      catch(err){ setSaveMsg(err instanceof Error?err.message:"Could not delete that saved scan."); }
      setBusy(false);
    } else if(e.source==="saved") {
      setSavedEntries(prev=> prev.filter(x=>x.id!==e.id));
    } else {
      setDemoEntries(prev=> prev.filter(x=>x.id!==e.id));
    }
  }

  function downloadPlan(){
    if(!result) return;
    const text = `FOLIA — CURE PLAN\nCrop: ${crop} | Field: ${field} | Stage: ${stage}\nDiagnosis: ${result.disease} (${result.scientific})\nConfidence: ${result.confidence}% | Urgency: ${result.urgency}\n\nCHEMICAL: ${stage==="Seedling"?"HALF DOSE — 50% concentration":"Full dose approved"}; spray early morning.\nORGANIC: Neem oil 5 ml/L, weekly, plus sanitation.\nPRUNING: Remove affected leaves with disinfected shears; bag and dispose.\nWATER & SOIL: Water at soil level, improve drainage, avoid overhead watering.\nSCHEDULE: Day 1 — treat + prune. Day 3 — inspect. Day 7 — re-treat if lesions persist.\n`;
    const url = URL.createObjectURL(new Blob([text],{type:"text/plain"}));
    const a=document.createElement("a"); a.href=url; a.download=`folia-cure-plan-${crop.toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  async function signIn(provider){
    setAuthNotice("");
    try {
      if (provider === "Google") {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      setLoginOpen(false);
    } catch(e) {
      if (!firebaseConfigured) {
        setAuthNotice("Connect Firebase keys to enable live auth — using Local Preview for now.");
      } else {
        setAuthNotice(e.message || "Authentication failed. Try again.");
      }
      setTimeout(()=>{ setUser("Demo Grower"); setLoginOpen(false); }, 350);
    }
  }

  const tabs = [
    { icon:FlaskConical, label:"Pesticide / Chemical Spray", title:"Targeted chemical control", body: result?._cure?.pesticide || "Apply a protectant fungicide to both leaf surfaces, with complete coverage on the underside where infection often begins. Treat in calm conditions and reapply after heavy rain. Rotate active ingredients across seasons to reduce resistance." },
    { icon:Leaf, label:"Organic Remedies", title:"Low-impact treatment", body: result?._cure?.organic || "Mix neem oil at 5 ml per litre with a few drops of mild liquid soap. Spray in the early morning or late evening. Remove heavily infected leaves first so the remedy reaches healthy tissue." },
    { icon:Scissors, label:"Pruning / Cutting Guide", title:"Remove the source of spread", body: result?._cure?.pruning || "Use clean, sharp shears. Cut 2 cm below visible lesions, disinfect the blade between cuts, and place all material in a sealed bag. Never compost infected foliage." },
    { icon:Droplets, label:"Watering & Soil Care", title:"Change the conditions", body: result?._cure?.watering || "Water at soil level, preferably in the morning. Improve airflow, widen spacing, and add mulch to reduce soil splash. Avoid overhead watering until lesions stop expanding." },
  ];

  return (
    <div data-safe-area-inset-root style={{boxSizing:"border-box", paddingTop:"var(--safe-area-inset-top)", minHeight:"100vh", background:"var(--bg)", overflowX:"clip"}}>
      {/* PRELOADER */}
      {preloader && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#0A0A0A] overflow-y-auto pt-[max(1rem,var(--safe-area-inset-top))] pb-6 transition-all duration-500" style={{ opacity: exiting?0:1, transform: exiting?"translateY(-100%)":"none" }} aria-label="Loading Folia">
          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[420px]">
            <div className="w-full max-w-[720px] h-[150px] relative flex items-center justify-center overflow-hidden">
              <img src={loaderUrl} alt="Folia leaf loading" className="animate-glide h-[92px] w-auto object-contain" />
            </div>
            <p className="mono text-[11px] tracking-[.25em] text-[#FAFAFA] mt-8 text-center">FOLIA — PLANT INTELLIGENCE</p>
          </div>
          <div className="px-5 sm:px-10 max-w-6xl w-full mx-auto">
            <div className="flex justify-between mono text-[11px] text-[#FAFAFA]"><span>LOADING</span><span>{String(progress).padStart(2,"0")}% → 100%</span></div>
            <div className="h-[1px] bg-white/25 mt-3 overflow-hidden"><div className="h-full bg-[#FAFAFA] transition-all duration-100" style={{width:`${progress}%`}} /></div>
          </div>
        </div>
      )}

      {/* NAV */}
      <header data-safe-area-sticky-top className="sticky z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E5E5]" style={{top:"var(--safe-area-inset-top)"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
          <button onClick={()=>go("landing")} className="flex items-center gap-3 min-w-0" aria-label="Folia home">
            <span className="w-9 h-9 bg-white rounded-[8px] p-[5px] shrink-0 block overflow-hidden border border-[#E5E5E5]"><img src={monogramUrl} alt="Folia monogram" className="w-full h-full object-contain" /></span>
            <span className="font-display font-bold tracking-[.18em] text-lg text-[#0A0A0A]">FOLIA</span>
          </button>
          <nav className="hidden md:flex items-center gap-7 mono text-[11px] tracking-[.14em] text-[#6B6B6B]">
            <button className={view==="landing"?"text-[#0A0A0A]":"hover:text-[#0A0A0A]"} onClick={()=>go("landing")}>OVERVIEW</button>
            <button className={view==="diagnose"?"text-[#0A0A0A]":"hover:text-[#0A0A0A]"} onClick={()=>go("diagnose")}>DIAGNOSE</button>
            <button className={view==="history"?"text-[#0A0A0A]":"hover:text-[#0A0A0A]"} onClick={()=>go("history")}>HISTORY</button>
            <button className={view==="monograph"?"text-[#0A0A0A]":"hover:text-[#0A0A0A]"} onClick={()=>go("monograph")}>MONOGRAPH</button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`hidden lg:inline-flex items-center gap-2 mono text-[10px] border border-[#E5E5E5] bg-[#F5F5F5] px-2.5 py-1.5 rounded-full ${backendAvailable ? 'text-[#047857]' : 'text-[#6B6B6B]'}`}><span className={`w-1.5 h-1.5 rounded-full ${backendAvailable ? 'bg-[#10B981]' : 'bg-[#F59E0B]'} animate-pulse`} />{backendAvailable ? 'LIVE MODE' : 'LOCAL PREVIEW'}</span>
            {user ? <span className="hidden sm:block mono text-[11px] px-3 py-2 border border-[#E5E5E5] rounded-full text-[#0A0A0A]">{user.toUpperCase()}</span> : <button onClick={()=>setLoginOpen(true)} className="bg-[#0A0A0A] text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-full">Sign In / Open App</button>}
          </div>
        </div>
        <div className="md:hidden flex gap-5 px-4 pb-3 mono text-[10px] tracking-widest text-[#6B6B6B] overflow-x-auto no-scrollbar">
          <button onClick={()=>go("landing")}>OVERVIEW</button><button onClick={()=>go("diagnose")}>DIAGNOSE</button><button onClick={()=>go("history")}>HISTORY</button><button onClick={()=>go("monograph")}>MONOGRAPH</button>
        </div>
      </header>

      <main className="pb-10">
        {view==="landing" && (
          <>
            {/* HERO */}
            <section className="bg-white overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-12 sm:pt-16 pb-10 sm:pb-14 grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="min-w-0">
                <p className="label !text-[#0A0A0A]">AI-POWERED PLANT DISEASE DETECTION</p>
                <h1 className="font-display font-bold leading-[.92] tracking-[-0.03em] mt-5 text-[clamp(3.2rem,9vw,7.5rem)] text-[#0A0A0A]">Read the leaf.<br /><span className="text-[#6B6B6B]">Save the crop.</span></h1>
                <p className="max-w-[560px] text-[#333333] text-base sm:text-lg leading-relaxed mt-6">Photograph a leaf, get a measured diagnosis, and follow a four-part cure plan built for the crop, field, and growth stage in front of you.</p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <button onClick={()=>go("diagnose")} className="bg-[#0A0A0A] text-white font-semibold px-6 py-3.5 rounded-full flex items-center gap-2">Start Diagnosis <ArrowRight size={17} /></button>
                  <button onClick={()=>go("history")} className="border border-[#0A0A0A] bg-white text-[#0A0A0A] px-6 py-3.5 rounded-full font-semibold">View History</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-[#0A0A0A]/20 mt-12 sm:mt-16 pt-5 gap-5 mono">
                  {[["94.2%","AVG CONFIDENCE"],["8","CROPS"],["<3S","SCAN"],["4-STEP","CURE"]].map(([v,l])=> <div key={l}><div className="text-2xl sm:text-3xl text-[#0A0A0A]">{v}</div><div className="text-[10px] tracking-[.18em] text-[#6B6B6B] mt-1">{l}</div></div>)}
                </div>
                </div>
                <div className="min-w-0 flex items-center justify-center lg:justify-end">
                  <img src={heroLeafUrl} alt="Bright vivid green leaf with glowing rim light on a white background" className="w-full max-w-[560px] h-auto object-contain" />
                </div>
              </div>
            </section>

            {/* WORKFLOW */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
              <div className="flex items-end justify-between gap-4"><div><p className="label">WORKFLOW</p><h2 className="font-display text-3xl sm:text-5xl font-semibold mt-3 text-[#0A0A0A]">Four steps. One clear decision.</h2></div><span className="mono hidden sm:block text-xs text-[#6B6B6B]">01 — 04</span></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 border border-[#E5E5E5] bg-white mt-9 divide-y sm:divide-y-0 lg:divide-x divide-[#E5E5E5]">
                {[{n:"01",icon:Upload,t:"Upload",d:"Add a sharp photo of the affected leaf."},{n:"02",icon:ScanLine,t:"AI Scan",d:"Veins, lesions, and growth stage are mapped."},{n:"03",icon:Sprout,t:"Cure Plan",d:"Chemical, organic, pruning, and soil steps."},{n:"04",icon:History,t:"History",d:"Every scan is saved by crop and field."}].map((s)=> <div key={s.n} className="p-6 sm:p-7"><div className="flex justify-between"><span className="mono text-xs text-[#6B6B6B]">{s.n}</span><s.icon size={22} className={s.icon===Sprout?"text-[#16A34A]":"text-[#0A0A0A]"} /></div><h3 className="font-display text-xl font-semibold mt-12 text-[#0A0A0A]">{s.t}</h3><p className="text-sm text-[#6B6B6B] leading-relaxed mt-2">{s.d}</p></div>)}
              </div>
            </section>

            {/* MONOGRAPH */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
              <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 sm:p-6">
                <img src={monographUrl} alt="Botanical monograph line art of tomato and wheat" className="w-full h-auto object-contain bg-white opacity-100" />
                <p className="mono text-[10px] tracking-[.18em] text-[#0A0A0A]/70 mt-4">PLATE 01 — SOLANUM LYCOPERSICUM / TRITICUM</p>
              </div>
              <div className="lg:pt-5">
                <p className="label">FIELD MONOGRAPH</p><h2 className="font-display text-4xl sm:text-6xl font-semibold mt-4 leading-[.95] text-[#0A0A0A]">Botany,<br />measured.</h2>
                <p className="text-[#6B6B6B] leading-relaxed mt-6">Folia reads a leaf the way a field botanist would: first its structure, then the geometry of what has changed. The model is trained to separate normal vein architecture from the edge, colour, and texture of disease.</p>
                <div className="space-y-4 mt-7">{["Vein mapping — structure is checked before symptoms are named.","Lesion geometry — shape, margin, and distribution are measured.","Growth-stage context — dosage and risk change with the plant."].map((x,i)=> <div key={x} className="flex gap-4 border-b border-[#E5E5E5] pb-4"><span className="mono text-xs text-[#6B6B6B]">0{i+1}</span><p className="text-sm sm:text-base leading-relaxed text-[#0A0A0A]">{x}</p></div>)}</div>
                <button onClick={()=>go("diagnose")} className="mt-7 inline-flex items-center gap-2 font-semibold border-b border-[#0A0A0A] pb-1 text-[#0A0A0A]">Test a leaf in the scanner <ArrowUpRight size={17} /></button>
              </div>
            </section>

            {/* PREVIEW */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
              <p className="label">DIAGNOSTIC PREVIEW</p><h2 className="font-display text-3xl sm:text-5xl font-semibold mt-3 text-[#0A0A0A]">What the scan can find.</h2>
              <div className="grid md:grid-cols-3 gap-4 mt-8">{EXAMPLES.map(e=> <article key={e.disease} className="hairline bg-[#FFFFFF] p-6"><div className="flex justify-between"><span className="mono text-[10px] tracking-widest text-[#6B6B6B]">{e.crop.toUpperCase()}</span><span className="w-2.5 h-2.5 rounded-full mt-1" style={{background:e.tone}} /></div><h3 className="font-display text-2xl font-semibold mt-10 text-[#0A0A0A]">{e.disease}</h3><p className="text-sm text-[#6B6B6B] mt-2 leading-relaxed">{e.note}</p><div className="flex justify-between items-end mt-8"><span className="mono text-3xl text-[#0A0A0A]">{e.pct}%</span><span className="text-xs font-medium" style={{color:e.tone}}>{e.urgency}</span></div></article>)}</div>
            </section>
          </>
        )}

        {view==="monograph" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-2 gap-8 items-start animate-fade">
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 sm:p-6"><img src={monographUrl} alt="Botanical monograph line art of tomato and wheat" className="w-full h-auto object-contain opacity-100" /><p className="mono text-[10px] tracking-[.18em] text-[#0A0A0A]/70 mt-4">PLATE 01 — SOLANUM LYCOPERSICUM / TRITICUM</p></div>
            <div><p className="label">MONOGRAPH — FIELD NOTES</p><h1 className="font-display text-4xl sm:text-6xl font-semibold mt-4 text-[#0A0A0A]">Botany, measured.</h1><p className="text-[#6B6B6B] leading-relaxed mt-6">A good diagnosis starts before the disease. The monograph records the healthy leaf first, so change can be compared against structure rather than memory.</p><div className="grid sm:grid-cols-2 gap-4 mt-8">{[["Vein mapping","Primary and secondary veins are traced."],["Lesion geometry","Margins, size, and spread are measured."],["Growth-stage context","Seedling care differs from mature care."],["Field memory","Scans are grouped by crop and plot."]].map(([t,d])=> <div key={t} className="hairline bg-white p-5"><h3 className="font-display text-lg text-[#0A0A0A]">{t}</h3><p className="text-sm text-[#6B6B6B] mt-2 leading-relaxed">{d}</p></div>)}</div></div>
          </section>
        )}

        {view==="diagnose" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade">
            <div className="flex flex-wrap justify-between gap-4 items-end"><div><p className="label">DIAGNOSE</p><h1 className="font-display text-4xl sm:text-6xl font-semibold mt-3 text-[#0A0A0A]">AI Leaf Scanner</h1><p className="text-[#6B6B6B] mt-3 max-w-xl">Add a leaf photo, confirm the crop and growth stage, then run the scan.</p></div><span className="mono text-[11px] text-[#6B6B6B]">{apiStatus}</span></div>

            <div className="grid lg:grid-cols-[1fr_1.15fr] gap-5 mt-8 items-start">
              {/* LEFT */}
              <div className="space-y-5">
                <div className="hairline bg-[#FFFFFF] p-4 sm:p-5">
                  <div className="flex justify-between items-center"><p className="label">LEAF PHOTO</p><span className="mono text-[10px] text-[#6B6B6B]">JPG / PNG</span></div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files?.[0]||null)} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>handleFile(e.target.files?.[0]||null)} />
                  {!preview ? (
                    <button onClick={()=>fileRef.current?.click()} className="w-full mt-4 border border-dashed border-[#D9D9D9] bg-white min-h-[260px] flex flex-col items-center justify-center gap-3 px-4 text-center hover:border-[#0A0A0A] transition"><Upload size={28} className="text-[#0A0A0A]" /><span className="font-display text-lg text-[#0A0A0A]">Drop a leaf photo, or browse</span><span className="text-sm text-[#6B6B6B]">Sharp, daylight photos give the clearest scan.</span></button>
                  ) : (
                    <div className="relative mt-4 overflow-hidden border border-[#E5E5E5] bg-white">
                      <img src={preview} alt="Selected leaf preview" className="w-full h-[280px] sm:h-[320px] object-cover" />
                      {scanning && <><div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(rgba(0,0,0,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.25) 1px, transparent 1px)", backgroundSize:"28px 28px"}} /><div className="animate-scan absolute left-0 right-0 h-[2px] bg-[#10B981] shadow-[0_0_18px_#10B981]" /></>}
                      <button onClick={()=>{setPreview(""); setFile(null); setResult(null);}} className="absolute top-3 right-3 bg-white/90 text-[#0A0A0A] p-2 rounded-full border border-[#E5E5E5]" aria-label="Remove photo"><X size={16} /></button>
                      {scanning && <div className="absolute bottom-3 left-3 bg-white/90 px-3 py-2 mono text-[10px] tracking-widest text-[#047857] border border-[#E5E5E5]">{READOUTS[readout]}</div>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={()=>fileRef.current?.click()} className="border border-[#0A0A0A] bg-white text-[#0A0A0A] px-4 py-2.5 rounded-full text-sm font-medium">Browse files</button>
                    <button onClick={()=>cameraRef.current?.click()} className="border border-[#0A0A0A] bg-white text-[#0A0A0A] px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2"><Camera size={16} /> Use Camera</button>
                    {preview && <button onClick={()=>fileRef.current?.click()} className="px-4 py-2.5 text-sm text-[#6B6B6B]">Replace photo</button>}
                  </div>
                </div>

                <div className="hairline bg-[#FFFFFF] p-4 sm:p-5 space-y-5">
                  <div><label className="label" htmlFor="crop">Crop Name</label><select id="crop" value={crop} onChange={e=>setCrop(e.target.value)} className="mt-2 w-full bg-white text-[#0A0A0A] border border-[#D9D9D9] px-3 py-3 text-sm"><option value="">Select a crop</option>{CROPS.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label className="label" htmlFor="field">Field / Plot Name</label><input id="field" value={field} onChange={e=>setField(e.target.value)} placeholder="e.g. North Plot — A2" className="mt-2 w-full bg-white text-[#0A0A0A] border border-[#D9D9D9] px-3 py-3 text-sm [overflow-wrap:anywhere]" /></div>
                  <div><span className="label">Crop Age / Growth Stage</span><div className="flex flex-wrap gap-2 mt-2">{STAGES.map(s=> <button key={s} onClick={()=>setStage(s)} className={`px-3.5 py-2 rounded-full text-sm border ${stage===s?"bg-[#0A0A0A] text-white border-[#0A0A0A]":"bg-white text-[#0A0A0A] border-[#D9D9D9]"}`}>{s}</button>)}</div></div>
                  <button disabled={!file || !crop || scanning} onClick={runDiagnosis} className="w-full bg-[#0A0A0A] text-white font-semibold py-3.5 rounded-full disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2">{scanning?"Scanning…":"Run AI Diagnosis"} <ScanLine size={17} /></button>
                  {(!file || !crop) && <p className="text-xs text-[#6B6B6B]">Add a leaf photo and choose a crop to enable the scan.</p>}
                </div>

                <div className="hairline bg-white">
                  <button onClick={()=>setApiOpen(v=>!v)} className="w-full flex justify-between items-center p-4 text-left text-[#0A0A0A]"><span className="mono text-[11px] tracking-widest">DEVELOPER — API LAYER</span><ChevronDown size={17} className={apiOpen?"rotate-180":""} /></button>
                  {apiOpen && <div className="px-4 pb-4 mono text-[11px] leading-6 text-[#6B6B6B]"><p>BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'</p><p>POST /api/diagnose</p><p>GET /api/history</p><p>GET /api/analytics/recurring</p><p>DELETE /api/history/:id</p><p className="text-[#0A0A0A] mt-2">The app falls back to local demo mode when the backend is unreachable.</p></div>}
                </div>
              </div>

              {/* RIGHT */}
              <div>
                {!result && !scanning ? (
                  <div className="hairline bg-[#FFFFFF] min-h-[520px] flex flex-col items-center justify-center text-center px-6 py-16"><Leaf className="text-[#16A34A]" size={34} /><h2 className="font-display text-2xl sm:text-3xl mt-5 text-[#0A0A0A]">Your diagnosis will appear here.</h2><p className="text-[#6B6B6B] max-w-sm mt-3 leading-relaxed">Select a crop, add a photo, and run the scan. The cure plan is built for that crop and growth stage.</p></div>
                ) : scanning ? (
                  <div className="hairline bg-[#FFFFFF] min-h-[520px] flex flex-col items-center justify-center px-6"><div className="w-12 h-12 border border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" /><p className="mono text-xs tracking-[.2em] mt-6 text-[#047857]">{READOUTS[readout]}</p><p className="text-[#6B6B6B] text-sm mt-3">Hold the leaf steady. The scan usually finishes in under three seconds.</p></div>
                ) : result && (
                  <div className="space-y-5 animate-fade">
                    {result.contagious && <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] p-4 sm:p-5"><div className="flex gap-3"><ShieldAlert className="shrink-0" /><div><p className="font-display font-bold tracking-wide text-[#0A0A0A]">URGENT SPREAD ALERT — Isolate this plant now</p><ol className="text-sm mt-3 space-y-1.5 list-decimal list-inside text-[#333333]"><li>Isolate plant</li><li>Do not water overhead</li><li>Disinfect tools</li><li>Remove infected leaves in a sealed bag</li></ol><label className="flex items-center gap-2 mt-4 text-sm font-medium cursor-pointer text-[#0A0A0A]"><input type="checkbox" checked={isolated} onChange={e=>setIsolated(e.target.checked)} className="w-4 h-4 accent-[#0A0A0A]" /> I have isolated the plant</label>{isolated && <p className="text-sm mt-2 flex gap-1.5 text-[#065F46]"><CheckCircle2 size={16} /> Isolation confirmed. Continue with the cure plan.</p>}</div></div></div>}
                    <div className="hairline bg-[#FFFFFF] p-5 sm:p-6">
                      <div className="flex flex-wrap justify-between gap-3"><div><p className="label">{crop} — {field}</p><h2 className="font-display text-3xl sm:text-4xl font-semibold mt-2 text-[#0A0A0A]">{result.disease}</h2><p className="italic text-[#6B6B6B] mt-1">{result.scientific}</p></div><span className="h-fit px-3 py-1.5 rounded-full text-xs font-semibold text-[#0A0A0A]" style={{background: result.urgency==="Monitor Only" ? "#ECFDF5" : result.urgency==="Moderate Action" ? "#FFFBEB" : "#FEF2F2", border:"1px solid #E5E5E5"}}>{result.urgency}</span></div>
                      <p className="text-sm text-[#333333] leading-relaxed mt-4">{result.summary}</p>
                      <div className="mt-6"><div className="flex justify-between mono text-xs text-[#0A0A0A]"><span>CONFIDENCE</span><span className="text-xl">{result.confidence}%</span></div><div className="h-1.5 bg-[#E5E5E5] mt-2"><div className="h-full bg-[#0A0A0A] transition-all duration-700" style={{width:`${result.confidence}%`}} /></div></div>
                      <p className="mono text-[11px] text-[#6B6B6B] mt-4">STAGE: {stage.toUpperCase()} · FIELD: {field.toUpperCase()}</p>
                    </div>

                    <div className="hairline bg-[#FFFFFF]">
                      <div className="flex overflow-x-auto no-scrollbar border-b border-[#E5E5E5]">{tabs.map((t,i)=> <button key={t.label} onClick={()=>setTab(i)} className={`whitespace-nowrap px-4 py-3.5 text-sm ${tab===i?"bg-[#0A0A0A] text-white font-semibold":"bg-white text-[#6B6B6B]"}`}>{t.label}</button>)}</div>
                      <div className="p-5 sm:p-6"><div className="flex gap-3 items-center"><span className={`w-9 h-9 border border-[#E5E5E5] flex items-center justify-center ${tabs[tab].icon===Leaf?"text-[#16A34A]":"text-[#0A0A0A]"}`}>{React.createElement(tabs[tab].icon,{size:18})}</span><h3 className="font-display text-xl font-semibold text-[#0A0A0A]">{tabs[tab].title}</h3></div><p className="text-sm sm:text-base text-[#333333] leading-relaxed mt-4">{tabs[tab].body}</p>
                        {tab===0 && <div className={`mt-5 p-4 border ${stage==="Seedling"?"border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]":"border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]"}`}><p className="font-semibold text-sm flex gap-2"><AlertTriangle size={17} /> {stage==="Seedling"?"HALF DOSE — Seedling: use 50% concentration, spray early morning, avoid direct sun":"Full dose approved"}</p><p className="text-sm text-[#333333] mt-2">{stage==="Seedling"?"Young tissue is sensitive to chemical burn. Test one leaf first, then wait 24 hours.":"Mature foliage can tolerate the labelled rate. Keep spray off open flowers where possible."}</p></div>}
                        {tab===1 && <p className="text-sm mt-4 text-[#6B6B6B]">Dosage: neem oil 5 ml/L · Frequency: every 7 days · Safety: avoid spraying in direct sun.</p>}
                        <div className="mt-6"><p className="label">TREATMENT SCHEDULE</p><div className="grid grid-cols-3 border border-[#E5E5E5] mt-3 text-sm">{["DAY 1","DAY 3","DAY 7"].map(d=> <div key={d} className="p-3 border-r last:border-r-0 border-[#E5E5E5]"><p className="mono text-[10px] text-[#6B6B6B]">{d}</p><p className="mt-2 text-xs sm:text-sm leading-snug text-[#0A0A0A]">{d==="DAY 1"?"Treat + prune":d==="DAY 3"?"Inspect spread":"Re-treat if needed"}</p></div>)}</div></div>
                      </div>
                    </div>

                    {saveMsg && <div className="border border-[#A7F3D0] bg-[#ECFDF5] text-sm p-3 flex gap-2 text-[#065F46]"><CheckCircle2 size={17} className="text-[#047857] shrink-0" /><span>{saveMsg}</span></div>}
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={saveToHistory} className="bg-[#0A0A0A] text-white font-semibold px-5 py-3 rounded-full disabled:opacity-50">{busy?"Saving…":"Save to History"}</button>
                      <button onClick={downloadPlan} className="border border-[#0A0A0A] bg-white text-[#0A0A0A] px-5 py-3 rounded-full font-medium inline-flex gap-2 items-center"><Download size={16} /> Download Cure Plan</button>
                      <button onClick={()=>{setResult(null); setPreview(""); setFile(null); setCrop("");}} className="px-4 py-3 text-sm text-[#6B6B6B] inline-flex gap-2 items-center"><RotateCcw size={15} /> Scan Another Leaf</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {view==="history" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade">
            <p className="label">TREATMENT HISTORY</p><h1 className="font-display text-4xl sm:text-6xl font-semibold mt-3 text-[#0A0A0A]">Every scan, in context.</h1>
            {topGroup && <div className="mt-7 bg-[#FFFBEB] border border-[#FDE68A] text-[#0A0A0A] p-4 sm:p-5 flex flex-wrap gap-4 items-center justify-between"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-[#92400E]" /><p className="font-semibold">RECURRING ISSUE — {topGroup[0]} has {topGroup[1].length} detections in 14 days. Review soil + rotation.</p></div><button onClick={()=>setFocusGroup(topGroup[0])} className="bg-[#0A0A0A] text-white px-4 py-2.5 rounded-full text-sm">Filter to this group</button></div>}
            {focusGroup && <button onClick={()=>setFocusGroup("")} className="mt-3 text-sm text-[#6B6B6B] underline">Clear group filter: {focusGroup}</button>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">{[["TOTAL SCANS",allEntries.length],["HEALTHY %",`${healthyPct}%`],["IMMEDIATE ALERTS",allEntries.filter(e=>e.urgency==="Immediate Action Needed").length],["RECURRING GROUPS",groups.length]].map(([l,v])=> <div key={l} className="hairline bg-[#FFFFFF] p-4"><div className="mono text-2xl sm:text-3xl text-[#0A0A0A]">{v}</div><div className="label mt-2">{l}</div></div>)}</div>
            <div className="flex flex-col lg:flex-row gap-3 mt-6">
              <label className="flex-1 flex items-center gap-2 border border-[#E5E5E5] bg-[#FFFFFF] px-3"><Search size={17} className="text-[#6B6B6B]" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search disease, crop, or field" className="w-full bg-transparent py-3 outline-none text-sm text-[#0A0A0A] [overflow-wrap:anywhere]" /></label>
              <select value={cropFilter} onChange={e=>setCropFilter(e.target.value)} className="bg-[#FFFFFF] text-[#0A0A0A] border border-[#E5E5E5] px-3 py-3 text-sm"><option>All</option>{CROPS.map(c=><option key={c}>{c}</option>)}</select>
              <select value={urgencyFilter} onChange={e=>setUrgencyFilter(e.target.value)} className="bg-[#FFFFFF] text-[#0A0A0A] border border-[#E5E5E5] px-3 py-3 text-sm"><option>All</option><option>Monitor Only</option><option>Moderate Action</option><option>Immediate Action Needed</option></select>
              <select value={sort} onChange={e=>setSort(e.target.value)} className="bg-[#FFFFFF] text-[#0A0A0A] border border-[#E5E5E5] px-3 py-3 text-sm"><option>Newest</option><option>Confidence</option></select>
            </div>
            <p className="mono text-[11px] text-[#6B6B6B] mt-5">{filtered.length} SCANS · {apiStatus}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filtered.map(e=> <article key={e.id} className="hairline bg-[#FFFFFF] overflow-hidden"><div className="relative h-[170px] bg-[#F5F5F5]"><img src={preview && e.source==="saved" ? preview : heroUrl} alt={`${e.crop} leaf for ${e.disease}`} className="w-full h-full object-cover opacity-90" /><span className="absolute top-3 left-3 bg-white/90 text-[#0A0A0A] border border-[#E5E5E5] px-2 py-1 mono text-[10px]">{e.crop.toUpperCase()}</span><button onClick={()=>deleteEntry(e)} className="absolute top-3 right-3 bg-white/90 text-[#0A0A0A] border border-[#E5E5E5] p-2 rounded-full" aria-label={`Delete ${e.disease} scan`}><Trash2 size={15} /></button></div><div className="p-5"><div className="flex justify-between gap-3"><h3 className="font-display text-xl font-semibold leading-tight text-[#0A0A0A]">{e.disease}</h3><span className="mono text-lg text-[#0A0A0A]">{e.confidence}%</span></div><p className="text-sm text-[#6B6B6B] mt-2">{e.field} · {e.stage}</p><p className="text-sm mt-3 text-[#0A0A0A]">Cure applied: <span className="text-[#333333]">{e.cure}</span></p><div className="flex justify-between items-center mt-5"><span className="text-xs flex items-center gap-2 text-[#0A0A0A]"><span className="w-2 h-2 rounded-full" style={{background:urgencyColor(e.urgency)}} />{e.urgency}</span><span className="mono text-[11px] text-[#6B6B6B] flex items-center gap-1"><CalendarDays size={13} />{e.date}</span></div></div></article>)}
            </div>
            {filtered.length===0 && <div className="hairline bg-white p-10 text-center text-[#6B6B6B] mt-4">No scans match these filters. Try clearing the search or group filter.</div>}
          </section>
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] mt-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex items-center gap-3"><span className="w-9 h-9 bg-white rounded-[8px] p-[5px] block border border-[#E5E5E5]"><img src={monogramUrl} alt="Folia monogram" className="w-full h-full object-contain" /></span><div><p className="font-display font-bold tracking-[.18em] text-[#0A0A0A]">FOLIA</p><p className="text-xs text-[#6B6B6B]">Plant intelligence, kept simple.</p></div></div>
          <nav className="mono text-[11px] text-[#6B6B6B] flex flex-wrap gap-5 items-center"><button onClick={()=>go("landing")}>OVERVIEW</button><button onClick={()=>go("diagnose")}>DIAGNOSE</button><button onClick={()=>go("history")}>HISTORY</button><button onClick={()=>setPreloader(true)}>REPLAY INTRO</button></nav>
          <p className="mono text-[11px] text-[#6B6B6B]">© 2026 FOLIA · FIELD INTELLIGENCE</p>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {loginOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 backdrop-blur-sm pt-[max(1rem,var(--safe-area-inset-top))] pb-8" role="dialog" aria-modal="true" aria-label="Sign in to Folia">
          <div className="min-h-full flex items-center justify-center px-4">
            <div className="w-full max-w-[440px] bg-[#FFFFFF] border border-[#E5E5E5] p-6 sm:p-8 relative animate-fade">
              <button onClick={()=>setLoginOpen(false)} className="absolute top-4 right-4 p-1 text-[#6B6B6B]" aria-label="Close login"><X size={19} /></button>
              <span className="w-12 h-12 bg-white rounded-[10px] p-2 block border border-[#E5E5E5]"><img src={monogramUrl} alt="Folia monogram" className="w-full h-full object-contain" /></span>
              <h2 className="font-display text-3xl font-semibold mt-5 text-[#0A0A0A]">Welcome to Folia</h2><p className="text-[#6B6B6B] text-sm mt-2 leading-relaxed">Sign in to save scans, track fields, and return to every cure plan.</p>
              <div className="space-y-3 mt-7">
                <button onClick={()=>signIn("Google")} className="w-full bg-[#0A0A0A] text-white font-semibold py-3.5 rounded-full flex items-center justify-center gap-2"><Chrome size={18} /> Continue with Google</button>
                <button onClick={()=>signIn("GitHub")} className="w-full border border-[#0A0A0A] bg-white text-[#0A0A0A] font-semibold py-3.5 rounded-full flex items-center justify-center gap-2"><Github size={18} /> Continue with GitHub</button>
              </div>
              {authNotice && <p className="text-sm mt-4 border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] p-3">{authNotice}</p>}
              <div className="flex items-center gap-3 my-6"><span className="h-px bg-[#E5E5E5] flex-1" /><span className="mono text-[10px] text-[#6B6B6B]">OR</span><span className="h-px bg-[#E5E5E5] flex-1" /></div>
              <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-sm text-[#0A0A0A]">Local Preview Mode</p><p className="text-xs text-[#6B6B6B] mt-1">Demo data, no backend required.</p></div><button role="switch" aria-checked={previewMode} onClick={()=>setPreviewMode(v=>!v)} className={`w-12 h-6 rounded-full p-1 shrink-0 transition ${previewMode?"bg-[#0A0A0A]":"bg-[#D9D9D9]"}`}><span className={`block w-4 h-4 rounded-full bg-white ${previewMode?"ml-auto":""}`} /></button></div>
              {previewMode && <p className="mono text-[10px] tracking-wider text-[#047857] mt-4">LOCAL PREVIEW MODE — DEMO DATA, NO BACKEND REQUIRED</p>}
              <p className="mono text-[10px] leading-5 text-[#6B6B6B] mt-6 flex gap-1.5"><Lock size={12} className="shrink-0 mt-0.5" /> Firebase config: src/config/firebase.js — add VITE_FIREBASE_* keys to enable real auth.</p>
              <button onClick={()=>{setUser("Demo Grower"); setLoginOpen(false);}} className="w-full mt-5 text-sm underline text-[#6B6B6B]">Continue as Demo Grower</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
