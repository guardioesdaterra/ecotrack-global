// Interface for animation instances returned by anime.js
export interface AnimationInstance {
  play?: () => void;
  pause?: () => void;
  restart?: () => void;
  seek?: (time: number) => void;
  reverse?: () => void;
  complete?: () => void;
  [key: string]: any;
} 