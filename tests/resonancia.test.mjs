import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ResonanciaPkg from '../scripts/resonancia.js';

const Resonancia = ResonanciaPkg.default || ResonanciaPkg;

/* ============================================================
   1. GENERACION Y VALIDACION MATEMATICA DETERMINISTA
   ============================================================ */
test('1. calcularPuntoResonancia genera cotas entre 500.000 m y 560.000 m', () => {
  for (let pozo = 1; pozo <= 500; pozo++) {
    const punto = Resonancia.calcularPuntoResonancia(pozo);
    assert.ok(punto >= 500000, 'Punto menor a 500.000: ' + punto);
    assert.ok(punto <= 560000, 'Punto mayor a 560.000: ' + punto);
    assert.equal(punto % 1000, 0, 'Punto debe ser multiplo de 1000: ' + punto);
  }
});

test('2. calcularPuntoResonancia es determinista ante identico numero de pozo', () => {
  const p1 = Resonancia.calcularPuntoResonancia(5);
  const p2 = Resonancia.calcularPuntoResonancia(5);
  assert.equal(p1, p2);
});

test('3. calcularPuntoResonancia produce variedad razonable entre distintos pozos', () => {
  const puntos = new Set();
  for (let pozo = 1; pozo <= 20; pozo++) {
    puntos.add(Resonancia.calcularPuntoResonancia(pozo));
  }
  assert.ok(puntos.size >= 8, 'Debe generar variedad de cotas en 20 pozos');
});

test('4. calcularPeriodoResonancia genera valores en rango [36.0, 46.0] con resolucion 0.1', () => {
  for (let pozo = 1; pozo <= 500; pozo++) {
    const punto = Resonancia.calcularPuntoResonancia(pozo);
    const periodo = Resonancia.calcularPeriodoResonancia(pozo, punto);
    assert.ok(periodo >= 36.0, 'Periodo menor a 36.0: ' + periodo);
    assert.ok(periodo <= 46.0, 'Periodo mayor a 46.0: ' + periodo);
    assert.equal(+(periodo.toFixed(1)), periodo, 'Periodo no tiene resolucion 0.1: ' + periodo);
  }
});

test('5. Barrido exhaustivo de 50.000 pozos: NUNCA devuelven 41,0 s (Exclusion absoluta)', () => {
  for (let pozo = 1; pozo <= 50000; pozo++) {
    const punto = Resonancia.calcularPuntoResonancia(pozo);
    const periodo = Resonancia.calcularPeriodoResonancia(pozo, punto);
    const formatted = Resonancia.formatearPeriodoResonancia(periodo);

    assert.notEqual(periodo, 41.0, 'Periodo numerico 41.0 en pozo ' + pozo);
    assert.ok(Math.abs(periodo - 41.0) >= 0.09, 'Periodo proximo a 41.0 en pozo ' + pozo);
    assert.notEqual(formatted, '41,0 s', 'Texto formateado 41,0 s en pozo ' + pozo);
    assert.notEqual(formatted, '41.0 s', 'Texto formateado 41.0 s en pozo ' + pozo);
  }
});

test('6. formatearPeriodoResonancia garantiza seguridad incluso ante floating point imprevisto', () => {
  assert.equal(Resonancia.formatearPeriodoResonancia(38.7), '38,7 s');
  assert.equal(Resonancia.formatearPeriodoResonancia(41.0), '38,7 s');
  assert.equal(Resonancia.formatearPeriodoResonancia(40.9999999), '38,7 s');
  assert.equal(Resonancia.formatearPeriodoResonancia(41.0000001), '38,7 s');
  assert.equal(Resonancia.formatearPeriodoResonancia(40.95), '38,7 s');
  assert.equal(Resonancia.formatearPeriodoResonancia(41.04), '38,7 s');
});

/* ============================================================
   2. ANTICIPACION Y MAQUINA DE ESTADOS
   ============================================================ */
test('7. calcularRangoAnticipacion distingue base (20 km) y mejorada (50 km)', () => {
  assert.equal(Resonancia.calcularRangoAnticipacion(false), 20000);
  assert.equal(Resonancia.calcularRangoAnticipacion(true), 50000);
});

test('8. calcularUmbralAnticipacion nunca desciende por debajo de la Zona de Transicion (410 km)', () => {
  assert.equal(Resonancia.calcularUmbralAnticipacion(500000, false), 480000);
  assert.equal(Resonancia.calcularUmbralAnticipacion(500000, true), 450000);
  assert.equal(Resonancia.calcularUmbralAnticipacion(420000, true), 410000);
});

test('9. evaluarEstadoResonancia: DORMANT antes del umbral de anticipacion', () => {
  const estado = Resonancia.crearEstadoResonancia(1);
  const umbral = Resonancia.calcularUmbralAnticipacion(estado.puntoM, false);
  const evaluado = Resonancia.evaluarEstadoResonancia(estado, umbral - 100, false);
  assert.equal(evaluado.estado, 'DORMANT');
});

test('10. evaluarEstadoResonancia: ANTICIPATING dentro del rango previo', () => {
  const estado = Resonancia.crearEstadoResonancia(1);
  const umbral = Resonancia.calcularUmbralAnticipacion(estado.puntoM, false);
  const evaluado = Resonancia.evaluarEstadoResonancia(estado, umbral, false);
  assert.equal(evaluado.estado, 'ANTICIPATING');
  const evaluado2 = Resonancia.evaluarEstadoResonancia(estado, estado.puntoM - 1, false);
  assert.equal(evaluado2.estado, 'ANTICIPATING');
});

test('11. evaluarEstadoResonancia: DETECTED al alcanzar o cruzar puntoM', () => {
  const estado = Resonancia.crearEstadoResonancia(1);
  const evaluadoExacto = Resonancia.evaluarEstadoResonancia(estado, estado.puntoM, false);
  assert.equal(evaluadoExacto.estado, 'DETECTED');
  const evaluadoPosterior = Resonancia.evaluarEstadoResonancia(estado, estado.puntoM + 5000, false);
  assert.equal(evaluadoPosterior.estado, 'DETECTED');
});

