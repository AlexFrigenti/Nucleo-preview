/* ============================================================
   NÚCLEO · REGISTRO DE PERFORACIÓN
   ------------------------------------------------------------
   Cada entrada se desbloquea cuando la profundidad del pozo
   ACTUAL supera "m". Si lleva "pozo", además hace falta estar
   en ese número de pozo o superior.

   La cabecera de cada entrada NO va en el texto: se genera al
   dibujar, con el formato   REG-014 · 8.800 m

   Regla de estilo si añades entradas nuevas: informe técnico.
   Nunca una palabra emocional, nunca una explicación, nunca una
   respuesta. Cuanto más corta, más inquieta.
   ============================================================ */

const REGISTRO = [

  /* ---- POZO 1 · rutina y primera anomalía ---- */

  { id:'001', m:20, txt:
`Inicio de perforación. Emplazamiento validado.
Gradiente térmico previsto: 25 °C/km.
Turno de doce horas. Sin incidencias.` },

  { id:'002', m:180, txt:
`Sustituida la sonda 2 por lectura intermitente.
La sonda retirada funciona correctamente en superficie.` },

  { id:'003', m:480, txt:
`Gradiente 24,8 °C/km. Dentro de modelo.
Sin incidencias.` },

  { id:'004', m:900, txt:
`Primera muestra recuperada. Composición dentro de lo esperado.
Solicitado un segundo operario para el turno de noche. Denegado.` },

  { id:'005', m:1400, txt:
`El gradiente baja a 21 °C/km. Debería subir.
Notificado a central. Sin respuesta.` },

  { id:'006', m:2100, txt:
`Gradiente 19,4 °C/km. La roca se enfría según bajamos.
Solicitada revisión del modelo térmico. Sin respuesta.` },

  { id:'007', m:2600, txt:
`Revisada la instrumentación completa. Sin fallos.
El problema no es el equipo.` },

  { id:'008', m:3000, txt:
`La caída de temperatura no es constante. Sube y baja.
Voy a medir cada cuánto.` },

  /* ---- El periodo ---- */

  { id:'009', m:3400, txt:
`Periodo confirmado: 41 minutos exactos.
Nada a esta profundidad tiene un periodo.` },

  { id:'010', m:4100, txt:
`Consultada la literatura. No hay precedente de oscilación
térmica periódica en roca continental.
Adjunto los datos. No adjunto conclusiones.` },

  { id:'011', m:4900, txt:
`Central responde: "continúe la perforación".
No preguntan por el periodo.` },

  { id:'012', m:5600, txt:
`El periodo ha bajado a 38 minutos.
Se acorta según bajamos.` },

  { id:'013', m:7300, txt:
`Los micrófonos de fondo registran actividad con los equipos
parados. Descartado origen mecánico: no hay equipos en marcha.` },

  { id:'014', m:8800, txt:
`Apagué la sonda para calibrarla. Siguió enviando datos once
minutos. Los datos eran correctos.` },

  { id:'015', m:10500, txt:
`El periodo ya no se mide en minutos.` },

  /* ---- Kola: fin de lo conocido ---- */

  { id:'016', m:12262, txt:
`Igualado el récord de Kola: 12.262 m.
A partir de aquí no existe literatura.
El periodo es de 41 segundos.` },

  { id:'017', m:15000, txt:
`Superado el récord en 2.738 m.
Central no ha acusado recibo. Sigo perforando.` },

  { id:'018', m:20000, txt:
`Las muestras dan isótopos con periodo de semidesintegración
negativo. Esa frase no significa nada.
La dejo escrita igual.` },

  { id:'019', m:28000, txt:
`He dejado de anotar la temperatura. No sirve de nada.
Anoto el periodo: 12 segundos.` },

  /* ---- Corteza atravesada ---- */

  { id:'020', m:35000, txt:
`Discontinuidad de Mohorovičić. Fin de la corteza.
La velocidad sísmica cambia como predice el modelo.
Es lo único que ha cumplido el modelo en todo el pozo.` },

  { id:'021', m:60000, txt:
`Manto superior. Roca dúctil.
El pozo no debería mantenerse abierto.
Se mantiene abierto.` },

  { id:'022', m:120000, txt:
`El periodo coincide con el intervalo entre mis entradas.
He escrito esta antes de tiempo para comprobarlo.
Sigue coincidiendo.` },

  { id:'023', m:410000, txt:
`Zona de transición. 410 km.
Aquí el olivino cambia de estructura. Está documentado.
La documentación no menciona que sea regular.` },

  { id:'024', m:660000, txt:
`Manto inferior.
He releído mis entradas desde el principio.
La 003 no la escribí yo.` },

  { id:'025', m:1500000, txt:
`Sin incidencias.
Sin incidencias.
Sin incidencias.` },

  /* ---- Núcleo ---- */

  { id:'026', m:2890000, txt:
`Discontinuidad de Gutenberg. Núcleo externo. Hierro líquido.
El pozo atraviesa un fluido a 4.000 °C.
No hay ninguna razón por la que esto deba funcionar.` },

  { id:'027', m:5150000, txt:
`Discontinuidad de Lehmann. Núcleo interno.
Sólido. Estático. Silencioso.
El periodo se ha estabilizado. Coincide con el mío.` },

  { id:'028', m:6371000, final:true, txt:
`Centro geométrico.
Temperatura: la prevista. Presión: la prevista.
No hay cavidad. No hay señal. No hay nada que anotar.

Registro cerrado por el operador.
Yo no he cerrado el registro.` },

  /* ============================================================
     EXCLUSIVAS DE POZO (punto 4)
     Profundidad baja a propósito: son lo primero que lee el
     jugador al abrir un pozo nuevo, justo después de perderlo
     todo. Ahí es donde pegan.
     ============================================================ */

  { id:'A01', m:12, pozo:2, txt:
`Perforación nueva. Emplazamiento a 400 m del anterior.
El periodo, a doce metros, es de 41 segundos.` },

  { id:'A02', m:200, pozo:3, txt:
`Tercer emplazamiento. A 400 m del anterior, según el
protocolo que redacté yo.
No recuerdo haber redactado ese protocolo.` },

  { id:'A03', m:1000, pozo:4, txt:
`Central pregunta por qué hay cuatro pozos.
Les he enviado el registro completo.
Responden que el registro está vacío.` },

  { id:'A04', m:5000, pozo:5, txt:
`He recuperado las muestras de los cuatro pozos anteriores.
Todas dan la misma fecha de extracción.
La de hoy.` },

  { id:'A05', m:100, pozo:6, txt:
`El pozo anterior no se cerró. Sigue abierto.
Lo he comprobado desde arriba. Se ve el fondo.
Desde 55 kilómetros, se ve el fondo.` }

];
