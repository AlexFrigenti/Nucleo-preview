# Núcleo

Juego *idle* de perforación geotérmica profunda, en una sola página web (HTML + JavaScript, sin dependencias). El jugador es el técnico de turno: perfora, instala equipo, sube muestras a superficie y va descubriendo, en el registro de perforación, que algo ahí abajo no cuadra.

**Jugar:** https://alexfrigenti.github.io/Nucleo/

Funciona en cualquier navegador. En el iPhone se puede añadir a la pantalla de inicio (Safari → Compartir → *Añadir a pantalla de inicio*) y funciona **sin conexión**.

---

## Estructura del proyecto

### La web (lo que se juega)
| Archivo | Qué es |
|---|---|
| `index.html` | Entrada y estructura del juego. |
| `styles/app.css` | Sistema visual, diseño móvil y animaciones. |
| `scripts/app.js` | Simulación, guardado y renderizado de la interfaz. |
| `registro.js` | Las entradas del Registro de perforación (el lore). |
| `sw.js` | *Service worker*: guarda copia para uso offline y gestiona las actualizaciones. |
| `manifest.webmanifest` | Ficha de la PWA (nombre, colores, pantalla completa). |
| `version.json` | Marcador de versión que usa el sistema de aviso de actualización. |
| `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Iconos de la app. |

### El envoltorio para la App Store (opcional)
| Archivo / carpeta | Qué es |
|---|---|
| `capacitor.config.json`, `package.json` | Configuración de **Capacitor** (envuelve la web como app iOS). |
| `build.js` | Copia los archivos web a `www/` (lo que Capacitor empaqueta). |
| `www/` | Copia generada de la web (no editar a mano; se regenera con `npm run build`). |
| `ios/` | Proyecto Xcode generado por Capacitor. |
| `codemagic.yaml` | Receta de compilación para **Codemagic** (compila la app iOS en la nube). |

---

## Cómo actualizar el juego

1. Editar `index.html`, `styles/app.css`, `scripts/app.js` o `registro.js`.
2. **Subir el número de versión en DOS sitios al mismo valor** (si no, no salta el aviso de actualización):
   - En `index.html`: la línea `const VERSION = N;`
   - En `version.json`: `{ "v": N }`
3. Publicar:
   ```bash
   git add .
   git commit -m "describe el cambio"
   git push
   ```
4. En 1–2 minutos GitHub Pages se actualiza. En el móvil aparecerá el aviso **"✨ Nueva versión disponible · toca para actualizar"**.

> El aviso de versión solo funciona si los dos números (`VERSION` y `version.json`) coinciden y suben juntos.

---

## App para la App Store (estado)

La web ya está **envuelta como app iOS** con Capacitor, y **compila correctamente** en Codemagic (build de prueba sin firmar, verificada). El pipeline completo funciona **desde Windows**, sin necesidad de un Mac físico (Codemagic usa un Mac en la nube).

**Para publicar de verdad en la App Store falta:**
- 💳 Cuenta de **Apple Developer** (99 $/año) — imprescindible para *firmar* la app.
- Añadir a `codemagic.yaml` la **firma de código** y la **publicación** en App Store Connect.
- Pasar la **revisión de Apple** (ojo con la norma 4.2: apps que son "solo una web envuelta").

**Recompilar en Codemagic:** cada cambio requiere `git push` y lanzar un nuevo build. La app iOS **no se actualiza sola** como la PWA: cada versión para la App Store necesita recompilar + subir número de versión + reenviar + revisión de Apple.

**Preparar el entorno local (si hiciera falta):**
```bash
npm install        # instala Capacitor
npm run build      # copia la web a www/
npx cap sync ios   # sincroniza con el proyecto iOS
```
(Requiere Node.js ≥ 22.)

---

## Notas técnicas

- Sin frameworks ni dependencias en el juego: HTML/CSS/JS puro.
- La simulación usa `requestAnimationFrame`; el render visual se limita a 10 fps,
  se pausa en segundo plano y deja de animar el radar fuera de Sondeo.
- **Prestigio** ("recalibrar"): cierra el pozo y abre otro; los isótopos (muestras) se conservan y multiplican la producción (×1,05 por muestra).
- **Profundidad** = √(julios producidos en el pozo actual), en metros. 1 muestra = 1.000 m. Referencia real: récord de Kola, 12.262 m.
- El **Registro** y los **Hitos** se guardan en la partida y no se pierden al recalibrar.
