import React from 'react';

export interface CropStyleResult {
  widthPct: number;
  heightPct: number;
  maxX_pct: number;
  maxY_pct: number;
  shiftXPct: number;
  shiftYPct: number;
  style: React.CSSProperties;
}

/**
 * Calculates cover scale, maximum travel limits, and exact CSS positioning styles
 * for image viewport cropping without ANY white/blank space.
 *
 * @param aspectRatio naturalWidth / naturalHeight of the image
 * @param zoomInput zoom scale (>= 1.0)
 * @param cropXInput normalized horizontal shift (-100 to +100)
 * @param cropYInput normalized vertical shift (-100 to +100)
 */
export function computeCoverCropStyle(
  aspectRatio: number,
  zoomInput: number = 1,
  cropXInput: number = 0,
  cropYInput: number = 0
): CropStyleResult {
  const aspect = Math.max(0.05, aspectRatio || 1);
  const zoom = Math.max(1.0, Math.min(3.0, Number(zoomInput) || 1.0));
  const normX = Math.max(-1, Math.min(1, (Number(cropXInput) || 0) / 100));
  const normY = Math.max(-1, Math.min(1, (Number(cropYInput) || 0) / 100));

  let widthPct: number;
  let heightPct: number;

  if (aspect >= 1) {
    // Landscape or square
    widthPct = aspect * zoom * 100;
    heightPct = zoom * 100;
  } else {
    // Portrait
    widthPct = zoom * 100;
    heightPct = (1 / aspect) * zoom * 100;
  }

  const maxX_pct = Math.max(0, (widthPct - 100) / 2);
  const maxY_pct = Math.max(0, (heightPct - 100) / 2);

  const shiftXPct = normX * maxX_pct;
  const shiftYPct = normY * maxY_pct;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `calc(50% + ${shiftXPct.toFixed(4)}%)`,
    top: `calc(50% + ${shiftYPct.toFixed(4)}%)`,
    width: `${widthPct.toFixed(4)}%`,
    height: `${heightPct.toFixed(4)}%`,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: 'translate(-50%, -50%)',
    transformOrigin: 'center center',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return {
    widthPct,
    heightPct,
    maxX_pct,
    maxY_pct,
    shiftXPct,
    shiftYPct,
    style,
  };
}