test('12. evaluarEstadoResonancia: salto directo de DORMANT a DETECTED (ej. offline)', () => {
  const estado = Resonancia.crearEstadoResonancia(1);
  assert.equal(estado.estado, 'DORMANT');
  const evaluado = Resonancia.evaluarEstadoResonancia(estado, estado.puntoM + 25000, false);
  assert.equal(evaluado.estado, 'DETECTED');
});

/* ============================================================
   3. ACCIONES Y DECISIONES
   ============================================================ */
test('13. resolverAccionResonancia IGNORAR: pasa a RESOLVED / IGNORED sin efectos secundarios', () => {
  const estado = { ...Resonancia.crearEstadoResonancia(1), estado: 'DETECTED' };
  const res = Resonancia.resolverAccionResonancia(estado, 'IGNORAR');
  assert.equal(res.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res.estadoResonancia.modoResuelto, 'IGNORED');
  assert.equal(res.estadoResonancia.extraccionHasta, 0);
  assert.equal(res.resonanciasMineralesRecuperadas, undefined);
  assert.equal(res.anticipacionResonante, undefined);
});

test('14. resolverAccionResonancia SINTONIZAR: pasa a TUNING sin conceder beneficios', () => {
  const estado = { ...Resonancia.crearEstadoResonancia(1), estado: 'DETECTED' };
  const res = Resonancia.resolverAccionResonancia(estado, 'SINTONIZAR');
  assert.equal(res.estadoResonancia.estado, 'TUNING');
  assert.equal(res.estadoResonancia.modoResuelto, null);
});

test('15. resolverAccionResonancia EXTRACCION: fija timestamp now + 60.000 ms y pasa a RESOLVED', () => {
  const estado = { ...Resonancia.crearEstadoResonancia(1), estado: 'TUNING' };
  const now = 1700000000000;
  const res = Resonancia.resolverAccionResonancia(estado, 'EXTRACCION', { now });
  assert.equal(res.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res.estadoResonancia.modoResuelto, 'EXTRACTION');
  assert.equal(res.estadoResonancia.extraccionHasta, now + 60000);
});

test('16. esExtraccionActiva y tiempoRestanteExtraccion operan con timestamps reales', () => {
  const now = 1700000000000;
  const estado = {
    ...Resonancia.crearEstadoResonancia(1),
    estado: 'RESOLVED',
    modoResuelto: 'EXTRACTION',
    extraccionHasta: now + 60000
  };
  assert.equal(Resonancia.esExtraccionActiva(estado, now + 10000), true);
  assert.equal(Resonancia.tiempoRestanteExtraccion(estado, now + 10000), 50);
  assert.equal(Resonancia.esExtraccionActiva(estado, now + 59999), true);
  assert.equal(Resonancia.tiempoRestanteExtraccion(estado, now + 59999), 1);
  assert.equal(Resonancia.esExtraccionActiva(estado, now + 60000), false);
  assert.equal(Resonancia.tiempoRestanteExtraccion(estado, now + 60000), 0);
  assert.equal(Resonancia.esExtraccionActiva(estado, now + 120000), false);
});

test('17. resolverAccionResonancia MUESTREO: primer muestreo incrementa a 1 y activa anticipacionResonante', () => {
  const estado = { ...Resonancia.crearEstadoResonancia(1), estado: 'TUNING' };
  const res = Resonancia.resolverAccionResonancia(estado, 'MUESTREO', {
    resonanciasMineralesRecuperadas: 0
  });
  assert.equal(res.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res.estadoResonancia.modoResuelto, 'SAMPLED');
  assert.equal(res.resonanciasMineralesRecuperadas, 1);
  assert.equal(res.anticipacionResonante, true);
  assert.equal(res.desbloquearLore, true);
});

test('18. resolverAccionResonancia MUESTREO: muestreos posteriores incrementan sin conceder bonus extra', () => {
  const estado = { ...Resonancia.crearEstadoResonancia(2), estado: 'TUNING' };
  const res = Resonancia.resolverAccionResonancia(estado, 'MUESTREO', {
    resonanciasMineralesRecuperadas: 2
  });
  assert.equal(res.resonanciasMineralesRecuperadas, 3);
  assert.equal(res.anticipacionResonante, true);
  assert.equal(res.desbloquearLore, false);
});

test('19. Estado RESOLVED es terminal durante el pozo y no se reactiva al avanzar profundidad', () => {
  const estado = {
    ...Resonancia.crearEstadoResonancia(1),
    estado: 'RESOLVED',
    modoResuelto: 'IGNORED'
  };
  const evaluado = Resonancia.evaluarEstadoResonancia(estado, estado.puntoM + 100000, true);
  assert.equal(evaluado.estado, 'RESOLVED');
  assert.equal(evaluado.modoResuelto, 'IGNORED');
});

/* ============================================================
   4. MIGRACION DEFENSIVA v56
   ============================================================ */
test('20. migrarEstadoResonancia: Caso A - Save v56 antes de anticipacion (100.000 m) -> DORMANT', () => {
  const estado = Resonancia.migrarEstadoResonancia(null, 1, 100000, false);
  assert.equal(estado.estado, 'DORMANT');
  assert.equal(estado.modoResuelto, null);
  assert.ok(estado.puntoM >= 500000 && estado.puntoM <= 560000);
});

test('21. migrarEstadoResonancia: Caso A2 - Save v56 dentro del rango de anticipacion -> ANTICIPATING', () => {
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(1);
  const umbral = Resonancia.calcularUmbralAnticipacion(puntoPozo1, false);
  const profDentro = umbral + 5000;
  assert.ok(profDentro < puntoPozo1);
  const estado = Resonancia.migrarEstadoResonancia(null, 1, profDentro, false);
  assert.equal(estado.estado, 'ANTICIPATING');
  assert.equal(estado.modoResuelto, null);
});

