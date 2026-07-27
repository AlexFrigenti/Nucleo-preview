/* ============ ALMACENAMIENTO ============
   Funciona tanto dentro de Claude como en Safari en tu iPhone. */
const Guardado = {
  async leer(k){
    try{
      if(window.storage){const r = await window.storage.get(k); return r ? r.value : null;}
      return localStorage.getItem(k);
    }catch(e){ return null; }
  },
  async escribir(k,v){
    try{
      if(window.storage){ await window.storage.set(k,v); }
      else { localStorage.setItem(k,v); }
    }catch(e){ /* si falla, seguimos jugando */ }
  }
};
const CLAVE = 'nucleo_v1';

/* ============ CONTENIDO DEL JUEGO ============ */
const MODULOS = [
  {id:'sonda',  nombre:'Sonda térmica',  base:15,      prod:0.1},
  {id:'turbina',nombre:'Turbina',        base:120,     prod:1},
  {id:'inter',  nombre:'Intercambiador', base:1400,    prod:8},
  {id:'bucle',  nombre:'Bucle de vapor', base:20000,   prod:47},
  {id:'pozo',   nombre:'Perforadora profunda', base:330000,  prod:260},
  {id:'manto',  nombre:'Taladro de diamante',  base:5100000, prod:1400},
  {id:'externo',nombre:'Perforadora sónica',  base:85000000,    prod:7800},
  {id:'interno',nombre:'Cañón de partículas', base:1400000000,  prod:44000},
  {id:'plasma', nombre:'Forja de plasma',base:24000000000, prod:255000}
];
const CRECIMIENTO = 1.15;

const MEJORAS = [
  {id:'m1', nombre:'Aislante cerámico',    coste:500,      obj:'sonda',   mult:2,   req:s=>s.mod.sonda>=10,   nota:'Sondas x2'},
  {id:'m2', nombre:'Golpe firme',          coste:1200,     obj:'toque',   mult:5,   req:s=>s.toques>=25,      nota:'Extracción manual x5'},
  {id:'m3', nombre:'Rodamiento magnético', coste:6000,     obj:'turbina', mult:2,   req:s=>s.mod.turbina>=10, nota:'Turbinas x2'},
  {id:'m4', nombre:'Doble circuito',       coste:60000,    obj:'inter',   mult:2,   req:s=>s.mod.inter>=10,   nota:'Intercambiadores x2'},
  {id:'m5', nombre:'Blindaje de wolframio',coste:250000,   obj:'global',  mult:1.5, req:s=>s.mod.bucle>=5,    nota:'Producción total x1,5'},
  {id:'m6', nombre:'Presión crítica',      coste:900000,   obj:'bucle',   mult:2,   req:s=>s.mod.bucle>=10,   nota:'Bucles x2'},
  {id:'m7', nombre:'Perforación láser',    coste:8000000,  obj:'pozo',    mult:2,   req:s=>s.mod.pozo>=10,    nota:'Perforadoras ×2'},
  {id:'m8', nombre:'Refrigeración forzada',coste:40000000,    obj:'manto',   mult:2,   req:s=>s.mod.manto>=10,   nota:'Taladros ×2'},
  {id:'m9', nombre:'Resonancia sísmica',   coste:150000000,   obj:'global',  mult:1.5, req:s=>s.mod.externo>=5,  nota:'Producción total x1,5'},
  {id:'m10',nombre:'Amplificador sónico',  coste:900000000,   obj:'externo', mult:2,   req:s=>s.mod.externo>=10, nota:'Perforadoras sónicas ×2'},
  {id:'m11',nombre:'Acelerador lineal',    coste:12000000000, obj:'interno', mult:2,   req:s=>s.mod.interno>=10, nota:'Cañones de partículas ×2'},
  {id:'m12',nombre:'Campo de Higgs',       coste:100000000000,obj:'plasma',  mult:3,   req:s=>s.mod.plasma>=10,  nota:'Forjas de plasma x3'}
];

/* ---- niveles de mejora generados para cada módulo ----
   Cada módulo ya tiene su mejora "I" (arriba). Aquí añadimos II, III, IV y V,
   que se desbloquean al tener 25, 50, 100 y 200 de ese módulo. */
const TIERS_MOD = [
  {req:25,  etiqueta:'II',  mult:3, factor:5e3},
  {req:50,  etiqueta:'III', mult:3, factor:1.6e5},
  {req:100, etiqueta:'IV',  mult:4, factor:1.8e8},
  {req:200, etiqueta:'V',   mult:5, factor:2e14}
];
MODULOS.forEach(m=>{
  TIERS_MOD.forEach(t=>{
    MEJORAS.push({
      id: m.id + t.req,
      nombre: m.nombre + ' ' + t.etiqueta,
      coste: Math.round(m.base * t.factor),
      obj: m.id,
      mult: t.mult,
      req: ((id,req)=> st => st.mod[id] >= req)(m.id, t.req),
      nota: m.nombre + ' ×' + t.mult
    });
  });
});
// mejora global potente de remate
MEJORAS.push({
  id:'superc', nombre:'Superconductor', coste:5e11, obj:'global', mult:2,
  req:s=>s.mod.interno>=15, nota:'Producción total ×2'
});

/* ---- mejoras especiales: mecánicas distintas, no solo ×N de un módulo ----
   Las de obj:'especial' no multiplican nada por sí solas; su efecto está
   enganchado a mano en el código (busca tieneMejora('id')). */
MEJORAS.push(
  {id:'percutor',  nombre:'Percutor hidráulico', coste:2e6,  obj:'toque',    mult:10, req:s=>s.toques>=200, nota:'Extracción manual ×10'},
  {id:'sismografo',nombre:'Sismógrafo',          coste:5e7,  obj:'especial', mult:1,  req:s=>s.toques>=100, nota:'Cada toque suma +5% de tu producción/s'},
  {id:'bateria',   nombre:'Batería geotérmica',  coste:1e7,  obj:'especial', mult:1,  req:s=>s.isotopos>=1, nota:'Progreso sin conexión: 8 h → 24 h'},
  {id:'enriq',     nombre:'Enriquecimiento',     coste:5e9,  obj:'especial', mult:1,  req:s=>s.isotopos>=5, nota:'Cada isótopo multiplica ×1,07 (antes ×1,05)'},
  {id:'simbiosis', nombre:'Simbiosis de red',    coste:5e10, obj:'global',   mult:2,  req:s=>MODULOS.every(m=>s.mod[m.id]>=25), nota:'Producción total ×2 · con 25 de cada módulo'}
);

