import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  doc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Trophy, 
  Settings, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
  Zap,
  Users,
  Brain,
  ExternalLink,
  User as UserIcon 
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fap-basketball-app';

// --- CONSTANTES ---
const ZENODO_DOI = "10.5281/zenodo.18862811";

const QUESTIONS = [
  { id: 1, text: "Antes del partido me siento preparado emocionalmente para competir", section: "ANTES", inverted: false },
  { id: 2, text: "Antes de jugar pienso mucho en no cometer errores", section: "ANTES", inverted: true },
  { id: 3, text: "Me siento nervioso o tenso antes de empezar el partido", section: "ANTES", inverted: true },
  { id: 4, text: "Me siento con confianza para seguir jugando aunque falle", section: "ANTES", inverted: false },
  { id: 5, text: "Me siento disponible para asumir responsabilidades en el juego", section: "ANTES", inverted: false },
  { id: 6, text: "Cuando cometo un error, me bloqueo emocionalmente", section: "DURANTE", inverted: true },
  { id: 7, text: "Después de fallar, tardo en volver a concentrarme", section: "DURANTE", inverted: true },
  { id: 8, text: "Evito participar en la siguiente jugada tras un error", section: "DURANTE", inverted: true },
  { id: 9, text: "Soy capaz de centrarme rápido en la siguiente acción", section: "DURANTE", inverted: false },
  { id: 10, text: "El error baja mi intensidad defensiva", section: "DURANTE", inverted: true },
  { id: 11, text: "Después de fallar, sigo disponible para recibir el balón", section: "DURANTE", inverted: false },
  { id: 12, text: "Las indicaciones del entrenador me ayudan después de un error", section: "ENTRENADOR", inverted: false },
  { id: 13, text: "El feedback del entrenador reduce mi malestar cuando fallo", section: "ENTRENADOR", inverted: false },
  { id: 14, text: "A veces las indicaciones del entrenador me generan más presión", section: "ENTRENADOR", inverted: true },
  { id: 15, text: "Me siento apoyado por el entrenador cuando cometo errores", section: "ENTRENADOR", inverted: false },
  { id: 16, text: "Después del partido sigo dándole vueltas a mis errores", section: "DESPUÉS", inverted: true },
  { id: 17, text: "Me resulta fácil soltar el partido a nivel emocional", section: "DESPUÉS", inverted: false },
  { id: 18, text: "Los errores afectan a mi estado de ánimo después del partido", section: "DESPUÉS", inverted: true },
  { id: 19, text: "Soy capaz de aprender de los errores sin machacarme", section: "DESPUÉS", inverted: false },
];

const SCALES = {
  PREPARACION: { name: "Preparación Pre-partido", items: [1, 2, 3, 4, 5] },
  REACTIVIDAD: { name: "Reactividad al Error (CCR1)", items: [6, 7, 8, 10, 16, 18] },
  DISPONIBILIDAD: { name: "Disponibilidad Post-error (CCR2)", items: [4, 5, 9, 11, 17, 19] },
  ENTRENADOR: { name: "Entrenador (Apoyo Funcional)", items: [12, 13, 14, 15] },
};

const getProfessionalAnalysis = (results) => {
  const { REACTIVIDAD, DISPONIBILIDAD, ENTRENADOR } = results;
  let profile = { title: "Perfil en Desarrollo", desc: "Gestión estándar con picos de frustración.", color: "text-blue-600" };
  if (REACTIVIDAD > 3 && DISPONIBILIDAD > 3) profile = { title: "Perfil Resiliente", desc: "Alta recuperación. El error no condiciona su intensidad.", color: "text-green-600" };
  else if (REACTIVIDAD < 1.5) profile = { title: "Perfil Alta Reactividad", desc: "El error genera bloqueo inmediato (CCR1).", color: "text-red-600" };
  else if (DISPONIBILIDAD < 1.5) profile = { title: "Perfil de Evitación", desc: "Tiende a 'esconderse' tras el fallo.", color: "text-orange-600" };

  return {
    profile,
    insights: [
      { icon: <Zap className="w-5 h-5" />, label: "Impacto en el Juego", text: REACTIVIDAD < 2 ? "Atención: Tus errores afectan tu defensa. Trabaja la regla de los '3 segundos'." : "Buen reenganche defensivo tras fallar." },
      { icon: <Users className="w-5 h-5" />, label: "Relación con el Staff", text: ENTRENADOR > 3 ? "El feedback del staff es un regulador positivo para ti." : "Sientes presión excesiva ante las correcciones." },
      { icon: <Target className="w-5 h-5" />, label: "Disponibilidad Ofensiva", text: DISPONIBILIDAD < 2.5 ? "Tiendes a evitar el balón tras un fallo. Pídelo en la siguiente jugada." : "Mantienes tu estatus de amenaza ofensiva." }
    ]
  };
};