test('22. migrarEstadoResonancia: Caso B1 - Save v56 exactamente en el punto -> DETECTED', () => {
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(1);
  const estado = Resonancia.migrarEstadoResonancia(null, 1, puntoPozo1, false);
  assert.equal(estado.estado, 'DETECTED');
  assert.equal(estado.modoResuelto, null);
});

test('23. migrarEstadoResonancia: Caso B2 - Save v56 post-punto dentro de Zona de Transicion (600.000 m) -> DETECTED', () => {
  const estado = Resonancia.migrarEstadoResonancia(null, 1, 600000, false);
  assert.equal(estado.estado, 'DETECTED');
  assert.equal(estado.modoResuelto, null);
});

test('24. migrarEstadoResonancia: Caso B3 - Save v56 exactamente a 660.000 m (limite estrato) -> DETECTED', () => {
  const estado = Resonancia.migrarEstadoResonancia(null, 1, 660000, false);
  assert.equal(estado.estado, 'DETECTED');
  assert.equal(estado.modoResuelto, null);
});

test('25. migrarEstadoResonancia: Caso C - Save v56 superada la Zona de Transicion (700.000 m) -> RESOLVED / IGNORED', () => {
  const estado = Resonancia.migrarEstadoResonancia(null, 1, 700000, false);
  assert.equal(estado.estado, 'RESOLVED');
  assert.equal(estado.modoResuelto, 'IGNORED');
});

test('26. migrarEstadoResonancia: Save existente con estado de resonancia no se sobreescribe', () => {
  const saveExistente = {
    puntoM: 520000,
    periodoSeg: 38.5,
    estado: 'TUNING',
    modoResuelto: null,
    extraccionHasta: 0
  };
  const estado = Resonancia.migrarEstadoResonancia(saveExistente, 1, 550000, false);
  assert.equal(estado.estado, 'TUNING');
  assert.equal(estado.puntoM, 520000);
  assert.equal(estado.periodoSeg, 38.5);
});

/* ============================================================
   5. INTEGRACION, PERSISTENCIA Y CICLO DE VIDA (FASE 4.2)
   ============================================================ */
test('27. Integracion Estado: Inicializacion de nueva partida crea estado completo', () => {
  const estado = Resonancia.crearEstadoResonancia(1, false);
  assert.ok(estado.puntoM >= 500000 && estado.puntoM <= 560000);
  assert.ok(estado.periodoSeg >= 36.0 && estado.periodoSeg <= 46.0);
  assert.notEqual(estado.periodoSeg, 41.0);
  assert.equal(estado.estado, 'DORMANT');
  assert.equal(estado.modoResuelto, null);
  assert.equal(estado.extraccionHasta, 0);
});

test('28. Persistencia: Guardar y Cargar (JSON serialize/deserialize) conserva puntoM y periodoSeg', () => {
  const partida = {
    j: 100000,
    totalCiclo: 250000000000,
    recalibraciones: 2,
    resonanciaMineral: Resonancia.crearEstadoResonancia(3, true),
    resonanciasMineralesRecuperadas: 1,
    anticipacionResonante: true
  };
  const json = JSON.stringify(partida);
  const cargada = JSON.parse(json);

  assert.equal(cargada.resonanciaMineral.puntoM, partida.resonanciaMineral.puntoM);
  assert.equal(cargada.resonanciaMineral.periodoSeg, partida.resonanciaMineral.periodoSeg);
  assert.equal(cargada.resonanciaMineral.estado, 'DORMANT');
  assert.equal(cargada.resonanciasMineralesRecuperadas, 1);
  assert.equal(cargada.anticipacionResonante, true);
});

test('29. Offline: Cruce de cota durante ausencia offline pasa a DETECTED sin duplicar', () => {
  const numeroPozo = 1;
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(numeroPozo);
  const umbral = Resonancia.calcularUmbralAnticipacion(puntoPozo1, false);
  const profAlCerrar = umbral - 10000;
  const saveAlCerrar = {
    profundidadM: profAlCerrar,
    totalCiclo: profAlCerrar * profAlCerrar,
    resonanciaMineral: Resonancia.crearEstadoResonancia(numeroPozo, false)
  };
  let res = Resonancia.migrarEstadoResonancia(saveAlCerrar.resonanciaMineral, numeroPozo, saveAlCerrar.profundidadM, false);
  assert.equal(res.estado, 'DORMANT');

  const profundidadTrasAusencia = 580000;
  res = Resonancia.evaluarEstadoResonancia(res, profundidadTrasAusencia, false);

  assert.equal(res.estado, 'DETECTED');
  assert.equal(res.modoResuelto, null);
  assert.equal(res.puntoM, puntoPozo1);
});

test('30. Offline: Estado DETECTED antes de cerrar se mantiene DETECTED tras ausencia prolongada', () => {
  const numeroPozo = 1;
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(numeroPozo);
  const save = {
    resonanciaMineral: {
      puntoM: puntoPozo1,
      periodoSeg: 39.2,
      estado: 'DETECTED',
      modoResuelto: null,
      extraccionHasta: 0
    }
  };
  let res = Resonancia.migrarEstadoResonancia(save.resonanciaMineral, numeroPozo, 550000, false);
  res = Resonancia.evaluarEstadoResonancia(res, 620000, false);
  assert.equal(res.estado, 'DETECTED');
  assert.equal(res.modoResuelto, null);
});