const UMBRAL = 1e6;                    // julios por el primer isótopo
const TOPE_AUSENTE = 8*3600;           // máximo 8 h de progreso sin abrir

/* ============ ESTADO ============ */
let s = nuevaPartida();
function nuevaPartida(){
  const mod = {}; MODULOS.forEach(m=>mod[m.id]=0);
  return { j:0, totalCiclo:0, mod, mejoras:[], isotopos:0, toques:0, t:Date.now(),
           totalVida:0, tiempoJuego:0, mejorTasa:0, toquesVida:0, recalibraciones:0,
           registro:[], registroLeidos:[], logros:[] };
}

/* ============ CÁLCULOS ============ */
const tieneMejora = id => s.mejoras.includes(id);
// mejoras que puedes ver ahora (no compradas y con su requisito cumplido), baratas primero
function mejorasVisibles(){
  return MEJORAS.filter(u=>!tieneMejora(u.id) && u.req(s)).sort((a,b)=>a.coste-b.coste);
}
function multiplicadorDe(objetivo){
  let m = 1;
  MEJORAS.forEach(u=>{ if(u.obj===objetivo && tieneMejora(u.id)) m *= u.mult; });
  return m;
}
function bonusGlobal(){
  // bonus multiplicativo por muestra: cada isótopo compone (antes era lineal y se estancaba)
  const base = tieneMejora('enriq') ? 1.07 : 1.05;
  const bonusHitos = 1 + 0.02 * (s.logros ? s.logros.length : 0);
  // red de seguridad: nunca devolver Infinity/NaN (rompería la partida)
  return Math.min(multiplicadorDe('global') * Math.pow(base, s.isotopos) * bonusHitos, 1e300);
}
function produccionDe(m){
  return s.mod[m.id] * m.prod * multiplicadorDe(m.id) * bonusGlobal();
}
function porSegundo(){
  return MODULOS.reduce((t,m)=>t+produccionDe(m), 0);
}
function porToque(){
  return 1 * multiplicadorDe('toque') * bonusGlobal();
}
function costeDe(m){
  return m.base * Math.pow(CRECIMIENTO, s.mod[m.id]);
}
// coste total de comprar k unidades seguidas (suma geométrica)
function costeVarios(m,k){
  return costeDe(m) * (Math.pow(CRECIMIENTO,k) - 1) / (CRECIMIENTO - 1);
}
// cuántas unidades puedes permitirte ahora mismo
function maxAsequible(m){
  const cd = costeDe(m);
  const ratio = 1 + s.j*(CRECIMIENTO-1)/cd;
  let k = ratio > 1 ? Math.floor(Math.log(ratio)/Math.log(CRECIMIENTO)) : 0;
  if(k < 0) k = 0;
  while(k > 0 && costeVarios(m,k) > s.j) k--; // margen por redondeo
  return k;
}
function isotoposAlRecalibrar(){
  return Math.floor(Math.sqrt(s.totalCiclo / UMBRAL));
}

// La muestra es una lectura visual: no se guarda ni altera la economía del pozo.
const MUESTRAS = [
  {codigo:'FE-57', simbolo:'Fe', nombre:'HIERRO', estabilidad:81, pureza:94},
  {codigo:'NI-62', simbolo:'Ni', nombre:'NÍQUEL', estabilidad:76, pureza:91},
  {codigo:'IR-193', simbolo:'Ir', nombre:'IRIDIO', estabilidad:88, pureza:97},
  {codigo:'U-235', simbolo:'U', nombre:'URANIO', estabilidad:69, pureza:86},
  {codigo:'OS-192', simbolo:'Os', nombre:'OSMIO', estabilidad:84, pureza:93}
];
function actualizarMuestra(gana, profM){
  const muestra = MUESTRAS[s.isotopos % MUESTRAS.length];
  const lista = $('muestraIsotopo');
  const listaRecuperable = gana >= 1;
  const estabaRecuperable = lista.classList.contains('recuperable');
  lista.classList.toggle('recuperable', listaRecuperable);
  if(listaRecuperable && !estabaRecuperable) dispararMuestraDetectada();
  $('muestraEstado').textContent = listaRecuperable ? 'ISÓTOPO DETECTADO' : 'ANÁLISIS EN CURSO';
  $('muestraCodigo').textContent = muestra.codigo;
  $('muestraSimbolo').textContent = muestra.simbolo;
  $('muestraNombre').textContent = muestra.nombre;
  $('muestraDetalle').textContent = listaRecuperable
    ? 'Muestra lista para recuperación'
    : 'Firma a ' + fmtMetros(profM) + ' m';
  $('muestraEstabilidad').textContent = listaRecuperable ? muestra.estabilidad + '%' : '—';
  $('muestraPureza').textContent = listaRecuperable ? muestra.pureza + '%' : '—';
  $('muestraCantidad').textContent = listaRecuperable ? gana : '—';
}

