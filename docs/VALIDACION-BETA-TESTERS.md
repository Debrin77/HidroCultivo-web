# HidroCultivo — Guion de validación con testers (beta cerrada)

Objetivo: saber si la app **se usa en recargas reales**, no solo si “se ve bien”. Ideal: **5–15 cultivadores** con sistemas distintos (torre, NFT, DWC, RDWC o SRF), 2–4 semanas de uso libre + una entrevista corta al final.

---

## Antes de empezar (tú)

- [ ] Misma versión para todos (APK/AAB o enlace Play internal testing).
- [ ] Política de privacidad accesible (URL o pantalla Ayuda).
- [ ] Canal de feedback (WhatsApp, email o formulario) y fecha límite del piloto.
- [ ] Pedir permiso para citar feedback **sin nombre** en un one-pager para fabricantes.

---

## Guion — 10 preguntas

Usa las preguntas abiertas tal cual; anota respuestas literales cuando puedas. Tiempo orientativo: **15–25 min** (videollamada o mensajes de voz).

### 1. Contexto

**¿Qué sistema hidropónico usas y con qué frecuencia haces recargas o revisiones de EC/pH?**

*Qué buscas:* encaje real del perfil (principiante vs avanzado, volumen de uso).

### 2. Problema previo

**Antes de HidroCultivo, ¿cómo llevabas el control (cuaderno, Excel, otra app, memoria)? ¿Qué te fallaba o te daba pereza?**

*Qué buscas:* dolor que la app debe resolver.

### 3. Primera impresión (onboarding)

**La primera vez que configuraste una instalación (asistente), ¿pudiste terminarla sol@? ¿En qué paso te atascaste o dudaste?**

*Qué buscas:* fricción del asistente y textos.

### 4. Utilidad núcleo

**¿Confías en los litros de mezcla, la bomba/aireador y las dosis orientativas que muestra la app? ¿Las comparaste con tu método habitual?**

*Qué buscas:* credibilidad técnica (criterio go/no-go B2B).

### 5. Uso recurrente

**En las últimas 2–4 semanas, ¿cuántas veces abriste la app para una recarga, medición o checklist real? ¿Qué pestañas usaste más?**

*Qué buscas:* retención y hábito (no solo “la instalé”).

### 6. Lo que más ayuda

**¿Qué función te ha ahorrado más tiempo o errores (checklist, diagrama, consejos, clima, historial, otra)?**

*Qué buscas:* mensaje para marketing y para fabricantes.

### 7. Lo que falta o sobra

**¿Qué echas en falta o quitarías para usarla como herramienta principal?**

*Qué buscas:* roadmap priorizado.

### 8. Móvil y estabilidad

**¿La usaste sobre todo en móvil o en PC? ¿Algún fallo grave (pantalla en blanco, datos perdidos, lentitud)?**

*Qué buscas:* bugs bloqueantes antes de Play abierto.

### 9. Recomendación

**Del 0 al 10, ¿la recomendarías a otro cultivador hidropónico? ¿Por qué esa nota y no más alta?**

*Qué buscas:* NPS informal + argumentos.

### 10. Cierre (monetización futura)

**Si la app mostrara información de marcas de nutrientes claramente etiquetada como patrocinio, ¿te parecería aceptable si los cálculos siguen siendo neutrales? ¿Qué te haría desconfiar?**

*Qué buscas:* límites éticos antes de contactar fabricantes.

---

## Preguntas opcionales (si hay tiempo)

- ¿Usaste más de una instalación (torre + NFT, etc.) en la misma app?
- ¿Exportaste/importaste copia de seguridad? ¿Te resultó claro?
- ¿Leerías “Consejos” antes de una recarga o solo el checklist?

---

## Plantilla de registro por tester

Copia una fila por persona:

| ID | Sistema | Semanas | P1 contexto | P5 uso recurrente | Nota 0–10 | ¿Seguiría usándola? | Cita útil (anonimizada) |
|----|---------|---------|-------------|-------------------|-----------|---------------------|-------------------------|
| T01 | | | | | | Sí / No / Tal vez | |
| T02 | | | | | | | |

---

## Criterios simples go / no-go (después de 5+ testers)

| Señal verde | Señal roja |
|-------------|------------|
| ≥3 personas usan checklist o recarga **más de una vez** | Nadie completa el asistente sin ayuda |
| Nota media ≥7 con motivos concretos positivos | Desconfianza generalizada en litros/dosis |
| Bugs graves = 0 o corregibles en 1 sprint | Pérdida de datos o bloqueo en móvil |

Si hay **verde mayoritario**, tiene sentido preparar el [one-pager para fabricantes](ONE-PAGER-FABRICANTES.md) con 2–3 citas y métricas del piloto.

---

## Relacionado

- Pruebas técnicas: [CAPACITOR-PRUEBAS-INTERNAS.md](CAPACITOR-PRUEBAS-INTERNAS.md)
- Registro RPI: [RPI-REGISTRO-PREPARACION.md](RPI-REGISTRO-PREPARACION.md)