test('31. Offline: Estado TUNING antes de cerrar se mantiene TUNING tras ausencia prolongada', () => {
  const numeroPozo = 1;
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(numeroPozo);
  const save = {
    resonanciaMineral: {
      puntoM: puntoPozo1,
      periodoSeg: 39.2,
      estado: 'TUNING',
      modoResuelto: null,
      extraccionHasta: 0
    }
  };
  let res = Resonancia.migrarEstadoResonancia(save.resonanciaMineral, numeroPozo, 550000, false);
  res = Resonancia.evaluarEstadoResonancia(res, 640000, false);
  assert.equal(res.estado, 'TUNING');
  assert.equal(res.modoResuelto, null);
});

test('32. Offline: Estado RESOLVED permanece terminal tras ausencia prolongada', () => {
  const numeroPozo = 1;
  const puntoPozo1 = Resonancia.calcularPuntoResonancia(numeroPozo);
  const save = {
    resonanciaMineral: {
      puntoM: puntoPozo1,
      periodoSeg: 39.2,
      estado: 'RESOLVED',
      modoResuelto: 'EXTRACTION',
      extraccionHasta: 1700000060000
    }
  };
  let res = Resonancia.migrarEstadoResonancia(save.resonanciaMineral, numeroPozo, 550000, false);
  res = Resonancia.evaluarEstadoResonancia(res, 650000, false);
  assert.equal(res.estado, 'RESOLVED');
  assert.equal(res.modoResuelto, 'EXTRACTION');
});

test('33. Extraccion: Timestamp persiste y no se renueva en recarga', () => {
  const baseTime = 1700000000000;
  const saveConExtraccion = {
    resonanciaMineral: {
      puntoM: 520000,
      periodoSeg: 38.4,
      estado: 'RESOLVED',
      modoResuelto: 'EXTRACTION',
      extraccionHasta: baseTime + 60000
    }
  };
  const json = JSON.stringify(saveConExtraccion);
  const cargado = JSON.parse(json);

  assert.equal(Resonancia.esExtraccionActiva(cargado.resonanciaMineral, baseTime + 20000), true);
  assert.equal(Resonancia.tiempoRestanteExtraccion(cargado.resonanciaMineral, baseTime + 20000), 40);
  assert.equal(Resonancia.esExtraccionActiva(cargado.resonanciaMineral, baseTime + 80000), false);
  assert.equal(Resonancia.tiempoRestanteExtraccion(cargado.resonanciaMineral, baseTime + 80000), 0);
});

test('34. Protocolo Delta: Reinicia estado local y conserva muestreos historicos', () => {
  const pozo1 = {
    recalibraciones: 0,
    resonanciaMineral: {
      puntoM: Resonancia.calcularPuntoResonancia(1),
      periodoSeg: Resonancia.calcularPeriodoResonancia(1, 524000),
      estado: 'RESOLVED',
      modoResuelto: 'SAMPLED',
      extraccionHasta: 0
    },
    resonanciasMineralesRecuperadas: 1,
    anticipacionResonante: true
  };

  const vida = {
    recalibraciones: pozo1.recalibraciones + 1,
    resonanciasMineralesRecuperadas: pozo1.resonanciasMineralesRecuperadas,
    anticipacionResonante: pozo1.anticipacionResonante
  };
  const nuevoNumeroPozo = vida.recalibraciones + 1;
  const nuevoEstadoRes = Resonancia.crearEstadoResonancia(nuevoNumeroPozo, vida.anticipacionResonante);

  assert.equal(vida.recalibraciones, 1);
  assert.equal(vida.resonanciasMineralesRecuperadas, 1);
  assert.equal(vida.anticipacionResonante, true);
  assert.equal(nuevoEstadoRes.estado, 'DORMANT');
  assert.equal(nuevoEstadoRes.modoResuelto, null);
  assert.equal(nuevoEstadoRes.extraccionHasta, 0);
  assert.equal(nuevoEstadoRes.puntoM, Resonancia.calcularPuntoResonancia(2));
});

test('35. Exportar / Importar: Codigo Base64 (NUCLEO:...) transfiere y migra estado fielmente', () => {
  function codificar(str) { return Buffer.from(encodeURIComponent(str)).toString('base64'); }
  function decodificar(code) { return decodeURIComponent(Buffer.from(code, 'base64').toString('utf8')); }

  const partidaOriginal = {
    j: 500000,
    totalCiclo: 1000000,
    recalibraciones: 3,
    resonanciaMineral: Resonancia.crearEstadoResonancia(4, true),
    resonanciasMineralesRecuperadas: 2,
    anticipacionResonante: true
  };
  const codigoExportado = 'NUCLEO:' + codificar(JSON.stringify(partidaOriginal));

  const rawCode = codigoExportado.slice(7);
  const importada = JSON.parse(decodificar(rawCode));

  assert.equal(importada.recalibraciones, 3);
  assert.equal(importada.resonanciasMineralesRecuperadas, 2);
  assert.equal(importada.anticipacionResonante, true);
  assert.equal(importada.resonanciaMineral.puntoM, partidaOriginal.resonanciaMineral.puntoM);
  assert.equal(importada.resonanciaMineral.periodoSeg, partidaOriginal.resonanciaMineral.periodoSeg);
});

/* ============================================================
   6. ACCIONES INVALIDAS, IDEMPOTENCIA Y PROTECCIONES (FASE 4.3)
   ============================================================ */
test('36. Acciones invalidas: IGNORAR fuera de DETECTED no altera el estado', () => {
  const estadoDormant = { ...Resonancia.crearEstadoResonancia(1), estado: 'DORMANT' };
  const res1 = Resonancia.resolverAccionResonancia(estadoDormant, 'IGNORAR');
  assert.equal(res1.estadoResonancia.estado, 'DORMANT');

  const estadoTuning = { ...Resonancia.crearEstadoResonancia(1), estado: 'TUNING' };
  const res2 = Resonancia.resolverAccionResonancia(estadoTuning, 'IGNORAR');
  assert.equal(res2.estadoResonancia.estado, 'TUNING');
});

