declare module 'animejs/lib/anime.es.js' {
  export interface AnimeInstance {
    play: () => AnimeInstance;
    pause: () => AnimeInstance;
    restart: () => AnimeInstance;
    seek: (time: number) => AnimeInstance;
    reverse: () => AnimeInstance;
    // Add other methods as needed
  }

  export interface AnimeParams {
    targets: string | Element | Element[] | NodeList | null;
    duration?: number;
    delay?: number | ((el: Element, i: number, l: number) => number);
    easing?: string;
    elasticity?: number;
    round?: number | boolean;
    loop?: number | boolean;
    alternate?: boolean;
    direction?: 'normal' | 'reverse' | 'alternate';
    autoplay?: boolean;
    // Add other parameters as needed
    [prop: string]: any;
  }

  export interface AnimeFunctions {
    stagger: (value: number, options?: object) => ((el: Element, i: number, l: number) => number);
    // Add other functions as needed
  }

  export type AnimateFunction = (params: AnimeParams) => AnimeInstance;
  export type AnimateWithTarget = (targets: string | Element | Element[] | NodeList | null, params: AnimeParams) => AnimeInstance;

  // For v4 format
  export const animate: AnimateFunction & AnimateWithTarget & AnimeFunctions;
  
  // For v3 format compatibility
  export default (animate as AnimateFunction & AnimeFunctions);
} 