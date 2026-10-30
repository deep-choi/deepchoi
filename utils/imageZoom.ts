export interface Point { x: number; y: number }
export interface ImageTransform { zoom: number; pan: Point }

export const clampZoom = (zoom: number) => Math.min(4, Math.max(1, zoom));

/** Keep the image point under the gesture's midpoint fixed while zooming. */
export const pinchTransform = (
    start: ImageTransform, startCenter: Point, center: Point, ratio: number,
): ImageTransform => {
    const zoom = clampZoom(start.zoom * ratio);
    const factor = zoom / start.zoom;
    return {
        zoom,
        pan: {
            x: center.x - (startCenter.x - start.pan.x) * factor,
            y: center.y - (startCenter.y - start.pan.y) * factor,
        },
    };
};

export const boundImagePan = (pan: Point, zoom: number, image: Point, viewport: Point): Point => {
    const maxX = Math.max(0, (image.x * zoom - viewport.x) / 2);
    const maxY = Math.max(0, (image.y * zoom - viewport.y) / 2);
    return {
        x: maxX ? Math.max(-maxX, Math.min(maxX, pan.x)) : 0,
        y: maxY ? Math.max(-maxY, Math.min(maxY, pan.y)) : 0,
    };
};