/* ============ FORMATO DE NÚMEROS ============ */
const SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
function fmt(n){
  if(!isFinite(n)) return '∞';
  if(n < 0) return '0';
  if(n < 1000) return n < 10 ? (Math.round(n*10)/10).toString() : Math.floor(n).toString();
  let i = Math.min(Math.floor(Math.log10(n)/3), SUF.length-1);
  const v = n / Math.pow(1000,i);
  const txt = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString();
  return txt.replace('.',',') + ' ' + SUF[i];
}
function fmtTiempo(seg){
  const h = Math.floor(seg/3600), m = Math.floor(seg%3600/60);
  if(h) return h+' h '+m+' min';
  if(m) return m+' min';
  return Math.floor(seg)+' s';
}
// profundidad del pozo (m) = raíz de los julios producidos este ciclo
function profundidad(){ return Math.floor(Math.sqrt(Math.max(0, s.totalCiclo))); }
function fmtMetros(n){ return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
// estrato geológico según profundidad (fronteras reales, alineadas con el Registro)
const ESTRATOS = [
  {min:6371000, n:'CENTRO GEOMÉTRICO'},
  {min:5150000, n:'NÚCLEO INTERNO'},
  {min:2890000, n:'NÚCLEO EXTERNO'},
  {min:660000,  n:'MANTO INFERIOR'},
  {min:410000,  n:'ZONA DE TRANSICIÓN'},
  {min:35000,   n:'MANTO SUPERIOR'},
  {min:0,       n:'CORTEZA CONTINENTAL'}
];
function estratoDe(prof){ for(const e of ESTRATOS){ if(prof >= e.min) return e.n; } return 'CORTEZA CONTINENTAL'; }

/* ============ CONSTRUCCIÓN DE LA INTERFAZ ============ */
// Las lecturas de interfaz son muy frecuentes. Cachearlas evita volver a recorrer
// el DOM en cada refresco visual, especialmente en Safari/iPhone.
const nodos = new Map();
const $ = id => {
  if(!nodos.has(id)) nodos.set(id, document.getElementById(id));
  return nodos.get(id);
};
const ref = {};

/* dibujos animados de cada módulo (SVG) */
const GLIFOS = {
  sonda:'<svg class="g-sonda" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v9"/><path class="anim" d="M9 13h6l-3 5z" fill="currentColor" stroke="none"/></svg>',
  turbina:'<svg class="g-turbina" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g class="anim"><rect width="24" height="24" fill="none"/><path d="M12 12V3"/><path d="M12 12l7.8 4.5"/><path d="M12 12L4.2 16.5"/></g><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
  inter:'<svg class="g-inter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path class="anim" d="M3 9h18" stroke-dasharray="4 4"/><path class="anim2" d="M21 15H3" stroke-dasharray="4 4"/></svg>',
  bucle:'<svg class="g-bucle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle class="anim" cx="12" cy="12" r="7.5" stroke-dasharray="7 5"/></svg>',
  pozo:'<svg class="g-pozo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle class="anim" cx="12" cy="12" r="6"/><circle class="anim d2" cx="12" cy="12" r="6"/></svg>',
  manto:'<svg class="g-manto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path class="anim" d="M-4 12q3-5 6 0t6 0t6 0t6 0"/></svg>',
  externo:'<svg class="g-externo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle class="anim" cx="12" cy="12" r="7.5" stroke-dasharray="30 14"/></svg>',
  interno:'<svg class="g-interno" viewBox="0 0 24 24" fill="none"><circle class="anim" cx="12" cy="12" r="5.5" fill="currentColor"/></svg>',
  plasma:'<svg class="g-plasma" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><g class="anim"><rect width="24" height="24" fill="none"/><path d="M12 3v18"/><path d="M3 12h18"/><path d="M5.5 5.5l13 13"/><path d="M18.5 5.5l-13 13"/></g></svg>'
};

function crearFichas(){
  const cm = $('modulos'); cm.innerHTML='';
  MODULOS.forEach(m=>{
    const b = document.createElement('button');
    b.className='ficha modulo';
    b.innerHTML = `<div class="glifo">${GLIFOS[m.id]||''}</div>
      <div class="nombre"><span class="nom-txt">${m.nombre}</span><span class="nom-tasa"></span></div>
      <div class="detalle"></div>
      <div class="cant"></div>
      <div class="precio"></div>`;
    b.onclick = ()=>comprarModulo(m);
    cm.appendChild(b);
    ref[m.id] = {caja:b, glifo:b.querySelector('.glifo'), det:b.querySelector('.detalle'),
                 cant:b.querySelector('.cant'), pre:b.querySelector('.precio'),
                 nomTasa:b.querySelector('.nom-tasa')};
  });
}

function pintarMejoras(){
  const cu = $('mejoras'); cu.innerHTML='';
  const visibles = mejorasVisibles();
  if(visibles.length === 0){
    cu.innerHTML = '<p class="vacio">No hay mejoras disponibles ahora mismo. Consigue más módulos para desbloquearlas.</p>';
    return;
  }
  visibles.forEach(u=>{
    const b = document.createElement('button');
    b.className='ficha mejora';
    b.innerHTML = `<div class="nombre">${u.nombre}</div>
      <div class="detalle">${u.nota}</div>
      <div class="precio">${fmt(u.coste)}</div>`;
    b.disabled = s.j < u.coste;
    if(s.j >= u.coste) b.classList.add('asequible');
    b.onclick = ()=>{
      if(s.j < u.coste) return;
      s.j -= u.coste; s.mejoras.push(u.id);
      pintarMejoras(); guardar();
    };
    cu.appendChild(b);
  });
}

let modoCompra = 1; // 1, 10, 100 o 'max'
document.querySelectorAll('#selCompra .sel').forEach(btn=>{
  btn.onclick = ()=>{
    const v = btn.dataset.n;
    modoCompra = (v === 'max') ? 'max' : parseInt(v,10);
    document.querySelectorAll('#selCompra .sel').forEach(b=>b.classList.toggle('activo', b===btn));
  };
});

function comprarModulo(m){
  const k = (modoCompra === 'max') ? maxAsequible(m) : modoCompra;
  if(k < 1) return;
  const total = costeVarios(m, k);
  if(s.j < total) return;           // en modos fijos, exige poder pagar todo el lote
  s.j -= total; s.mod[m.id] += k;
  pintarMejoras(); guardar();
}

/* color del glifo según cuántas unidades de ESE módulo tengas */
const NIVELES = [
  {min:200, col:'#FF5E3A'},  // ardiendo
  {min:100, col:'#FF7A34'},  // naranja intenso
  {min:50,  col:'#F0A22E'},  // naranja
  {min:25,  col:'#B9D14A'},  // lima
  {min:10,  col:'#4FD0A6'},  // turquesa
  {min:0,   col:'#4FC3D9'}   // frío
];
function colorNivel(n){
  for(const nv of NIVELES){ if(n >= nv.min) return nv.col; }
  return '#4FC3D9';
}

/* ============ TOQUE EN EL NÚCLEO ============ */
$('nucleo').addEventListener('pointerdown', e=>{
  const g = porToque() + (tieneMejora('sismografo') ? 0.05 * porSegundo() : 0);
  s.j += g; s.totalCiclo += g; s.totalVida += g; s.toques++; s.toquesVida++;
  const chispa = document.createElement('div');
  chispa.className='chispa'; chispa.textContent='+'+fmt(g);
  const caja = $('nucleo').getBoundingClientRect();
  chispa.style.left = (e.clientX - caja.left - 12)+'px';
  chispa.style.top  = (e.clientY - caja.top  - 14)+'px';
  $('nucleo').appendChild(chispa);
  setTimeout(()=>chispa.remove(), 700);
  pintarMejoras();
});

/* ============ RECALIBRAR (prestigio) ============ */
$('recal').onclick = ()=>{
  const gana = isotoposAlRecalibrar();
  if(gana < 1) return;
  if(!confirm(`Recalibrar reinicia julios, módulos y mejoras.\n\nGanas ${gana} isótopo${gana>1?'s':''} (producción ×${fmt(Math.pow(1.05,gana))} para siempre).\n\n¿Seguimos?`)) return;
  mostrarCierre(gana);
};

// entrada de cierre (no va por profundidad): se lee antes de reiniciar
function mostrarCierre(gana){
  $('cierreCab').textContent = 'CIERRE DE POZO ' + String((s.recalibraciones||0)+1).padStart(2,'0');
  $('cierreTxt').textContent = 'Muestra estabilizada: ' + gana + ' isótopo' + (gana>1?'s':'') + '.\n\nEl pozo no ha colapsado. Se ha cerrado.\nRecomiendo emplazamiento nuevo a 400 m del anterior.';
  $('cierre').classList.add('on');
  $('cierreOk').onclick = ()=>{ $('cierre').classList.remove('on'); hacerRecalibrado(gana); };
}

function hacerRecalibrado(gana){
  const iso = s.isotopos + gana;
  const vida = {
    totalVida: s.totalVida, tiempoJuego: s.tiempoJuego, mejorTasa: s.mejorTasa,
    toquesVida: s.toquesVida, recalibraciones: (s.recalibraciones||0) + 1,
    registro: s.registro, registroLeidos: s.registroLeidos,  // el registro NO se pierde
    logros: s.logros                                          // los hitos tampoco
  };
  s = nuevaPartida(); s.isotopos = iso; Object.assign(s, vida);
  pintarMejoras(); guardar();
}

$('borrar').onclick = ()=>{
  if(!confirm('Se borra todo, incluidos los isótopos. ¿Seguro?')) return;
  s = nuevaPartida(); pintarMejoras(); guardar();
};

/* ============ ESTADÍSTICAS ============ */
function renderStats(){
  const totalModulos = MODULOS.reduce((t,m)=>t+s.mod[m.id], 0);
  const filas = [
    ['Tiempo jugado',       fmtTiempo(s.tiempoJuego)],
    ['Julios de por vida',  fmt(s.totalVida)],
    ['Mejor producción',    fmt(s.mejorTasa)+' J/s'],
    ['Producción actual',   fmt(porSegundo())+' J/s'],
    ['Toques de por vida',  fmt(s.toquesVida)],
    ['Módulos instalados',  fmt(totalModulos)],
    ['Isótopos',            s.isotopos],
    ['Recalibraciones',     s.recalibraciones||0]
  ];
  $('statsPanel').innerHTML = filas.map(f=>
    `<div class="stat-fila"><span class="etq">${f[0]}</span><span class="val">${f[1]}</span></div>`
  ).join('');
}
function renderEstadoSistema(){
  // Diagnóstico visual: deriva del estado real, sin afectar a la simulación.
  const prof = profundidad();
  const jps = porSegundo();
  const instalados = totalModulos();
  const desgaste = Math.min(34, Math.log10(prof + 1) * 2.55);
  const cargaTermica = Math.min(46, Math.log10(jps + 1) * 7.4);
  const integridad = Math.max(66, Math.round(100 - desgaste));
  const refrigeracion = Math.max(54, Math.round(100 - cargaTermica));
  const energia = instalados ? Math.min(100, Math.round(18 + Math.log10(jps + 1) * 16 + Math.min(35, instalados * 2))) : 0;
  const estado = Math.min(integridad, refrigeracion);
  const poner = (valor, barra, nota, porcentaje, texto, alerta=false) => {
    $(valor).textContent = porcentaje + '%';
    $(barra).style.width = porcentaje + '%';
    $(nota).textContent = texto;
    $(barra).parentElement.parentElement.classList.toggle('alerta', alerta);
  };
  poner('saludIntegridad','barraIntegridad','saludIntegridadNota',integridad, integridad > 82 ? 'REVESTIMIENTO ESTABLE' : 'COMPENSACIÓN ACTIVA', integridad < 76);
  poner('saludRefrigeracion','barraRefrigeracion','saludRefrigeracionNota',refrigeracion, refrigeracion > 76 ? 'CARGA TÉRMICA CONTROLADA' : 'CARGA TÉRMICA ELEVADA', refrigeracion < 68);
  poner('saludEnergia','barraEnergia','saludEnergiaNota',energia, instalados ? 'RED DE MÓDULOS ACTIVA' : 'MÓDULOS EN ESPERA');
  $('estadoGeneral').textContent = estado > 82 ? 'NOMINAL' : estado > 68 ? 'SUPERVISAR' : 'ATENCIÓN';
}
function renderEventosRecientes(){
  const eventos = [];
  const prof = profundidad();
  const visibles = mejorasVisibles();
  if(s.recalibraciones) eventos.push(['CIERRE CONFIRMADO','Pozo ' + String(s.recalibraciones + 1).padStart(2,'0') + ' en operación · ' + s.isotopos + ' isótopos recuperados.','ok']);
  eventos.push(['EXTRACCIÓN ACTIVA', prof ? 'Sonda a ' + fmtMetros(prof) + ' m · ' + estratoDe(prof) + '.':'Esperando la primera extracción manual.','activo']);
  if(visibles.length) eventos.push(['MEJORA DISPONIBLE', visibles[0].nombre + ' · inversión de ' + fmt(visibles[0].coste) + ' J.','alerta']);
  else eventos.push(['LABORATORIO', 'Sin mejoras desbloqueadas. Amplía la red de módulos.','info']);
  const ultimoRegistro = s.registro.length && typeof REGISTRO !== 'undefined' ? REGISTRO.find(e=>e.id === s.registro[s.registro.length-1]) : null;
  if(ultimoRegistro) eventos.push(['REGISTRO ACTUALIZADO', 'REG-' + ultimoRegistro.id + ' · lectura a ' + fmtMetros(ultimoRegistro.m) + ' m.','info']);
  $('eventosRecientes').innerHTML = eventos.slice(0,4).map(e=>
    '<article class="evento '+e[2]+'"><i></i><div><strong>'+e[0]+'</strong><span>'+e[1]+'</span></div></article>'
  ).join('');
  $('eventosEstado').textContent = eventos.length + ' SEÑALES';
}
function renderSistema(){
  renderStats();
  renderHitos();
  renderEstadoSistema();
  renderEventosRecientes();
}
function actualizarResumenEquipo(jps = porSegundo()){
  const total = totalModulos();
  const disponibles = mejorasVisibles().length;
  $('totalMod').textContent = total;
  $('capacidadEquipo').textContent = fmt(jps) + ' J/s';
  $('mejorasResumen').textContent = s.mejoras.length;
  $('mejorasDisponibles').textContent = disponibles ? disponibles + ' DISPONIBLE' + (disponibles > 1 ? 'S':'') : 'EN ESPERA';
}

/* la pestaña de estadísticas llama a renderStats() al abrirse (ver navegación) */

/* ============ REGISTRO DE PERFORACIÓN ============ */
function comprobarRegistro(){
  if(typeof REGISTRO === 'undefined') return;
  const prof = profundidad();
  const pozoActual = (s.recalibraciones||0)+1;
  let nuevas = false;
  REGISTRO.forEach(e=>{
    if(s.registro.includes(e.id)) return;
    if(prof >= e.m && (!e.pozo || pozoActual >= e.pozo)){ s.registro.push(e.id); nuevas = true; }
  });
  if(nuevas){
    if(pestanaActiva === 'registro'){ marcarLeidas(); pintarRegistro(); }
    else actualizarBadge();
  }
}
function actualizarBadge(){
  const noLeidas = s.registro.filter(id=>!s.registroLeidos.includes(id)).length;
  const b = $('regBadge');
  if(noLeidas > 0){ b.textContent = noLeidas > 9 ? '9+' : noLeidas; b.classList.add('on'); }
  else b.classList.remove('on');
}
function marcarLeidas(){ s.registroLeidos = [...s.registro]; actualizarBadge(); }
function pintarRegistro(){
  const cont = $('registroLista'); cont.innerHTML = '';
  if(s.registro.length === 0){
    cont.innerHTML = '<p class="vacio">Sin entradas. El registro se completa al perforar más hondo.</p>';
    return;
  }
  [...s.registro].reverse().forEach(id=>{   // más reciente primero
    const e = REGISTRO.find(x=>x.id === id);
    if(!e) return;
    const div = document.createElement('div');
    div.className = 'reg-entrada' + (e.final ? ' final' : '');
    div.innerHTML = `<div class="reg-cab">REG-${e.id} · ${fmtMetros(e.m)} m</div><div class="reg-txt"></div>`;
    div.querySelector('.reg-txt').textContent = e.txt;
    cont.appendChild(div);
  });
}

/* ============ HITOS ============ */
const totalModulos = () => MODULOS.reduce((t,m)=>t+s.mod[m.id], 0);
const LOGROS = [
  {id:'arranque',   nombre:'ARRANQUE',                 desc:'Instala el primer módulo.',          cond:()=>totalModulos()>=1},
  {id:'mejora1',    nombre:'PRIMERA CALIBRACIÓN',      desc:'Compra una mejora.',                 cond:()=>s.mejoras.length>=1},
  {id:'km1',        nombre:'PRIMER KILÓMETRO',         desc:'Alcanza 1.000 m.',                   cond:()=>profundidad()>=1000},
  {id:'toques100',  nombre:'EXTRACCIÓN MANUAL',        desc:'100 extracciones manuales.',         cond:()=>s.toquesVida>=100},
  {id:'cierre1',    nombre:'PRIMER CIERRE',            desc:'Cierra un pozo y abre otro.',        cond:()=>s.recalibraciones>=1},
  {id:'muestra1',   nombre:'PRIMERA MUESTRA',          desc:'Sube 1 isótopo a superficie.',       cond:()=>s.isotopos>=1},
  {id:'tasa1k',     nombre:'1 kJ/s',                   desc:'Producción máxima de 1.000 J/s.',    cond:()=>s.mejorTasa>=1e3},
  {id:'kola',       nombre:'RÉCORD DE KOLA',           desc:'Alcanza 12.262 m.',                  cond:()=>profundidad()>=12262},
  {id:'cien',       nombre:'CIEN SONDAS',              desc:'Instala 100 sondas térmicas.',       cond:()=>s.mod.sonda>=100},
  {id:'toques1k',   nombre:'PERCUSIÓN CONSTANTE',      desc:'1.000 extracciones manuales.',       cond:()=>s.toquesVida>=1000},
  {id:'moho',       nombre:'DISCONTINUIDAD DE MOHO',   desc:'Atraviesa la corteza (35.000 m).',   cond:()=>profundidad()>=35000},
  {id:'tasa1M',     nombre:'1 MJ/s',                   desc:'Producción máxima de 1 millón J/s.', cond:()=>s.mejorTasa>=1e6},
  {id:'catalogo',   nombre:'CATÁLOGO COMPLETO',        desc:'Ten al menos uno de cada módulo.',   cond:()=>MODULOS.every(m=>s.mod[m.id]>=1)},
  {id:'pozo5',      nombre:'QUINTO EMPLAZAMIENTO',     desc:'Llega al pozo 5.',                   cond:()=>s.recalibraciones>=4},
  {id:'masiva',     nombre:'INSTALACIÓN MASIVA',       desc:'500 módulos instalados.',            cond:()=>totalModulos()>=500},
  {id:'manto',      nombre:'MANTO INFERIOR',           desc:'Alcanza 660.000 m.',                 cond:()=>profundidad()>=660000},
  {id:'tasa1G',     nombre:'1 GJ/s',                   desc:'Producción máxima de 1.000 M J/s.',  cond:()=>s.mejorTasa>=1e9},
  {id:'muestras100',nombre:'CIEN MUESTRAS',            desc:'Acumula 100 isótopos.',              cond:()=>s.isotopos>=100},
  {id:'gutenberg',  nombre:'NÚCLEO EXTERNO',           desc:'Alcanza 2.890.000 m.',               cond:()=>profundidad()>=2890000},
  {id:'pozo10',     nombre:'DÉCIMO EMPLAZAMIENTO',     desc:'Llega al pozo 10.',                  cond:()=>s.recalibraciones>=9},
  {id:'centro',     nombre:'CENTRO GEOMÉTRICO',        desc:'Alcanza 6.371.000 m.',               cond:()=>profundidad()>=6371000}
];

function comprobarLogros(){
  const nuevos = [];
  LOGROS.forEach(l=>{
    if(s.logros.includes(l.id)) return;
    if(l.cond()){ s.logros.push(l.id); nuevos.push(l); }
  });
  if(nuevos.length){
    mostrarHitoToast(nuevos);
    if(pestanaActiva === 'sistema') renderHitos();
  }
}
function mostrarHitoToast(nuevos){
  const t = $('hitoToast');
  t.textContent = 'HITO · ' + nuevos[0].nombre + (nuevos.length>1 ? '  (+'+(nuevos.length-1)+')' : '');
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove('on'), 3500);
}
function renderHitos(){
  const total = LOGROS.length, hechos = s.logros.length;
  $('hitosResumen').textContent = hechos+'/'+total+' · +'+(hechos*2)+'%';
  const cont = $('hitosLista'); cont.innerHTML = '';
  LOGROS.forEach(l=>{
    const hecho = s.logros.includes(l.id);
    const div = document.createElement('div');
    div.className = 'hito' + (hecho ? ' logrado' : '');
    div.innerHTML = `<div class="hito-nom">${l.nombre}</div><div class="hito-desc">${l.desc}</div>`;
    cont.appendChild(div);
  });
}

