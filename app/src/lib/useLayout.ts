import { useWindowDimensions } from 'react-native';

export type Device = 'phone' | 'tablet' | 'desktop';

/**
 * Breakpoints used everywhere:
 *  phone   < 640  → bottom tab bar, single column
 *  tablet  < 1100 → side rail (icons + labels), 2 columns
 *  desktop ≥ 1100 → wide sidebar, 3 columns, content max-width 1200
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const device: Device = width < 640 ? 'phone' : width < 1100 ? 'tablet' : 'desktop';
  const columns = device === 'phone' ? 1 : device === 'tablet' ? 2 : 3;
  const gutter = device === 'phone' ? 20 : 28;
  return { width, height, device, isPhone: device === 'phone', columns, gutter };
}

/** Width of one item in a grid with `cols` columns inside `containerWidth`. */
export function gridItemWidth(containerWidth: number, cols: number, gap: number) {
  return Math.floor((containerWidth - gap * (cols - 1)) / cols);
}
