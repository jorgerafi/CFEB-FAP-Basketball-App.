<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFEB-FAP Baloncesto</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-option:active { transform: scale(0.95); }
    </style>
</head>
<body class="bg-slate-50 font-sans text-slate-900">
    <div id="app" class="min-h-screen flex flex-col">
        <!-- Navegación -->
        <nav class="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm">
            <div class="max-w-4xl mx-auto flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="bg-orange-600 text-white p-1.5 rounded-lg">
                        <i data-lucide="trophy" class="w-5 h-5"></i>
                    </div>
                    <span class="font-bold text-xl tracking-tight">CFEB-FAP <span class="text-orange-600 font-medium text-sm ml-1">BASKET</span></span>
                </div>
                <div id="auth-status" class="text-[10px] text-slate-400 flex items-center gap-1">
                    <i data-lucide="shield-check" class="w-3 h-3 text-green-500"></i>
                    Anónimo
                </div>
            </div>
        </nav>

        <!-- Contenedor Dinámico -->
        <main id="main-content" class="flex-grow container mx-auto px-4 py-6 max-w-2xl"></main>

        <footer class="py-6 text-center text-slate-400 text-[10px]">
            <p>© 2026 Protocolo CFEB-FAP - Jorge Maroto Cuadrado</p>
        </footer>
    </div>

    <!-- Firebase SDK -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, onSnapshot, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // CONFIGURACIÓN
        const firebaseConfig = JSON.parse(window.__firebase_config || '{}');
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = window.__app_id || 'cfeb-fap-v1';

        // DATOS DEL TEST
        const ITEMS = [
            { id: 1, text: "Antes del partido me siento preparado emocionalmente para competir" },
            { id: 2, text: "Antes de jugar pienso mucho en no cometer errores", invert: true },
            { id: 3, text: "Me siento nervioso o tenso antes de empezar el partido", invert: true },
            { id: 4, text: "Me siento con confianza para seguir jugando aunque falle" },
            { id: 5, text: "Me siento disponible para asumir responsabilidades en el juego" },
            { id: 6, text: "Cuando cometo un error, me bloqueo emocionalmente", invert: true },
            { id: 7, text: "Después de fallar, tardo en volver a concentrarme", invert: true },
            { id: 8, text: "Evito participar en la siguiente jugada tras un error", invert: true },
            { id: 9, text: "Soy capaz de centrarme rápido en la siguiente acción" },
            { id: 10, text: "El error baja mi intensidad defensiva", invert: true },
            { id: 11, text: "Después de fallar, sigo disponible para recibir el balón" },
            { id: 12, text: "Las indicaciones del entrenador me ayudan después de un error" },
            { id: 13, text: "El feedback del entrenador reduce mi malestar cuando fallo" },
            { id: 14, text: "A veces las indicaciones del entrenador me generan más presión", invert: true },
            { id: 15, text: "Me siento apoyado por el entrenador cuando cometo errores" },
            { id: 16, text: "Después del partido sigo dándole vueltas a mis errores", invert: true },
            { id: 17, text: "Me resulta fácil soltar el partido a nivel emocional" },
            { id: 18, text: "Los errores afectan a mi estado de ánimo después del partido", invert: true },
            { id: 19, text: "Soy capaz de aprender de los errores sin machacarme" }
        ];

        const SUBESCALAS = [
            { name: "Prep. Pre-partido", ids: [1, 2, 3, 4, 5] },
            { name: "Reactividad Error (CCR1)", ids: [6, 7, 8, 10, 16, 18] },
            { name: "Disponibilidad Error (CCR2)", ids: [4, 5, 9, 11, 17, 19] },
            { name: "Apoyo Entrenador", ids: [12, 13, 14, 15] }
        ];

        let state = {
            view: 'welcome', // welcome, test, results, admin
            responses: {},
            user: null
        };

        // RENDERIZADO
        function render() {
            const main = document.getElementById('main-content');
            main.innerHTML = '';
            
            if (state.view === 'welcome') {
                main.innerHTML = `
                    <div class="fade-in text-center py-10">
                        <div class="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i data-lucide="clipboard-check" class="w-10 h-10 text-orange-600"></i>
                        </div>
                        <h1 class="text-2xl font-bold mb-4">Cuestionario CFEB-FAP</h1>
                        <p class="text-slate-600 mb-8 text-sm leading-relaxed">
                            Este test es <strong>anónimo</strong>. Ayúdanos a entender cómo vives el error. 
                            Recuerda: el fallo es parte del aprendizaje, no solo una derrota.
                        </p>
                        <button onclick="changeView('test')" class="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                            Empezar <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </button>
                        <button onclick="changeView('admin')" class="mt-4 text-slate-400 text-xs flex items-center justify-center gap-1 mx-auto">
                            <i data-lucide="lock" class="w-3 h-3"></i> Acceso Admin
                        </button>
                    </div>
                `;
            } else if (state.view === 'test') {
                const answered = Object.keys(state.responses).length;
                const progress = (answered / 19) * 100;
                
                main.innerHTML = `
                    <div class="fade-in">
                        <div class="mb-6 flex items-center justify-between">
                            <span class="text-xs font-bold text-orange-600 uppercase tracking-widest">Pregunta ${answered + 1} de 19</span>
                            <div class="w-32 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div class="bg-orange-600 h-full transition-all" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        <div id="question-card" class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <p class="text-lg font-semibold text-slate-800 mb-8">${ITEMS[answered].text}</p>
                            <div class="grid grid-cols-1 gap-3">
                                ${[0,1,2,3,4].map(val => `
                                    <button onclick="saveAnswer(${ITEMS[answered].id}, ${val})" class="btn-option w-full py-4 px-6 rounded-xl border-2 border-slate-100 text-left flex justify-between items-center hover:bg-orange-50 hover:border-orange-200 transition-all group">
                                        <span class="font-bold text-slate-600 group-hover:text-orange-700">${val} - ${val === 0 ? 'Nada' : val === 4 ? 'Mucho' : 'Un poco'}</span>
                                        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else if (state.view === 'results') {
                const results = calculateResults(state.responses);
                main.innerHTML = `
                    <div class="fade-in">
                        <div class="text-center mb-8">
                            <i data-lucide="award" class="w-12 h-12 text-yellow-500 mx-auto mb-2"></i>
                            <h2 class="text-2xl font-bold">Tu Perfil</h2>
                        </div>
                        <div class="space-y-4">
                            ${results.map(res => `
                                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                    <div class="flex justify-between items-end mb-2">
                                        <span class="text-sm font-bold text-slate-700">${res.name}</span>
                                        <span class="text-xs font-bold px-2 py-0.5 rounded ${res.color} text-white">${res.level}</span>
                                    </div>
                                    <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div class="h-full ${res.color}" style="width: ${(res.score / 4) * 100}%"></div>
                                    </div>
                                    <div class="text-right mt-1 font-mono text-xs font-bold text-slate-400">${res.score} / 4.00</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-8 bg-blue-50 p-4 rounded-xl text-xs text-blue-700 border border-blue-100">
                            <strong>Nota:</strong> Los niveles se basan en la media de tus respuestas. El fallo es una oportunidad de ajuste táctico y emocional.
                        </div>
                        <button onclick="location.reload()" class="w-full mt-6 py-4 text-slate-400 font-bold">Finalizar</button>
                    </div>
                `;
            } else if (state.view === 'admin') {
                main.innerHTML = `
                    <div class="fade-in">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold">Admin Panel</h2>
                            <button onclick="exportCSV()" class="bg-green-600 text-white p-2 rounded-lg"><i data-lucide="download" class="w-5 h-5"></i></button>
                        </div>
                        <div id="data-list" class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                            <p class="text-center text-slate-400 text-sm py-10 animate-pulse">Cargando base de datos...</p>
                        </div>
                        <button onclick="changeView('welcome')" class="w-full mt-6 py-4 bg-slate-800 text-white rounded-xl font-bold">Cerrar</button>
                    </div>
                `;
                loadAdminData();
            }
            lucide.createIcons();
        }

        // LÓGICA
        window.changeView = (v) => { state.view = v; render(); };

        window.saveAnswer = async (id, val) => {
            state.responses[id] = val;
            if (Object.keys(state.responses).length === 19) {
                const results = calculateResults(state.responses);
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'responses'), {
                    ts: new Date().toISOString(),
                    raw: state.responses,
                    results: results
                });
                state.view = 'results';
            }
            render();
        };

        function calculateResults(raw) {
            const proc = {};
            ITEMS.forEach(it => proc[it.id] = it.invert ? (4 - raw[it.id]) : raw[it.id]);
            
            return SUBESCALAS.map(sub => {
                const sum = sub.ids.reduce((a, b) => a + proc[b], 0);
                const avg = sum / sub.ids.length;
                let level = "Bajo", color = "bg-red-500";
                if (avg > 1.33) { level = "Medio"; color = "bg-yellow-500"; }
                if (avg > 2.66) { level = "Alto"; color = "bg-green-500"; }
                return { name: sub.name, score: avg.toFixed(2), level, color };
            });
        }

        async function loadAdminData() {
            const q = collection(db, 'artifacts', appId, 'public', 'data', 'responses');
            const snap = await getDocs(q);
            const list = document.getElementById('data-list');
            list.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                list.innerHTML += `
                    <div class="bg-white p-3 rounded-xl border border-slate-200 text-[10px] flex justify-between items-center shadow-sm">
                        <span>${new Date(d.ts).toLocaleDateString()} - ID: ${doc.id.slice(0,5)}</span>
                        <div class="flex gap-1 font-bold">
                            ${d.results.map(r => `<span class="text-slate-400">${r.score}</span>`).join('|')}
                        </div>
                    </div>
                `;
            });
        }

        window.exportCSV = async () => {
            const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'responses'));
            let csv = "ID,Fecha,Sub1,Sub2,Sub3,Sub4\n";
            snap.forEach(doc => {
                const d = doc.data();
                csv += `${doc.id},${d.ts},${d.results[0].score},${d.results[1].score},${d.results[2].score},${d.results[3].score}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cfeb_fap_data.csv`;
            a.click();
        };

        // INICIO
        onAuthStateChanged(auth, (user) => {
            state.user = user;
            if (!user) signInAnonymously(auth);
            render();
        });

    </script>
</body>
</html>              
