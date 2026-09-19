import { clampTranslationToBounds } from '../utils';
import { getTapZoomTarget } from '../utils/tapZoom';

const geometry = { width: 393, height: 852, contentWidth: 393, contentHeight: 616 };
const bound = (rotation: number, scale = 2, translateX = 1000, translateY = -1000) =>
  clampTranslationToBounds({ ...geometry, rotation, scale, translateX, translateY });

describe('rotation-aware content bounds', () => {
  it.each([90, 270, -90, -270, 450, -450])('exchanges content axes at %s degrees', (angle) => {
    expect(bound(angle)).toEqual({ translateX: 419.5, translateY: 0 });
    expect(bound(angle, 2, -1000, 1000)).toEqual({ translateX: -419.5, translateY: 0 });
  });

  it.each([0, 180, -180, 360, 540, 720])('preserves unrotated extents at %s degrees', (angle) => {
    expect(bound(angle)).toEqual({ translateX: 196.5, translateY: -190 });
  });

  it.each([45, 135, -45])('uses the bounding rectangle during a %s degree rotation', (angle) => {
    const result = bound(angle);
    const diagonalExtent = 1009 / Math.sqrt(2);
    expect(result.translateX).toBeCloseTo(diagonalExtent - 196.5);
    expect(result.translateY).toBeCloseTo(-(diagonalExtent - 426));
  });

  it('approaches quarter turns continuously without a negative zero', () => {
    expect(bound(89.999999).translateX).toBeCloseTo(bound(90).translateX, 4);
    expect(bound(90.000001).translateX).toBeCloseTo(bound(90).translateX, 4);
    expect(Object.is(bound(90).translateY, -0)).toBe(false);
  });

  it('retains valid translations and the scale <= 1 contract', () => {
    expect(bound(90, 2, 30, 0)).toEqual({ translateX: 30, translateY: 0 });
    expect(bound(90, 1, 30, 50)).toEqual({ translateX: 30, translateY: 50 });
    expect(bound(90, 0.8, 30, 50)).toEqual({ translateX: 30, translateY: 50 });
  });

  it('rotates the viewer-cell fallback without exchanging the viewport axes', () => {
    expect(
      clampTranslationToBounds({
        ...geometry,
        contentWidth: NaN,
        contentHeight: 0,
        rotation: 90,
        scale: 2,
        translateX: 1000,
        translateY: 1000,
      }),
    ).toEqual({ translateX: 655.5, translateY: 0 });
  });

  it('centers both undersized axes for landscape content and preserves square extents', () => {
    expect(
      clampTranslationToBounds({
        width: 400,
        height: 800,
        contentWidth: 400,
        contentHeight: 200,
        rotation: 90,
        scale: 2,
        translateX: 500,
        translateY: 500,
      }),
    ).toEqual({ translateX: 0, translateY: 0 });
    expect(
      clampTranslationToBounds({
        width: 400,
        height: 800,
        contentWidth: 200,
        contentHeight: 200,
        rotation: 270,
        scale: 3,
        translateX: 500,
        translateY: 500,
      }),
    ).toEqual({ translateX: 100, translateY: 0 });
  });

  it('clamps tap zoom against the rotated content', () => {
    expect(
      getTapZoomTarget({
        ...geometry,
        rotation: 90,
        scale: 1,
        maxZoomScale: 2,
        x: 0,
        y: 0,
      }),
    ).toEqual({ scale: 2, translateX: 196.5, translateY: 0 });
  });
});