/* ============ EXPORTAR / IMPORTAR PARTIDA ============
   Sincronización manual entre dispositivos mediante un código de texto.
   No sale nada a ningún servidor: el código lo mueves tú (copiar/pegar). */
function codificar(str){ return btoa(unescape(encodeURIComponent(str))); }
function decodificar(code){ return decodeURIComponent(escape(atob(code))); }

$('btnExportar').onclick = ()=>{
  guardar();
  const code = 'NUCLEO:' + codificar(JSON.stringify(s));
  const area = $('datosArea');
  area.style.display = 'block';
  area.value = code;
  $('btnCargar').style.display = 'none';
  area.focus(); area.select();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code)
      .then(()=> $('datosMsg').textContent = '✓ Código copiado. Ábrelo en el otro dispositivo, pulsa "Importar" y pégalo.')
      .catch(()=> $('datosMsg').textContent = 'Copia a mano el código de arriba y pégalo en el otro dispositivo.');
  } else {
    $('datosMsg').textContent = 'Copia a mano el código de arriba y pégalo en el otro dispositivo.';
  }
};

$('btnImportar').onclick = ()=>{
  const area = $('datosArea');
  area.style.display = 'block';
  area.value = '';
  $('btnCargar').style.display = 'block';
  area.focus();
  $('datosMsg').textContent = 'Pega aquí el código del otro dispositivo y pulsa "Cargar".';
};

