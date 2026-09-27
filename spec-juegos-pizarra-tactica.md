# Spec: Juegos (pizarra táctica de entrenamiento)

## Prompt corto para pegar en Claude Code

> Lee `spec-juegos-pizarra-tactica.md` completo. Antes de escribir código, explora el proyecto (stack, estructura, la ruta `/gamification`, la sección "Alineación entrenamiento", cómo se manejan categorías, grupos y jugadores, y cómo se conecta la BD). Luego dame un plan de implementación por fases y las preguntas abiertas que tengas. No empieces a codificar hasta que apruebe el plan.

---

## 1. Contexto

En la ruta `/gamification` existe una sección llamada **"Alineación entrenamiento"**. Dentro de ella, la pestaña/opción que hoy dice **"Alineación"** debe pasar a llamarse **"Juegos"**.

"Juegos" es una herramienta para que el entrenador diseñe ejercicios y jugadas sobre una cancha (pizarra táctica): dibujar líneas, colocar conos, jugadores y otros objetos, guardar el diseño y exportarlo a PDF. Los diseños guardados forman el historial.

Como referencia visual hay capturas de una app de pizarra táctica de fútbol (adjuntas). Se replica la funcionalidad, pero con el diseño y los colores de nuestra app. Los candados de la app de referencia (funciones premium) **no aplican**: todo está disponible.

## 2. Flujo de usuario

1. **Historial (pantalla inicial de "Juegos")**
   - Lista de los juegos guardados (miniatura de la cancha, nombre, categoría, grupo, fecha de creación/modificación).
   - Botón **Crear**.
   - Al abrir un juego guardado se puede editar, duplicar, exportar a PDF y eliminar.
   - Estado vacío cuando no hay juegos.
2. **Selección previa (obligatoria antes de crear)**
   - El usuario elige **categoría** y **grupo**.
   - Con eso se cargan los jugadores de ese grupo, que se podrán usar en la pizarra.
   - No se puede entrar al editor sin haber elegido ambos.
3. **Editor de pizarra** (sección 3).
4. **Guardar** en la base de datos. El juego aparece en el historial.
5. **Exportar a PDF** desde el editor y desde el historial.

## 3. Editor de pizarra

### 3.1 Canchas
Tipos de cancha (según las capturas de referencia; revisarlas y cubrir todas las variantes que aparecen):
- Cancha completa (vertical).
- Media cancha (portería a un lado, izquierda y derecha).
- Campo libre/reducido (solo perímetro punteado, sin líneas de fútbol).
- Cualquier otra variante que aparezca en las capturas.

Color de campo (3 opciones):
1. **Verde clásico** (como las capturas).
2. **Negro con verde fosforescente**: los colores de la app. Tomar los valores exactos de los tokens/tema existentes.
3. **Gris**: elegir un gris con buen contraste para las líneas y objetos (líneas blancas o claras sobre gris oscuro/grafito, o la combinación que mejor se lea). Verificar contraste legible tanto en pantalla como en el PDF.

Las líneas de la cancha y los objetos deben mantenerse legibles en las tres paletas.

### 3.2 Dibujo de líneas
- Tipos de línea (ver captura "Tipo de línea"): sólida, punteada, con flecha, con terminación en X, con terminación en T/barra, ondulada (zigzag), curva, y combinaciones de estas (por ejemplo curva punteada con flecha).
- Colores: negro, rojo, azul, amarillo.
- Grosor: 4 niveles.
- Las líneas se pueden seleccionar, mover, editar (tipo/color/grosor) y eliminar.

### 3.3 Objetos (paleta lateral)
Todos se pueden **arrastrar** al campo, mover, seleccionar y eliminar:
- Jugadores/muñecos de colores (amarillo, rojo, azul, rayado).
- Conos altos y platos/conos bajos (amarillo, rojo, azul).
- Aros, vallas, pértiga, escalera de coordinación, muñeco de barrera, arco/aro curvo.
- Porterías pequeñas.
- Balón.
- Texto (etiquetas libres).
- Formas geométricas ("+ Forma").
- Tarjetas y chalecos (nice to have).

### 3.4 Jugadores
- Equipo A y Equipo B: nombre del equipo, número de jugadores (0 a 11), forma y color.
- Los jugadores del grupo elegido (desde la BD) se pueden agregar al campo con su nombre/número.
- Opciones de estilo del jugador: número, número + nombre, portero (GK).
- Tamaño de jugadores ajustable.

### 3.5 Ajustes del editor
- Tipo y color de campo.
- Mostrar/ocultar balón.
- Cuadrícula: mostrar al arrastrar y ajustar objetos a la cuadrícula (ambas opcionales).
- Deshacer / rehacer.
- Borrar seleccionado y limpiar todo.
- Funciona con mouse y touch.

## 4. Persistencia (BD)

Guardar cada juego con:
- id, nombre, categoría, grupo, autor, fechas de creación y modificación.
- Configuración: tipo de cancha, color de campo, ajustes de jugadores.
- **Escena serializada (JSON)**: lista de objetos con tipo, posición, rotación, tamaño, color, y lista de líneas con puntos, tipo, color y grosor. Debe permitir reabrir y seguir editando.
- Miniatura (imagen) para el historial.

Endpoints CRUD: listar (filtrable por categoría/grupo), obtener, crear, actualizar, duplicar, eliminar. Respetar los permisos y la autenticación que ya usa la app.

## 5. Exportar a PDF
- Exporta la cancha con todo lo dibujado, tal como se ve en pantalla.
- Encabezado con nombre del juego, categoría, grupo y fecha.
- Orientación adecuada al tipo de cancha (vertical u horizontal).
- Respeta el color de campo elegido (considerar una opción "versión para imprimir" en blanco/claro para ahorrar tinta).
- Disponible desde el editor y desde el historial.

## 6. Criterios de aceptación
- [ ] La opción "Alineación" se renombra a "Juegos" y muestra el historial.
- [ ] No se puede crear sin elegir categoría y grupo; los jugadores cargados corresponden a ese grupo.
- [ ] Se puede elegir entre todos los tipos de cancha y los 3 colores de campo.
- [ ] Se pueden dibujar líneas de todos los tipos, colores y grosores.
- [ ] Se pueden arrastrar, mover y eliminar objetos y jugadores.
- [ ] Deshacer/rehacer funciona.
- [ ] Guardar crea el registro en BD y aparece en el historial; reabrirlo reproduce exactamente el diseño y permite editarlo.
- [ ] El PDF se exporta correctamente en los 3 colores de campo.
- [ ] Funciona en escritorio y en móvil.

## 7. Fuera de alcance (v1)
- Animaciones/video de jugadas (el ícono de película de la app de referencia).
- Funciones premium/bloqueadas de la app de referencia.
- Compartir en tiempo real / edición colaborativa.

## 8. Instrucciones para quien implemente
1. Explorar primero el código existente y **reutilizar** el stack, componentes, estilos, tema y patrones de API/BD del proyecto. No introducir tecnologías nuevas sin justificarlo.
2. Proponer la tecnología para el lienzo (SVG, Canvas o una librería como Konva) justificando la elección según soporte de arrastre, touch, serialización y exportación a PDF.
3. Entregar un plan por fases, por ejemplo: (1) renombrar + historial + selección categoría/grupo + modelo de BD, (2) editor: canchas, colores y objetos, (3) líneas, (4) jugadores del grupo, (5) guardar/reabrir, (6) PDF, (7) pulido y pruebas.
4. Listar las preguntas abiertas antes de codificar.