const INTERPRETATION_RANGES = (score) => {
  if (score >= 2.67) return { label: "Alto", color: "text-green-600", bg: "bg-green-50" };
  if (score >= 1.34) return { label: "Medio", color: "text-yellow-600", bg: "bg-yellow-50" };
  return { label: "Bajo", color: "text-red-600", bg: "bg-red-50" };
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState([]);
  const [adminPass, setAdminPass] = useState("");

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error(error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const calculateResults = (dataAnswers) => {
    const results = {};
    Object.keys(SCALES).forEach(key => {
      const scale = SCALES[key];
      const scores = scale.items.map(id => {
        const q = QUESTIONS.find(q => q.id === id);
        const val = dataAnswers[id];
        return q.inverted ? 4 - val : val;
      });
      results[key] = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
    });
    return results;
  };

  const saveResults = async () => {
    if (!user) return;
    setLoading(true);
    const results = calculateResults(answers);
    try {
      const dataCollection = collection(db, 'artifacts', appId, 'public', 'data', 'responses');
      await addDoc(dataCollection, { userId: user.uid, timestamp: new Date().toISOString(), answers, results });
      setView('results');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAdminData = async () => {
    if (adminPass !== "CFEB2026") { alert("Acceso denegado"); return; }
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'responses'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAdminData(data);
      setView('admin');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-orange-600 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">CFEB-FAP</h1>
          <p className="text-slate-500 text-sm mb-6 italic">"El fallo es parte del aprendizaje y no solo una derrota."</p>
          
          <button 
            onClick={() => setView('survey')}
            disabled={!user}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-xl disabled:opacity-50 mb-6"
          >
            Comenzar Evaluación
          </button>

          <div className="space-y-4 pt-6 border-t border-slate-50">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <FileText className="w-3 h-3" /> Registro Científico
            </div>
            <a 
              href={`https://doi.org/${ZENODO_DOI}`} 
              target="_blank" 
              className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-[10px] font-mono text-slate-500 hover:bg-slate-200 transition"
            >
              DOI: {ZENODO_DOI} <ExternalLink className="w-2 h-2 ml-1" />
            </a>
          </div>

          <div className="mt-8">
            <input 
              type="password" 
              placeholder="Acceso Staff" 
              className="w-full mb-2 p-3 text-sm border rounded-xl text-center bg-slate-50 outline-none"
              onChange={(e) => setAdminPass(e.target.value)}
            />
            <button onClick={fetchAdminData} className="text-slate-400 text-xs hover:text-slate-600 flex items-center justify-center mx-auto">
              <Settings className="w-3 h-3 mr-1" /> Panel de Control
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Las vistas de survey, results y admin se mantienen con la lógica funcional corregida
  if (view === 'survey') {
    const q = QUESTIONS[currentStep];
    return (
      <div className="min-h-screen bg-white p-4 flex flex-col items-center">
        <div className="max-w-xl w-full pt-10">
          <div className="flex justify-between items-center mb-4">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.section}</span>
             <span className="text-xs font-bold text-slate-800">{currentStep + 1}/{QUESTIONS.length}</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mb-12">
            <div className="bg-orange-500 h-full transition-all" style={{ width: `${((currentStep+1)/QUESTIONS.length)*100}%` }}></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-16 text-center leading-tight">{q.text}</h2>
          <div className="flex justify-between max-w-sm mx-auto">
            {[0, 1, 2, 3, 4].map(val => (
              <button 
                key={val} 
                onClick={() => setAnswers({...answers, [q.id]: val})}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-lg font-black transition-all ${answers[q.id] === val ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-100 text-slate-300'}`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase mt-4 max-w-sm mx-auto px-1">
            <span>Nunca</span><span>Siempre</span>
          </div>
          <div className="flex justify-between gap-4 fixed bottom-10 left-0 right-0 max-w-xl mx-auto px-4">
            <button onClick={() => setCurrentStep(Math.max(0, currentStep-1))} className={`p-4 ${currentStep===0?'invisible':''}`}><ChevronLeft/></button>
            {currentStep < QUESTIONS.length - 1 ? (
              <button disabled={answers[q.id]===undefined} onClick={() => setCurrentStep(currentStep+1)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold disabled:opacity-20">Siguiente</button>
            ) : (
              <button disabled={loading} onClick={saveResults} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold">Ver Resultados</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'results') {
    const results = calculateResults(answers);
    const analysis = getProfessionalAnalysis(results);
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-3xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <h1 className="text-2xl font-black">Informe de Resiliencia</h1>
            <p className="text-slate-400 text-sm">Basado en el Protocolo FAP (Zenodo: {ZENODO_DOI})</p>
          </div>
          <div className="p-8">
            <div className={`p-6 rounded-2xl bg-slate-50 mb-8 border-l-4 ${analysis.profile.color.replace('text','border')}`}>
              <h2 className={`text-xl font-black ${analysis.profile.color}`}>{analysis.profile.title}</h2>
              <p className="text-slate-600 text-sm mt-1">{analysis.profile.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {Object.keys(SCALES).map(key => {
                const score = results[key];
                const interp = INTERPRETATION_RANGES(score);
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>{SCALES[key].name}</span><span>{score}</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full"><div className={`h-full ${interp.color.replace('text','bg')}`} style={{width:`${(score/4)*100}%`}}></div></div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Imprimir Informe</button>
              <button onClick={() => window.location.reload()} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-black">Panel Staff</h1>
            <button onClick={() => setView('welcome')} className="text-sm font-bold text-slate-400">Volver</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr><th className="p-4">ID Atleta</th><th className="p-4">CCR1</th><th className="p-4">CCR2</th><th className="p-4">Staff</th></tr>
              </thead>
              <tbody>
                {adminData.map(row => (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="p-4 font-mono">...{row.userId.slice(-5)}</td>
                    <td className="p-4">{row.results.REACTIVIDAD}</td>
                    <td className="p-4">{row.results.DISPONIBILIDAD}</td>
                    <td className="p-4">{row.results.ENTRENADOR}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