$('btnCargar').onclick = ()=>{
  let code = $('datosArea').value.trim();
  if(!code){ $('datosMsg').textContent = 'No hay ningún código pegado.'; return; }
  if(code.startsWith('NUCLEO:')) code = code.slice(7);
  let datos;
  try{ datos = JSON.parse(decodificar(code)); }
  catch(e){ $('datosMsg').textContent = '✗ El código no es válido.'; return; }
  if(!datos || typeof datos.j !== 'number' || typeof datos.mod !== 'object'){
    $('datosMsg').textContent = '✗ Ese código no parece una partida de Núcleo.'; return;
  }
  if(!confirm('Esto reemplazará la partida de ESTE dispositivo por la del código. ¿Seguro?')) return;
  s = Object.assign(nuevaPartida(), datos);
  MODULOS.forEach(m=>{ if(typeof s.mod[m.id] !== 'number') s.mod[m.id]=0; });
  guardar();
  crearFichas(); pintarMejoras();
  $('datosArea').style.display = 'none';
  $('btnCargar').style.display = 'none';
  $('datosMsg').textContent = '✓ Partida importada correctamente.';
};

/* ============ COLOR SEGÚN CALOR ============ */
function mezclar(a,b,t){
  const h = x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16));
  const [r1,g1,b1]=h(a), [r2,g2,b2]=h(b);
  const c = (u,v)=>Math.round(u+(v-u)*t).toString(16).padStart(2,'0');
  return '#'+c(r1,r2)+c(g1,g2)+c(b1,b2);
}
function tonoActual(jps){
  const t = Math.max(0, Math.min(1, Math.log10(jps+1)/6));
  const col = t < .5 ? mezclar('#4FC3D9','#F0A22E', t*2)
                     : mezclar('#F0A22E','#FF5E3A',(t-.5)*2);
  document.documentElement.style.setProperty('--tono', col);
  document.documentElement.style.setProperty('--pulso', (3.2 - t*2.2).toFixed(2)+'s');
}

