import { render } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import BackgroundPaths from '../BackgroundPaths';

// Mock Math.random to be deterministic for test
const randomValues: number[] = [];
let rvIndex = 0;
const seededRandom = () => {
  if (rvIndex >= randomValues.length) rvIndex = 0;
  return randomValues[rvIndex++];
};

describe('BackgroundPaths', () => {
  beforeEach(() => {
    // deterministic sequence: alternate values to produce different x/y/props
    randomValues.length = 0;
    randomValues.push(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
    rvIndex = 0;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders expected number of streak groups and paths with quadratic bezier', () => {
    const count = 6;
    render(<BackgroundPaths count={count} color="rgb(255,0,0)" />);

    // čekáme count <g data-debug="true"> elementů
    const groups = document.querySelectorAll('g[data-debug="true"]');
    expect(groups.length).toBe(count);

    // Každá skupina by měla obsahovat <path> s atributem stroke a křivkou Q
    groups.forEach((g) => {
      const path = g.querySelector('path');
      expect(path).toBeTruthy();
      if (path) {
        const d = path.getAttribute('d') || '';
        expect(d.includes('Q')).toBe(true);
        expect(path.getAttribute('stroke')).toBe('rgb(255,0,0)');
      }
    });
  });
});