test('37. Acciones invalidas: SINTONIZAR fuera de DETECTED no altera el estado', () => {
  const estadoResolved = { ...Resonancia.crearEstadoResonancia(1), estado: 'RESOLVED', modoResuelto: 'IGNORED' };
  const res = Resonancia.resolverAccionResonancia(estadoResolved, 'SINTONIZAR');
  assert.equal(res.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res.estadoResonancia.modoResuelto, 'IGNORED');
});

test('38. Acciones invalidas: EXTRACCION fuera de TUNING no fija timestamp ni altera estado', () => {
  const estadoDetected = { ...Resonancia.crearEstadoResonancia(1), estado: 'DETECTED' };
  const res = Resonancia.resolverAccionResonancia(estadoDetected, 'EXTRACCION', { now: 1700000000000 });
  assert.equal(res.estadoResonancia.estado, 'DETECTED');
  assert.equal(res.estadoResonancia.extraccionHasta, 0);
});

test('39. Acciones invalidas: MUESTREO fuera de TUNING no incrementa contador ni altera estado', () => {
  const estadoDetected = { ...Resonancia.crearEstadoResonancia(1), estado: 'DETECTED' };
  const res = Resonancia.resolverAccionResonancia(estadoDetected, 'MUESTREO', { resonanciasMineralesRecuperadas: 1 });
  assert.equal(res.estadoResonancia.estado, 'DETECTED');
  assert.equal(res.resonanciasMineralesRecuperadas, undefined);
});

test('40. Idempotencia: Doble llamada a EXTRACCION sobre estado resuelto no renueva el tiempo', () => {
  const now = 1700000000000;
  const estadoTuning = { ...Resonancia.crearEstadoResonancia(1), estado: 'TUNING' };
  const res1 = Resonancia.resolverAccionResonancia(estadoTuning, 'EXTRACCION', { now });
  assert.equal(res1.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res1.estadoResonancia.extraccionHasta, now + 60000);

  // Segunda llamada 30s despues sobre el estado ya resuelto
  const res2 = Resonancia.resolverAccionResonancia(res1.estadoResonancia, 'EXTRACCION', { now: now + 30000 });
  assert.equal(res2.estadoResonancia.estado, 'RESOLVED');
  assert.equal(res2.estadoResonancia.extraccionHasta, now + 60000); // NO se extiende a now + 90000
});

test('41. Idempotencia: Doble llamada a MUESTREO sobre estado resuelto no duplica muestras', () => {
  const estadoTuning = { ...Resonancia.crearEstadoResonancia(1), estado: 'TUNING' };
  const res1 = Resonancia.resolverAccionResonancia(estadoTuning, 'MUESTREO', { resonanciasMineralesRecuperadas: 0 });
  assert.equal(res1.resonanciasMineralesRecuperadas, 1);

  const res2 = Resonancia.resolverAccionResonancia(res1.estadoResonancia, 'MUESTREO', { resonanciasMineralesRecuperadas: 1 });
  assert.equal(res2.resonanciasMineralesRecuperadas, undefined);
});

/* ============================================================
   7. INTEGRACION ECONOMICA REAL (+50% GLOBAL)
   ============================================================ */
test('42. Economia Real: Multiplicador de Extraccion aplica exactamente +50% (+1.50x) mientras activo', () => {
  const baseTime = 1700000000000;
  function calcularBonusGlobalSimulado(estadoRes, ahora) {
    const baseGlobal = 100;
    const bonusExtraccion = Resonancia.esExtraccionActiva(estadoRes, ahora) ? 1.50 : 1.00;
    return baseGlobal * bonusExtraccion;
  }

  const estadoInactivo = { ...Resonancia.crearEstadoResonancia(1), estado: 'DORMANT' };
  assert.equal(calcularBonusGlobalSimulado(estadoInactivo, baseTime), 100);

  const estadoActivo = {
    ...Resonancia.crearEstadoResonancia(1),
    estado: 'RESOLVED',
    modoResuelto: 'EXTRACTION',
    extraccionHasta: baseTime + 60000
  };
  assert.equal(calcularBonusGlobalSimulado(estadoActivo, baseTime + 10000), 150); // +50%
  assert.equal(calcularBonusGlobalSimulado(estadoActivo, baseTime + 59999), 150); // +50%
  assert.equal(calcularBonusGlobalSimulado(estadoActivo, baseTime + 60000), 100); // Expirado (1.00x)
  assert.equal(calcularBonusGlobalSimulado(estadoActivo, baseTime + 100000), 100); // Expirado (1.00x)
});

test('43. Economia Real: Produccion pasiva y manual escalan conjuntamente con bonusGlobal', () => {
  const baseTime = 1700000000000;
  const estadoActivo = {
    ...Resonancia.crearEstadoResonancia(1),
    estado: 'RESOLVED',
    modoResuelto: 'EXTRACTION',
    extraccionHasta: baseTime + 60000
  };
  const baseGlobal = 2.0;
  const factorExtraccion = Resonancia.esExtraccionActiva(estadoActivo, baseTime + 15000) ? 1.50 : 1.00;
  const bonusEfectivo = baseGlobal * factorExtraccion;

  const prodPasivaBase = 1000;
  const prodPasivaConBonus = prodPasivaBase * bonusEfectivo;
  assert.equal(prodPasivaConBonus, 3000); // 1000 * 2.0 * 1.50 = 3000

  const prodToqueBase = 10;
  const prodToqueConBonus = prodToqueBase * bonusEfectivo;
  assert.equal(prodToqueConBonus, 30); // 10 * 2.0 * 1.50 = 30
});

/* ============================================================
   8. ROBUSTEZ E INMUTABILIDAD
   ============================================================ */
