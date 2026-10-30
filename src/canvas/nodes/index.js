import { textNode } from './text.js';
import { photoNode } from './photo.js';
import { imageNode } from './image.js';
import { pointsNode } from './points.js';
import { qrNode } from './qr.js';
import { shapeNode } from './shape.js';

export const NODE_TYPES = {
  text: textNode,
  photo: photoNode,
  image: imageNode,
  points: pointsNode,
  qr: qrNode,
  shape: shapeNode,
};
