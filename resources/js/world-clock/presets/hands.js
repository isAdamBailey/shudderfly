// Clock hand presets. Each hand is a closed SVG path expressed in a coordinate
// space whose origin (0,0) is the clock center; negative Y points up, so every
// path is drawn pointing to 12 o'clock and then rotated into place by the
// AnalogClock component. Colors are supplied by the face preset, not here, so
// silhouettes and palettes compose independently.

export const HAND_PRESETS = {
  classic: {
    id: "classic",
    label: "Classic",
    hour: "M -2.4 6 L -2.4 -27 Q 0 -31 2.4 -27 L 2.4 6 Z",
    minute: "M -1.8 8 L -1.8 -40 Q 0 -43 1.8 -40 L 1.8 8 Z",
    second: "M -0.7 12 L -0.7 -45 L 0.7 -45 L 0.7 12 Z"
  },
  ornate: {
    id: "ornate",
    label: "Ornate",
    hour: "M 0 9 L -3.4 -6 L -1.8 -20 L 0 -29 L 1.8 -20 L 3.4 -6 Z",
    minute: "M 0 11 L -2.6 -8 L -1.2 -30 L 0 -42 L 1.2 -30 L 2.6 -8 Z",
    second:
      "M -0.6 -46 L 0.6 -46 L 0.6 10 L -0.6 10 Z M 0 13 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0"
  },
  skeleton: {
    id: "skeleton",
    label: "Skeleton",
    hour: "M -1 5 L -1 -26 L 1 -26 L 1 5 Z",
    minute: "M -0.8 5 L -0.8 -40 L 0.8 -40 L 0.8 5 Z",
    second:
      "M -0.4 -46 L 0.4 -46 L 0.4 16 L -0.4 16 Z M 0 16 m -2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0"
  }
};

export const HAND_OPTIONS = Object.values(HAND_PRESETS).map((h) => ({
  value: h.id,
  label: h.label
}));

export function getHandPreset(id) {
  return HAND_PRESETS[id] || HAND_PRESETS.classic;
}