test('44. Inmutabilidad: funciones puras no mutan el objeto de entrada', () => {
  const estadoOriginal = Object.freeze(Resonancia.crearEstadoResonancia(1));
  const evaluado = Resonancia.evaluarEstadoResonancia(estadoOriginal, 550000, false);
  assert.notEqual(evaluado, estadoOriginal);
  assert.equal(estadoOriginal.estado, 'DORMANT');
});

test('45. Robustez ante entradas invalidas o nulas', () => {
  const puntoDef = Resonancia.calcularPuntoResonancia(null);
  assert.ok(puntoDef >= 500000 && puntoDef <= 560000);
  const periodoDef = Resonancia.calcularPeriodoResonancia(undefined, null);
  assert.ok(periodoDef >= 36.0 && periodoDef <= 46.0);
  assert.notEqual(periodoDef, 41.0);
  assert.equal(Resonancia.esExtraccionActiva(null), false);
  assert.equal(Resonancia.tiempoRestanteExtraccion(null), 0);
});

/* ============================================================
   9. TELEMETRIA Y VISTA FUNCIONAL (FASE 4.4 TDD)
   ============================================================ */
test('46. calcularProgresoAnticipacion: calcula progresion 0.0 a 1.0 clamped', () => {
  const punto = 520000;
  const umbralBase = Resonancia.calcularUmbralAnticipacion(punto, false); // 500000

  assert.equal(Resonancia.calcularProgresoAnticipacion(490000, punto, false), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(umbralBase, punto, false), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(510000, punto, false), 0.5);
  assert.equal(Resonancia.calcularProgresoAnticipacion(punto, punto, false), 1.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(530000, punto, false), 1.0);
});

test('47. calcularProgresoAnticipacion: opera correctamente con anticipacion mejorada (50 km)', () => {
  const punto = 520000;
  const umbralMejorado = Resonancia.calcularUmbralAnticipacion(punto, true); // 470000

  assert.equal(Resonancia.calcularProgresoAnticipacion(460000, punto, true), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(umbralMejorado, punto, true), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(495000, punto, true), 0.5);
  assert.equal(Resonancia.calcularProgresoAnticipacion(punto, punto, true), 1.0);
});

test('48. calcularProgresoAnticipacion: robustez ante entradas invalidas o nulas', () => {
  assert.equal(Resonancia.calcularProgresoAnticipacion(null, 520000, false), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(undefined, undefined, false), 0.0);
  assert.equal(Resonancia.calcularProgresoAnticipacion(NaN, NaN, false), 0.0);
});

test('49. calcularPeriodoMostrado: converge suavemente en anticipacion y fija exactamente en DETECTED', () => {
  const estado = {
    puntoM: 520000,
    periodoSeg: 38.7,
    estado: 'ANTICIPATING',
    modoResuelto: null,
    extraccionHasta: 0
  };
  const umbral = Resonancia.calcularUmbralAnticipacion(estado.puntoM, false); // 500000

  // En umbral: coincide con calculo base
  const txtInicio = Resonancia.calcularPeriodoMostrado(umbral, estado, false);
  assert.ok(txtInicio.endsWith(' s'));
  assert.notEqual(txtInicio, '41,0 s');

  // En DETECTED: fija exactamente el periodo de resonancia (38,7 s)
  const estadoDetected = { ...estado, estado: 'DETECTED' };
  const txtDetectado = Resonancia.calcularPeriodoMostrado(estado.puntoM, estadoDetected, false);
  assert.equal(txtDetectado, '38,7 s');
});

test('50. obtenerVistaResonancia: mapea fielmente los estados del panel UI', () => {
  const now = 1700000000000;

  // DORMANT / ANTICIPATING -> Oculto
  const vDormant = Resonancia.obtenerVistaResonancia({ estado: 'DORMANT' }, now);
  assert.equal(vDormant.visible, false);

  const vAnticipating = Resonancia.obtenerVistaResonancia({ estado: 'ANTICIPATING' }, now);
  assert.equal(vAnticipating.visible, false);

  // DETECTED -> Panel visible con opciones primarias (IGNORAR / SINTONIZAR)
  const vDetected = Resonancia.obtenerVistaResonancia({ estado: 'DETECTED', puntoM: 520000, periodoSeg: 38.7 }, now);
  assert.equal(vDetected.visible, true);
  assert.equal(vDetected.vista, 'DETECTED');
  assert.equal(vDetected.periodoTexto, '38,7 s');

  // TUNING -> Panel visible con opciones de destino (EXTRACCION / MUESTREO)
  const vTuning = Resonancia.obtenerVistaResonancia({ estado: 'TUNING', puntoM: 520000, periodoSeg: 38.7 }, now);
  assert.equal(vTuning.visible, true);
  assert.equal(vTuning.vista, 'TUNING');

  // EXTRACTION activa -> Panel visible con contador de tiempo restante
  const vExtActiva = Resonancia.obtenerVistaResonancia({
    estado: 'RESOLVED',
    modoResuelto: 'EXTRACTION',
    extraccionHasta: now + 45000
  }, now);
  assert.equal(vExtActiva.visible, true);
  assert.equal(vExtActiva.vista, 'EXTRACTION_ACTIVA');
  assert.equal(vExtActiva.tiempoRestante, 45);

  // EXTRACTION expirada -> Oculto
  const vExtExpirada = Resonancia.obtenerVistaResonancia({
    estado: 'RESOLVED',
    modoResuelto: 'EXTRACTION',
    extraccionHasta: now - 5000
  }, now);
  assert.equal(vExtExpirada.visible, false);

  // SAMPLED / IGNORED -> Oculto
  const vSampled = Resonancia.obtenerVistaResonancia({ estado: 'RESOLVED', modoResuelto: 'SAMPLED' }, now);
  assert.equal(vSampled.visible, false);

  const vIgnored = Resonancia.obtenerVistaResonancia({ estado: 'RESOLVED', modoResuelto: 'IGNORED' }, now);
  assert.equal(vIgnored.visible, false);
});

