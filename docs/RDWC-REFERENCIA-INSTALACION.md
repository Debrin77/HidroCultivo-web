# RDWC — Referencia de instalación (uso interno)

Documento derivado de manual técnico de kit modular RDWC XL 2.0 (recirculación profunda). **Sin marcas** en la app; aquí solo reglas de montaje y criterios para presets y diagramas.

## Componentes

- **Depósito de control**: bomba de recirculación, mezcla, EC/pH, opcional venturi en el propio depósito.
- **Cubos de cultivo**: un sitio por cubo; junta de aire en el borde superior; piedra difusora **en cada cubo**.
- **Impulsión**: salida del depósito (eje central) → tubería de reparto inferior → sube a cada cubo (codos 90°).
- **Retorno (circuito cerrado)**: codos 90° desde cubos de la fila superior al depósito; bajante por columna entre filas; fila inferior vuelve al eje y sube al depósito.

## Filas y cubos (plantillas app)

**36 plantillas** en el selector (agrupadas por 1–4 filas): desde **2 cubos · 1 fila** hasta **32 cubos · 4 filas**. Los valores de las 9 combinaciones del manual XL 2.0 van ancladas; el resto se calcula con la misma escala (recirculación, aire, depósito, mangueras).

| Cubos | Filas | Depósito control (L máx orient.) | Aire (L/min orient.) |
|------|-------|----------------------------------|----------------------|
| 4 | 2 | 40 | 28 |
| 6 | 2 | 45 | 32 |
| 8 | 2 | 50 | 40 |
| 9 | 3 | 55 | 42 |
| 12 | 3 o 4 | 60 | 55 |
| 16 | 4 | 70 | 60 |
| 18 | 3 | 75 | 72 |
| 24 | 4 | 90 | 80 |

Ejemplos extra en app: 10·2 filas, 15·3, 20·4, 28·4, 12·1 fila (línea), etc.

Cubo nominal típico: **20 L**. Cesta: **Ø 125 mm** (14 cm). Separación centro a centro: **36–45 cm**.

## Aireación

1. Bomba de aire **por encima** del nivel del agua del circuito.
2. Línea principal (manguera 12×8 mm en kits grandes).
3. **Manifold** por cubo (derivación 6×4 mm).
4. Manguera silicona ~50–60 cm → codo → **piedra porosa** dentro del cubo.
5. Caudal total orientativo: **1 L/min por cada 8–10 L** de volumen útil del circuito; repartir entre **todos los cubos de cultivo**.

## Hidráulica (cálculo app)

- Recirculación: **1,2–2 renovaciones/h** del volumen útil total (depósito + cubos).
- Tubos impulsión/retorno: Ø orientativo según caudal (25–63 mm en montajes grandes).
- Distancia entre cubos: ajustable deslizando tubo en junta (mín. ~3 cm dentro del cubo).

## Prueba del sistema

1. Llenar hasta **borde inferior de la cesta**.
2. Circular 15 min; revisar fugas en juntas y racores.
3. Comprobar **todas las piedras**.
4. EC/pH en depósito de control con bomba en marcha.

## Vista cenital en HidroCultivo

Con **2 o más filas**, el diagrama usa layout **plan**: depósito arriba, impulsión amarilla (eje), reparto rosa abajo, retorno naranja en L y por columnas. Sin tuberías grises horizontales entre cubos de la misma fila.

PDF de referencia (interno): `docs/RDWC-manual-referencia-tecnica.pdf` — no mostrar al usuario final.