function actualizarInstrumentos(profM, jps){
  // Lecturas decorativas, pero coherentes con la profundidad: no modifican mecánicas.
  const km = profM / 1000;
  const temperatura = Math.max(14, 16 + km * 24 - Math.sin(km * .8) * Math.min(18, km * 2));
  const presion = Math.max(.1, profM * .027);
  const densidad = Math.min(12.8, 2.70 + Math.log10(profM + 1) * .49);
  const periodo = profM < 3000 ? 'EN MUESTREO' : (Math.max(.4, 41 - Math.log10(profM / 3000 + 1) * 12)).toFixed(profM > 120000 ? 1 : 0).replace('.', ',') + ' s';
  $('instTemperatura').textContent = Math.round(temperatura).toString() + ' °C';
  $('instPresion').textContent = presion < 10 ? presion.toFixed(1).replace('.', ',') + ' MPa' : Math.round(presion).toString() + ' MPa';
  $('instDensidad').textContent = densidad.toFixed(2).replace('.', ',') + ' g/cm³';
  $('instPeriodo').textContent = periodo;
  // Escala logarítmica: permite que los primeros metros y el núcleo sean legibles en el mismo perfil.
  const posicion = Math.min(98, Math.max(2, Math.log10(profM + 1) / Math.log10(6371001) * 96));
  $('marcadorProfundidad').style.top = posicion.toFixed(2) + '%';
  $('telemetriaEstado').textContent = jps > 0 ? 'ACTIVO · 60 s' : 'EN ESPERA · 60 s';
}