/* ============================================================
   10. CORRECCION TELEMETRIA NORMAL v56 (FASE 4.4.1 TDD)
   ============================================================ */
test('51. Telemetria normal: DORMANT a < 3000 m conserva EN MUESTREO', () => {
  const estadoDormant = { puntoM: 520000, periodoSeg: 38.7, estado: 'DORMANT', modoResuelto: null };
  const periodoNormal = 'EN MUESTREO';
  const resultado = Resonancia.calcularPeriodoMostrado(500, estadoDormant, false, periodoNormal);
  assert.equal(resultado, 'EN MUESTREO');
});

test('52. Telemetria normal: DORMANT a <= 120 km conserva formato entero toFixed(0)', () => {
  const estadoDormant = { puntoM: 520000, periodoSeg: 38.7, estado: 'DORMANT', modoResuelto: null };
  const prof = 10000;
  const periodoNormal = (Math.max(.4, 41 - Math.log10(prof / 3000 + 1) * 12)).toFixed(0).replace('.', ',') + ' s'; // '33 s'
  const resultado = Resonancia.calcularPeriodoMostrado(prof, estadoDormant, false, periodoNormal);
  assert.equal(resultado, '33 s');
});

test('53. Telemetria normal: RESOLVED recupera exactamente el periodo normal v56', () => {
  const estadoResolvedIgnored = { puntoM: 520000, periodoSeg: 38.7, estado: 'RESOLVED', modoResuelto: 'IGNORED' };
  const prof = 700000;
  const periodoNormal = (Math.max(.4, 41 - Math.log10(prof / 3000 + 1) * 12)).toFixed(1).replace('.', ',') + ' s';
  const resultado = Resonancia.calcularPeriodoMostrado(prof, estadoResolvedIgnored, false, periodoNormal);
  assert.equal(resultado, periodoNormal);

  const estadoResolvedSampled = { puntoM: 520000, periodoSeg: 38.7, estado: 'RESOLVED', modoResuelto: 'SAMPLED' };
  assert.equal(Resonancia.calcularPeriodoMostrado(prof, estadoResolvedSampled, false, periodoNormal), periodoNormal);

  const estadoResolvedExtraction = { puntoM: 520000, periodoSeg: 38.7, estado: 'RESOLVED', modoResuelto: 'EXTRACTION', extraccionHasta: Date.now() + 50000 };
  assert.equal(Resonancia.calcularPeriodoMostrado(prof, estadoResolvedExtraction, false, periodoNormal), periodoNormal);
});

test('54. Telemetria Resonancia: ANTICIPATING interpola numericamente y DETECTED fija periodoSeg', () => {
  const estado = { puntoM: 520000, periodoSeg: 38.7, estado: 'ANTICIPATING', modoResuelto: null };
  const umbral = Resonancia.calcularUmbralAnticipacion(estado.puntoM, false); // 500000
  const profMitad = 510000; // p = 0.5
  const resAnticipacion = Resonancia.calcularPeriodoMostrado(profMitad, estado, false, '12,3 s');
  assert.ok(resAnticipacion.endsWith(' s'));
  assert.notEqual(resAnticipacion, '12,3 s');

  const estadoDetected = { puntoM: 520000, periodoSeg: 38.7, estado: 'DETECTED', modoResuelto: null };
  const resDetected = Resonancia.calcularPeriodoMostrado(estado.puntoM, estadoDetected, false, '12,3 s');
  assert.equal(resDetected, '38,7 s');
});

/* ============================================================
   11. INTEGRACION ESTATICA EN ACTUALIZARINSTRUMENTOS (FASE 4.5.2 TDD)
   ============================================================ */
test('55. Integracion app.js: actualizarInstrumentos integra ResonanciaMineral en runtime', () => {
  const appPath = new URL('../scripts/app.js', import.meta.url);
  const appCode = fs.readFileSync(appPath, 'utf8');

  // Aislar el cuerpo de la funcion actualizarInstrumentos
  const fnMatch = appCode.match(/function\s+actualizarInstrumentos\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, 'actualizarInstrumentos debe existir en scripts/app.js');
  const fnBody = fnMatch[1];

  // 1. Reevaluacion de estado durante sesion
  assert.ok(
    fnBody.includes('ResonanciaMineral.evaluarEstadoResonancia'),
    'actualizarInstrumentos debe invocar ResonanciaMineral.evaluarEstadoResonancia'
  );

  // 2. Calculo de progreso y sesgo de anticipacion
  assert.ok(
    fnBody.includes('ResonanciaMineral.calcularProgresoAnticipacion'),
    'actualizarInstrumentos debe invocar ResonanciaMineral.calcularProgresoAnticipacion'
  );

  // 3. Calculo de periodo mostrado en telemetria
  assert.ok(
    fnBody.includes('ResonanciaMineral.calcularPeriodoMostrado'),
    'actualizarInstrumentos debe invocar ResonanciaMineral.calcularPeriodoMostrado'
  );

  // 4. Asignacion final al elemento DOM instPeriodo
  assert.ok(
    fnBody.includes('instPeriodo') && fnBody.includes('textContent = periodo'),
    'actualizarInstrumentos debe asignar el periodo resultante a instPeriodo'
  );

  // 5. Variables mutables para permitir sesgo de anticipacion
  assert.ok(
    /let\s+presion/.test(fnBody),
    'presion debe declararse con let para permitir el sesgo de anticipacion'
  );
  assert.ok(
    /let\s+densidad/.test(fnBody),
    'densidad debe declararse con let para permitir el sesgo de anticipacion'
  );
});

/* ============================================================
   12. DESCUBRIBILIDAD Y CODIFICACION UTF-8 (FASE 4.5.4 TDD)
   ============================================================ */
