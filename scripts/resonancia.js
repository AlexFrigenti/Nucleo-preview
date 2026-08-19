/* ============================================================
   NUCLEO · GEOLOGIA ACTIVA · RESONANCIA MINERAL (ZONA DE TRANSICION)
   ------------------------------------------------------------
   Nucleo logico puro, determinista e inmutable para el vertical
   slice de Resonancia Mineral (410 km - 660 km).
   Compatible con classic browser scripts y Node.js (CJS/ESM).
   ============================================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ResonanciaMineral = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STRATUM_MIN = 410000;
  const STRATUM_MAX = 660000;
  const PUNTO_MIN = 500000;
  const PUNTO_MAX = 560000;
  const PERIODO_MIN = 36.0;
  const PERIODO_MAX = 46.0;
  const ANTICIPACION_BASE = 20000;
  const ANTICIPACION_MEJORADA = 50000;
  const DURACION_EXTRACCION_MS = 60000;
  const MULTIPLICADOR_EXTRACCION = 1.50;

  function calcularPuntoResonancia(numeroPozo) {
    const pozo = Math.max(1, Math.floor(Number(numeroPozo) || 1));
    const seed = (pozo * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const steps = (PUNTO_MAX - PUNTO_MIN) / 1000;
    return PUNTO_MIN + Math.floor(rnd * (steps + 1)) * 1000;
  }

  function calcularPeriodoResonancia(numeroPozo, puntoM) {
    const pozo = Math.max(1, Math.floor(Number(numeroPozo) || 1));
    const p = Math.max(0, Math.floor(Number(puntoM) || PUNTO_MIN));
    const seed = (pozo * 49297 + p * 9301) % 233280;
    const rnd = seed / 233280;
    let step = Math.floor(rnd * 100);
    if (step >= 50) {
      step += 1;
    }
    let val = +(PERIODO_MIN + step * 0.1).toFixed(1);
    if (Math.abs(val - 41.0) < 0.05) {
      val = 38.7;
    }
    return val;
}

  function formatearPeriodoResonancia(periodo) {
    let val = Number(periodo);
    if (!isFinite(val) || Math.abs(val - 41.0) < 0.05) {
      val = 38.7;
    }
    const formatted = val.toFixed(1).replace('.', ',') + ' s';
    if (formatted === '41,0 s' || formatted === '41.0 s') {
      return '38,7 s';
    }
    return formatted;
  }

  function calcularRangoAnticipacion(anticipacionResonante) {
    return anticipacionResonante ? ANTICIPACION_MEJORADA : ANTICIPACION_BASE;
  }

  function calcularUmbralAnticipacion(puntoM, anticipacionResonante) {
    const p = Number(puntoM) || PUNTO_MIN;
    const rango = calcularRangoAnticipacion(anticipacionResonante);
    return Math.max(STRATUM_MIN, p - rango);
  }

  function crearEstadoResonancia(numeroPozo, anticipacionResonante = false) {
    const punto = calcularPuntoResonancia(numeroPozo);
    const periodo = calcularPeriodoResonancia(numeroPozo, punto);
    return {
      puntoM: punto,
      periodoSeg: periodo,
      estado: 'DORMANT',
      modoResuelto: null,
      extraccionHasta: 0
    };
  }

  function evaluarEstadoResonancia(estadoActual, profM, anticipacionResonante = false) {
    const estado = estadoActual ? { ...estadoActual } : crearEstadoResonancia(1, anticipacionResonante);
    const prof = Number(profM) || 0;

    if (estado.estado === 'RESOLVED' || estado.estado === 'TUNING') {
      return estado;
    }

    if (prof >= estado.puntoM) {
      estado.estado = 'DETECTED';
      return estado;
    }

    const umbral = calcularUmbralAnticipacion(estado.puntoM, anticipacionResonante);
    if (prof >= umbral) {
      estado.estado = 'ANTICIPATING';
      return estado;
    }

    estado.estado = 'DORMANT';
    return estado;
  }

  function resolverAccionResonancia(estadoActual, accion, context = {}) {
    const estado = { ...estadoActual };
    const now = typeof context.now === 'number' ? context.now : Date.now();
    const prevRecuperadas = Number(context.resonanciasMineralesRecuperadas) || 0;

    if (accion === 'IGNORAR') {
      if (estado.estado !== 'DETECTED') return { estadoResonancia: estado };
      estado.estado = 'RESOLVED';
      estado.modoResuelto = 'IGNORED';
      estado.extraccionHasta = 0;
      return { estadoResonancia: estado };
    }

    if (accion === 'SINTONIZAR') {
      if (estado.estado !== 'DETECTED') return { estadoResonancia: estado };
      estado.estado = 'TUNING';
      estado.modoResuelto = null;
      return { estadoResonancia: estado };
    }

    if (accion === 'EXTRACCION') {
      if (estado.estado !== 'TUNING') return { estadoResonancia: estado };
      estado.estado = 'RESOLVED';
      estado.modoResuelto = 'EXTRACTION';
      estado.extraccionHasta = now + DURACION_EXTRACCION_MS;
      return { estadoResonancia: estado };
    }

    if (accion === 'MUESTREO') {
      if (estado.estado !== 'TUNING') return { estadoResonancia: estado };
      estado.estado = 'RESOLVED';
      estado.modoResuelto = 'SAMPLED';
      estado.extraccionHasta = 0;
      const nuevasRecuperadas = prevRecuperadas + 1;
      return {
        estadoResonancia: estado,
        resonanciasMineralesRecuperadas: nuevasRecuperadas,
        anticipacionResonante: true,
        desbloquearLore: prevRecuperadas === 0
      };
    }

    return { estadoResonancia: estado };
  }

  function esExtraccionActiva(estadoActual, now = Date.now()) {
    return Boolean(
      estadoActual &&
      estadoActual.modoResuelto === 'EXTRACTION' &&
      typeof estadoActual.extraccionHasta === 'number' &&
      estadoActual.extraccionHasta > now
    );
  }

  function tiempoRestanteExtraccion(estadoActual, now = Date.now()) {
    if (!esExtraccionActiva(estadoActual, now)) return 0;
    return Math.max(0, Math.ceil((estadoActual.extraccionHasta - now) / 1000));
  }

  function migrarEstadoResonancia(saveDataResonancia, numeroPozo, profundidadActual = 0, anticipacionResonante = false) {
    if (saveDataResonancia && typeof saveDataResonancia === 'object' && saveDataResonancia.puntoM) {
      return { ...saveDataResonancia };
    }
    const pozo = Math.max(1, Math.floor(Number(numeroPozo) || 1));
    const base = crearEstadoResonancia(pozo, anticipacionResonante);
    const prof = Number(profundidadActual) || 0;

    // Caso C: si ya supero la Zona de Transicion (> 660.000 m), queda resuelta como ignorada
    if (prof > STRATUM_MAX) {
      base.estado = 'RESOLVED';
      base.modoResuelto = 'IGNORED';
      return base;
    }

    // Casos A y B: evalua si esta en DORMANT, ANTICIPATING o DETECTED (dentro de Zona de Transicion)
    return evaluarEstadoResonancia(base, prof, anticipacionResonante);
  }

  function calcularProgresoAnticipacion(profM, puntoM, anticipacionResonante = false) {
    const prof = Number(profM);
    const punto = Number(puntoM);
    if (!isFinite(prof) || !isFinite(punto) || punto <= STRATUM_MIN) return 0.0;
    const umbral = calcularUmbralAnticipacion(punto, anticipacionResonante);
    if (prof <= umbral) return 0.0;
    if (prof >= punto) return 1.0;
    if (punto <= umbral) return 1.0;
    return Math.max(0.0, Math.min(1.0, (prof - umbral) / (punto - umbral)));
  }

  function calcularPeriodoMostrado(profM, estadoRes, anticipacionResonante = false, periodoNormal = null) {
    const prof = Number(profM) || 0;

    // Fuera de estados activos de Resonancia mineral, conserva exactamente la telemetria normal de v56
    if (!estadoRes || estadoRes.estado === 'DORMANT' || estadoRes.estado === 'RESOLVED') {
      if (typeof periodoNormal === 'string') {
        return periodoNormal;
      }
      return prof < 3000 ? 'EN MUESTREO' : (Math.max(0.4, 41 - Math.log10(prof / 3000 + 1) * 12)).toFixed(prof > 120000 ? 1 : 0).replace('.', ',') + ' s';
    }

    if (estadoRes.estado === 'ANTICIPATING') {
      const periodoBaseNum = prof < 3000 ? 41.0 : Math.max(0.4, 41 - Math.log10(prof / 3000 + 1) * 12);
      const p = calcularProgresoAnticipacion(prof, estadoRes.puntoM, anticipacionResonante);
      const periodoInterpolado = periodoBaseNum * (1 - p) + estadoRes.periodoSeg * p;
      return formatearPeriodoResonancia(periodoInterpolado);
    }

    if (estadoRes.estado === 'DETECTED' || estadoRes.estado === 'TUNING') {
      return formatearPeriodoResonancia(estadoRes.periodoSeg);
    }

    if (typeof periodoNormal === 'string') {
      return periodoNormal;
    }
    return prof < 3000 ? 'EN MUESTREO' : (Math.max(0.4, 41 - Math.log10(prof / 3000 + 1) * 12)).toFixed(prof > 120000 ? 1 : 0).replace('.', ',') + ' s';
  }

  function debeNotificarDeteccion(estadoAnterior, estadoNuevo){
    if(!estadoAnterior || !estadoNuevo) return false;
    return estadoAnterior !== 'DETECTED' && estadoNuevo === 'DETECTED';
  }

  function obtenerVistaResonancia(estadoRes, now = Date.now()) {
    if (!estadoRes || !estadoRes.estado) {
      return { visible: false, vista: 'OCULTO' };
    }

    if (estadoRes.estado === 'DETECTED') {
      return {
        visible: true,
        vista: 'DETECTED',
        puntoM: estadoRes.puntoM,
        periodoTexto: formatearPeriodoResonancia(estadoRes.periodoSeg)
      };
    }

    if (estadoRes.estado === 'TUNING') {
      return {
        visible: true,
        vista: 'TUNING',
        puntoM: estadoRes.puntoM,
        periodoTexto: formatearPeriodoResonancia(estadoRes.periodoSeg)
      };
    }

    if (estadoRes.estado === 'RESOLVED' && estadoRes.modoResuelto === 'EXTRACTION' && esExtraccionActiva(estadoRes, now)) {
      return {
        visible: true,
        vista: 'EXTRACTION_ACTIVA',
        tiempoRestante: tiempoRestanteExtraccion(estadoRes, now)
      };
    }

    return { visible: false, vista: 'OCULTO' };
  }

  return {
    STRATUM_MIN,
    STRATUM_MAX,
    PUNTO_MIN,
    PUNTO_MAX,
    PERIODO_MIN,
    PERIODO_MAX,
    ANTICIPACION_BASE,
    ANTICIPACION_MEJORADA,
    DURACION_EXTRACCION_MS,
    MULTIPLICADOR_EXTRACCION,
    calcularPuntoResonancia,
    calcularPeriodoResonancia,
    formatearPeriodoResonancia,
    calcularRangoAnticipacion,
    calcularUmbralAnticipacion,
    crearEstadoResonancia,
    evaluarEstadoResonancia,
    resolverAccionResonancia,
    esExtraccionActiva,
    tiempoRestanteExtraccion,
    migrarEstadoResonancia,
    calcularProgresoAnticipacion,
    calcularPeriodoMostrado,
    obtenerVistaResonancia,
    debeNotificarDeteccion
  };
}));