/* ============ GRÁFICA DE LOS ÚLTIMOS 60 s ============ */
const historial = new Array(60).fill(0);
function pintarGrafica(){
  const max = Math.max(...historial, 1);
  const pts = historial.map((v,i)=>{
    const x = i/59*300;
    const y = 43 - (v/max)*40;
    return (i?'L':'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  });
  const linea = pts.join(' ');
  $('linea').setAttribute('d', linea);
  $('areaGrafica').setAttribute('d', linea + ' L300 44 L0 44 Z');
  const ultimoPunto = historial[historial.length-1];
  $('puntoGrafica').setAttribute('cx', '300');
  $('puntoGrafica').setAttribute('cy', (43 - (ultimoPunto/max)*40).toFixed(1));
}

/* ============ BUCLE PRINCIPAL ============
   La simulación sigue usando requestAnimationFrame para que los intervalos sean
   precisos. La interfaz se actualiza a 10 fps como máximo: los números no
   necesitan 60 escrituras DOM por segundo y la batería del móvil lo agradece. */
let ultimo = performance.now(), acumTic = 0, acumGuardado = 0, acumRender = 0;
let senalDurActual = null, rafId = null, motorPausado = false;
const INTERVALO_RENDER = .1;

function bucle(ahora){
  if(motorPausado || document.hidden) return;
  const dt = Math.min((ahora - ultimo)/1000, 1);
  ultimo = ahora;

  const jps = porSegundo();
  const ganado = jps * dt;
  s.j += ganado; s.totalCiclo += ganado; s.totalVida += ganado;
  s.tiempoJuego += dt;
  if(jps > s.mejorTasa) s.mejorTasa = jps;

  acumTic += dt;
  if(acumTic >= 1){
    acumTic = 0; historial.push(jps); historial.shift();
    if(pestanaActiva === 'sondeo') pintarGrafica();
    if(pestanaActiva === 'sistema') renderSistema();
    comprobarRegistro();
    comprobarLogros();
    const dur = Math.max(2.2, 6 - Math.log10(profundidad()+10)*0.5).toFixed(1);
    if(dur !== senalDurActual){ senalDurActual = dur; document.documentElement.style.setProperty('--senal-dur', dur+'s'); }
  }

  acumGuardado += dt;
  if(acumGuardado >= 5){ acumGuardado = 0; guardar(); }

  acumRender += dt;
  if(acumRender >= INTERVALO_RENDER){
    acumRender = 0;
    dibujar(jps);
  }
  rafId = requestAnimationFrame(bucle);
}

function dibujar(jps){
  if(pestanaActiva === 'equipo'){
    dibujarEquipo(jps);
    return;
  }
  if(pestanaActiva !== 'sondeo') return;

  $('julios').textContent = fmt(s.j);
  $('tasa').textContent = fmt(jps)+' J/s';
  tonoActual(jps);

  // --- lore: profundidad del pozo ---
  const profM = profundidad();
  $('prof').textContent = fmtMetros(profM) + ' m';
  const nombreEstrato = estratoDe(profM);
  if($('estrato').textContent !== nombreEstrato){
    $('estrato').textContent = nombreEstrato;
    activarTransicionEstrato();
  }
  $('radarProfundidad').textContent = fmtMetros(profM) + ' m';
  actualizarInstrumentos(profM, jps);
  $('cabPozo').textContent = 'POZO ' + String((s.recalibraciones||0)+1).padStart(2,'0') + ' · SONDEO PROFUNDO';

  // anillo: avance hacia el siguiente isótopo
  const actual = isotoposAlRecalibrar();
  const desde = Math.pow(actual,2)*UMBRAL;
  const hasta = Math.pow(actual+1,2)*UMBRAL;
  const p = Math.max(0, Math.min(1, (s.totalCiclo - desde)/(hasta - desde)));
  document.querySelector('#anillo .carga').setAttribute('stroke-dashoffset', 553*(1-p));

  const falta = (hasta - s.totalCiclo)/Math.max(jps, 0.0001);
  $('restante').textContent = actual >= 1
      ? 'siguiente isótopo en ' + (jps>0 ? fmtTiempo(falta) : '—')
      : 'primer isótopo al ' + Math.floor(p*100) + '%';

  const gana = isotoposAlRecalibrar();
  actualizarMuestra(gana, profM);
  const boton = $('recal');
  boton.style.display = (gana >= 1) ? 'block' : 'none';
  if(gana >= 1) boton.innerHTML =
    `<span class="protocolo-codigo">PROTOCOLO Δ-${String((s.recalibraciones||0)+1).padStart(2,'0')}</span><strong>RECALIBRAR INSTRUMENTACIÓN</strong><small>Recuperar ${gana} isótopo${gana>1?'s':''} · reinicia el ciclo · ×${fmt(Math.pow(1.05,gana))} permanente</small>`;

  const multIso = Math.pow(tieneMejora('enriq')?1.07:1.05, s.isotopos);
  $('isotopos').textContent = s.isotopos
    ? s.isotopos+' isótopos · ×'+fmt(multIso) : 'sin isótopos';
}

function dibujarEquipo(jps){
  let totalMod = 0;
  MODULOS.forEach(m=>{
    const r = ref[m.id], n = s.mod[m.id];
    totalMod += n;
    let k, coste, puedo;
    if(modoCompra === 'max'){
      k = maxAsequible(m);
      coste = costeVarios(m, Math.max(k,1));
      puedo = k >= 1;
    }else{
      k = modoCompra;
      coste = costeVarios(m, k);
      puedo = s.j >= coste;
    }
    r.cant.textContent = n || '';
    r.pre.textContent  = (modoCompra === 'max' && k >= 1) ? (k + '× ' + fmt(coste)) : fmt(coste);
    r.det.textContent  = n ? fmt(produccionDe(m))+' J/s' : '+'+fmt(m.prod*multiplicadorDe(m.id)*bonusGlobal())+' J/s';
    r.nomTasa.textContent = n ? fmt(m.prod*multiplicadorDe(m.id)*bonusGlobal())+' J/s' : '';
    r.caja.classList.toggle('asequible', puedo);
    r.caja.classList.toggle('activo', n>0);
    r.glifo.style.color = n>0 ? colorNivel(n) : '';
    r.caja.disabled = !puedo;
  });
  $('totalMod').textContent = totalMod;
  actualizarResumenEquipo(jps);
  const vis = mejorasVisibles();
  const fichasMejoras = $('mejoras').querySelectorAll('.ficha');
  fichasMejoras.forEach((b,i)=>{
    const u = vis[i];
    if(!u) return;
    const puedo = s.j >= u.coste;
    b.disabled = !puedo; b.classList.toggle('asequible', puedo);
  });
}

/* ============ GUARDAR Y CARGAR ============ */
function guardar(){
  s.t = Date.now();
  Guardado.escribir(CLAVE, JSON.stringify(s));
}

// Aplica la producción del tiempo que la app estuvo cerrada o en segundo plano.
// "desde" = marca de tiempo en que se guardó al salir. Tope: 8 h (24 h con batería).
function aplicarAusencia(desde){
  const tope = tieneMejora('bateria') ? 24*3600 : TOPE_AUSENTE;
  const fuera = Math.min((Date.now() - (desde || Date.now()))/1000, tope);
  if(fuera > 60){
    const extra = porSegundo() * fuera;
    if(extra > 0){
      s.j += extra; s.totalCiclo += extra; s.totalVida += extra;
      const aviso = $('offline');
      aviso.innerHTML = `Mientras no estabas (${fmtTiempo(fuera)}) el reactor siguió trabajando: <b>+${fmt(extra)} J</b>`;
      aviso.style.display = 'block';
      aviso.onclick = ()=>aviso.style.display='none';
    }
  }
}

async function cargar(){
  const bruto = await Guardado.leer(CLAVE);
  if(bruto){
    try{
      const d = JSON.parse(bruto);
      s = Object.assign(nuevaPartida(), d);
      MODULOS.forEach(m=>{ if(typeof s.mod[m.id] !== 'number') s.mod[m.id]=0; });
      if(typeof d.totalVida !== 'number') s.totalVida = s.totalCiclo;
      if(typeof d.toquesVida !== 'number') s.toquesVida = s.toques;

      aplicarAusencia(d.t);
    }catch(e){ /* partida corrupta: empezamos de cero */ }
  }
  crearFichas(); pintarMejoras();
  comprobarRegistro(); actualizarBadge(); comprobarLogros();
  rafId = requestAnimationFrame(t=>{ ultimo = t; bucle(t); });
}
// reinicia el motor del juego (por si iOS lo detuvo en segundo plano)
function reiniciarMotor(){
  if(rafId) cancelAnimationFrame(rafId);
  motorPausado = false;
  acumRender = INTERVALO_RENDER;
  ultimo = performance.now();
  rafId = requestAnimationFrame(bucle);
}

function pausarMotor(){
  motorPausado = true;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

// iOS congela la pestaña sin avisar: guardamos al salir y acumulamos al volver
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    guardar();
    pausarMotor();
  }else{
    // volvió de segundo plano: acumula lo producido mientras estuvo fuera
    aplicarAusencia(s.t);
    comprobarRegistro(); comprobarLogros();
    guardar();
    reiniciarMotor();   // por si iOS detuvo el bucle en segundo plano
  }
});
window.addEventListener('pagehide', guardar);

/* ============ NAVEGACIÓN ENTRE PESTAÑAS ============ */
let pestanaActiva = 'sondeo';
const _paginas = document.querySelectorAll('.pagina');
const _navTabs = document.querySelectorAll('#navbar .nav-tab');
function mostrarPagina(id){
  pestanaActiva = id;
  document.documentElement.classList.toggle('vista-no-sondeo', id !== 'sondeo');
  _paginas.forEach(p => p.classList.toggle('oculta', p.dataset.pag !== id));
  _navTabs.forEach(t => t.classList.toggle('activo', t.dataset.pag === id));
  if(id === 'equipo')   pintarMejoras();
  if(id === 'sistema') renderSistema();
  if(id === 'registro'){ marcarLeidas(); pintarRegistro(); guardar(); }
  window.scrollTo(0, 0);
  acumRender = INTERVALO_RENDER;
}
_navTabs.forEach(t => t.onclick = ()=> mostrarPagina(t.dataset.pag));

/* onda de la señal de fondo: seno repetible de 80 px que se desliza en bucle */
(function pintarSenalFondo(){
  const w=80, h=24, amp=7, mid=12;
  let d='M0 '+mid;
  for(let x=0; x<=w; x+=2){ d += ' L'+x+' '+(mid - Math.sin(x/w*Math.PI*2)*amp).toFixed(2); }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><path d='${d}' fill='none' stroke='#4FC3D9' stroke-width='1.2'/></svg>`;
  $('senal').style.backgroundImage = 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
})();

cargar();

/* ============ SISTEMA DE ACTUALIZACIÓN ============
   VERSION: súbela en 1 cada vez que publiques cambios,
   y pon el mismo número en el archivo version.json.
   Así la app sabe cuándo hay algo nuevo publicado. */
const VERSION = 26;
$('version').textContent = 'v' + VERSION;

// Registra el service worker (copia offline). Cuando confirme que
// ha refrescado la copia, recargamos para mostrar lo nuevo.
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
  navigator.serviceWorker.addEventListener('message', e=>{
    if(e.data === 'actualizado') location.reload();
  });
}

// Comprueba en silencio si hay una versión más nueva publicada.
function comprobarActualizacion(){
  fetch('./version.json', {cache:'no-store'})
    .then(r=>r.json())
    .then(d=>{
      if(d && d.v > VERSION){
        const b = $('actualiza');
        b.textContent = '✨ Nueva versión disponible · toca para actualizar';
        b.style.display = 'block';
        b.onclick = ()=>{
          b.textContent = 'Actualizando…';
          const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
          if(sw){
            sw.postMessage('actualizar');
            setTimeout(()=>location.reload(), 2000); // red de seguridad
          }else{
            location.reload();
          }
        };
      }
    })
    .catch(()=>{ /* sin conexión: no pasa nada */ });
}
comprobarActualizacion();
// Vuelve a comprobar cada vez que regresas a la app.
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) comprobarActualizacion(); });


/* ============ FASE 5 · MICROANIMACIONES ============ */
function activarTransicionEstrato(){
  const perfil = $('perfilGeologico');
  perfil.classList.remove('estrato-cambia');
  void perfil.offsetWidth;
  perfil.classList.add('estrato-cambia');
}

function dispararMuestraDetectada(){
  const muestra = $('muestraIsotopo');
  muestra.classList.remove('muestra-detectada');
  void muestra.offsetWidth;
  muestra.classList.add('muestra-detectada');
}

(function activarMicrointeracciones(){
  const nucleo = $('nucleo');

  function reiniciarClase(elemento, clase){
    elemento.classList.remove(clase);
    void elemento.offsetWidth;
    elemento.classList.add(clase);
  }

  function crearPulsoExtraccion(origen){
    const pulso = document.createElement('i');
    pulso.className = 'pulso-extraccion';
    const rect = origen.getBoundingClientRect();
    pulso.style.setProperty('--x', (18 + Math.random() * 64).toFixed(0) + '%');
    pulso.style.setProperty('--y', (18 + Math.random() * 64).toFixed(0) + '%');
    origen.appendChild(pulso);
    pulso.addEventListener('animationend', ()=> pulso.remove(), {once:true});
  }

  nucleo.addEventListener('pointerdown', ()=>{
    reiniciarClase(nucleo, 'extraccion-activa');
    crearPulsoExtraccion(nucleo);
  }, {passive:true});

  document.addEventListener('click', evento=>{
    const boton = evento.target.closest('#modulos .ficha, #mejoras .ficha, #recal, #cierreOk, #selCompra .sel, #navbar .nav-tab');
    if(!boton || boton.disabled) return;
    reiniciarClase(boton, 'confirmacion-accion');
    if(boton.matches('#modulos .ficha, #mejoras .ficha, #recal')) crearPulsoExtraccion(boton);
  });

  document.addEventListener('visibilitychange', ()=>{
    document.documentElement.classList.toggle('aplicacion-pausada', document.hidden);
  });
})();
