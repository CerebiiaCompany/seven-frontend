import { ReactNode, RefObject } from "react";
import { motion, MotionProps, PanInfo, useMotionValue } from "framer-motion";

export const clamp = (n: number) => Math.min(97, Math.max(3, n));

interface FieldDraggableProps {
  fieldRef: RefObject<HTMLDivElement>;
  x: number;
  y: number;
  onMove: (pos: { x: number; y: number }) => void;
  className?: string;
  title?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
  children: ReactNode;
}

/**
 * Token arrastrable posicionado por porcentaje (`x`/`y`) sobre `fieldRef`.
 *
 * El `drag` de Framer Motion sigue el puntero aplicando su propio
 * `transform` (vía motion values `x`/`y`) por encima del `left`/`top` ya
 * fijado por CSS. Si al soltar solo actualizábamos `left`/`top` sin
 * resetear esas motion values a 0, ese transform quedaba "pegado" y se
 * sumaba sobre la nueva posición — el elemento terminaba desplazado del
 * punto exacto donde se soltó. Por eso aquí:
 * 1. El nuevo porcentaje se calcula con `info.offset` (delta del gesto
 *    actual, en píxeles de pantalla) en vez de `info.point` (coordenadas
 *    de página, que además se desalinean de `getBoundingClientRect()` —
 *    que es relativo al viewport — en cuanto la página tiene scroll).
 * 2. Tras soltar, `mx`/`my` se resetean a 0 para no arrastrar ese offset
 *    visual a la siguiente vez que se mueva el elemento.
 * `transformTemplate` reemplaza el centrado por clase (`-translate-x-1/2
 * -translate-y-1/2`) para poder combinarlo con el transform de Framer sin
 * que uno pise al otro.
 */
export const FieldDraggable = ({ fieldRef, x, y, onMove, className, ...rest }: FieldDraggableProps) => {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    mx.set(0);
    my.set(0);
    if (!rect) return;
    onMove({
      x: clamp(x + (info.offset.x / rect.width) * 100),
      y: clamp(y + (info.offset.y / rect.height) * 100),
    });
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
      style={{ x: mx, y: my, left: `${x}%`, top: `${y}%` }}
      className={className}
      {...rest}
    />
  );
};
