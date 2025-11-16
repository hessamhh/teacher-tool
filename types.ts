export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObjectTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ObsSceneItem {
  itemId: number;
  sourceName: string;
  isVisible: boolean;
}
