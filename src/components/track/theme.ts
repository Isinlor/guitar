import { reactive } from 'vue';

export const ThemeManager = {
  theme: reactive({
    stringNylon: '#555',
    stringMetal: '#777',
    playLine: '#ef4444',
    fingers: {
      0: '#a78bfa',
      1: '#60a5fa',
      2: '#fcd34d',
      3: '#f87171',
      4: '#34d399'
    } as Record<number, string>
  }),
  refresh() {
    const s = getComputedStyle(document.documentElement);
    const get = (k: string, fallback: string) => (s.getPropertyValue(k) || fallback).trim();

    this.theme.stringNylon = get('--string-nylon', '#555');
    this.theme.stringMetal = get('--string-metal', '#777');
    this.theme.playLine = get('--play-line-color', '#ef4444');

    this.theme.fingers = {
      0: get('--finger-T', '#a78bfa'),
      1: get('--finger-1', '#60a5fa'),
      2: get('--finger-2', '#fcd34d'),
      3: get('--finger-3', '#f87171'),
      4: get('--finger-4', '#34d399')
    };
  }
};