test('56. Codificacion UTF-8: archivos de Resonancia no contienen U+FFFD y presentan caracteres validos', () => {
  const files = ['index.html', 'scripts/app.js', 'scripts/resonancia.js'];
  for (const rel of files) {
    const fileUrl = new URL('../' + rel, import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');
    const fffdCount = (content.match(/\uFFFD/g) || []).length;
    assert.equal(fffdCount, 0, 'Archivo ' + rel + ' no debe contener caracteres U+FFFD');
  }

  const appUrl = new URL('../scripts/app.js', import.meta.url);
  const appCode = fs.readFileSync(appUrl, 'utf8');
  assert.ok(appCode.includes('PATR\u00D3N PERI\u00D3DICO DETECTADO'), 'app.js debe contener PATRÓN PERIÓDICO DETECTADO');
  assert.ok(appCode.includes('EXTRACCI\u00D3N'), 'app.js debe contener EXTRACCIÓN');
  assert.ok(appCode.includes('SINTONIZACI\u00D3N ESTABLECIDA'), 'app.js debe contener SINTONIZACIÓN ESTABLECIDA');
  assert.ok(appCode.includes('PRODUCCI\u00D3N GLOBAL +50%'), 'app.js debe contener PRODUCCIÓN GLOBAL +50%');
  assert.ok(appCode.includes('\u00B0C'), 'app.js debe contener °C');
  assert.ok(appCode.includes('g/cm\u00B3'), 'app.js debe contener g/cm³');

  const htmlUrl = new URL('../index.html', import.meta.url);
  const htmlCode = fs.readFileSync(htmlUrl, 'utf8');
  assert.ok(htmlCode.includes('PATR\u00D3N PERI\u00D3DICO DETECTADO'), 'index.html debe contener PATRÓN PERIÓDICO DETECTADO');
  assert.ok(htmlCode.includes('EXTRACCI\u00D3N'), 'index.html debe contener EXTRACCIÓN');
});

test('57. Layout DOM: #panelResonancia se ubica entre #objetivoEstrato y #telemetria', () => {
  const htmlUrl = new URL('../index.html', import.meta.url);
  const htmlCode = fs.readFileSync(htmlUrl, 'utf8');

  const idxObjetivo = htmlCode.indexOf('id="objetivoEstrato"');
  const idxResonancia = htmlCode.indexOf('id="panelResonancia"');
  const idxTelemetria = htmlCode.indexOf('id="telemetria"');

  assert.ok(idxObjetivo !== -1, '#objetivoEstrato debe existir en index.html');
  assert.ok(idxResonancia !== -1, '#panelResonancia debe existir en index.html');
  assert.ok(idxTelemetria !== -1, '#telemetria debe existir en index.html');

  assert.ok(
    idxObjetivo < idxResonancia && idxResonancia < idxTelemetria,
    'El orden en index.html debe ser #objetivoEstrato -> #panelResonancia -> #telemetria'
  );
});

test('58. Transicion de deteccion: debeNotificarDeteccion detecta flanco unico hacia DETECTED', () => {
  assert.equal(typeof Resonancia.debeNotificarDeteccion, 'function', 'debeNotificarDeteccion debe ser una funcion');

  // Flanco valido hacia DETECTED
  assert.equal(Resonancia.debeNotificarDeteccion('ANTICIPATING', 'DETECTED'), true);
  assert.equal(Resonancia.debeNotificarDeteccion('DORMANT', 'DETECTED'), true);

  // Renders posteriores en DETECTED (sin transicion)
  assert.equal(Resonancia.debeNotificarDeteccion('DETECTED', 'DETECTED'), false);

  // Estados inactivos
  assert.equal(Resonancia.debeNotificarDeteccion('DORMANT', 'DORMANT'), false);
  assert.equal(Resonancia.debeNotificarDeteccion('ANTICIPATING', 'ANTICIPATING'), false);

  // Transiciones posteriores fuera de DETECTED
  assert.equal(Resonancia.debeNotificarDeteccion('DETECTED', 'TUNING'), false);
  assert.equal(Resonancia.debeNotificarDeteccion('TUNING', 'TUNING'), false);
  assert.equal(Resonancia.debeNotificarDeteccion('TUNING', 'RESOLVED'), false);
  assert.equal(Resonancia.debeNotificarDeteccion('RESOLVED', 'RESOLVED'), false);

  // Cargas iniciales / nulas
  assert.equal(Resonancia.debeNotificarDeteccion(null, 'DETECTED'), false);
  assert.equal(Resonancia.debeNotificarDeteccion(undefined, 'DETECTED'), false);
  assert.equal(Resonancia.debeNotificarDeteccion('DETECTED', null), false);
});

/* ============================================================
   13. ESTABILIZACION DOM DE PROTOCOLO DELTA (FASE 4.5.6 TDD)
   ============================================================ */
test('59. Estabilizacion DOM: actualizar recal no destruye hijos incondicionalmente en cada frame', () => {
  const appUrl = new URL('../scripts/app.js', import.meta.url);
  const appCode = fs.readFileSync(appUrl, 'utf8');

  // Aislar el bloque de renderizado de recal en dibujar()
  const recalRenderMatch = appCode.match(/const\s+boton\s*=\s*\$\('recal'\);([\s\S]*?)dibujarEquipo/);
  assert.ok(recalRenderMatch, 'El renderizado de recal debe existir en dibujar()');
  const recalBlock = recalRenderMatch[1];

  // Debe existir una guarda de contenido para no sobrescribir innerHTML si el contenido no ha cambiado
  assert.ok(
    recalBlock.includes('dataset.contenido') || recalBlock.includes('dataset.html') || recalBlock.includes('botonContenido'),
    'El renderizado de recal debe guardar el contenido previo para evitar innerHTML destructivo en cada frame'
  );
  assert.ok(
    recalBlock.includes('!=='),
    'El renderizado de recal debe comparar el nuevo HTML antes de asignarlo a innerHTML'
  );
});
