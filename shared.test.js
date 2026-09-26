/**
 * Copyright 2026 Pathways Canada. All Rights Reserved.
 * This code is the proprietary property of Pathways Canada and is subject to Invention Assignment Agreements.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Define mocks on the global scope BEFORE importing shared.js
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, value) => { localStorageStore[key] = String(value); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => {
    for (const key in localStorageStore) {
      delete localStorageStore[key];
    }
  }
};

global.window = {
  dispatchEvent: () => {},
  location: { search: '' },
  history: { replaceState: () => {} }
};

describe('Pathway Canada Matcher & Paywall Logic', () => {
  let calculateMatches;

  beforeEach(async () => {
    global.localStorage.clear();
    // Dynamic import to prevent hoisting execution before mocks are set up
    const shared = await import('./shared.js');
    calculateMatches = shared.calculateMatches || global.window.calculateMatches;
  });

  it('should apply proLocked: true for competitive programs when the user is on the Free tier', () => {
    global.localStorage.setItem('pathway_canada_state', JSON.stringify({
      isPro: false,
      courses: []
    }));

    const results = calculateMatches([]);

    // Waterloo Software Engineering
    const waterlooSE = results.find(item => 
      item.id === 'university-of-waterloo' && 
      (item.program.includes('Software') || item.program.includes('SE'))
    );
    expect(waterlooSE).toBeDefined();
    expect(waterlooSE.proLocked).toBe(true);

    // U of T Computer Science
    const uoftCS = results.find(item => 
      item.id === 'university-of-toronto' && 
      (item.program.includes('Computer Science') || item.program.includes('CS'))
    );
    expect(uoftCS).toBeDefined();
    expect(uoftCS.proLocked).toBe(true);

    // McGill Computer Science
    const mcgillCS = results.find(item => 
      item.id === 'mcgill-university' && 
      (item.program.includes('Computer Science') || item.program.includes('Software'))
    );
    expect(mcgillCS).toBeDefined();
    expect(mcgillCS.proLocked).toBe(true);

    // McMaster Health Sci
    const mcmasterHealth = results.find(item => 
      item.id === 'mcmaster-university' && 
      (item.program.includes('Health Sciences') || item.program.includes('Health Sci'))
    );
    expect(mcmasterHealth).toBeDefined();
    expect(mcmasterHealth.proLocked).toBe(true);

    // Non-competitive should not be locked
    const algomaArts = results.find(item => item.id === 'algoma-university');
    if (algomaArts) {
      expect(algomaArts.proLocked).toBe(false);
    }
  });

  it('should apply proLocked: false for all competitive programs when the user is on the Pro tier', () => {
    global.localStorage.setItem('pathway_canada_state', JSON.stringify({
      isPro: true,
      courses: []
    }));

    const results = calculateMatches([]);

    // Waterloo SE
    const waterlooSE = results.find(item => 
      item.id === 'university-of-waterloo' && 
      (item.program.includes('Software') || item.program.includes('SE'))
    );
    expect(waterlooSE).toBeDefined();
    expect(waterlooSE.proLocked).toBe(false);

    // U of T CS
    const uoftCS = results.find(item => 
      item.id === 'university-of-toronto' && 
      (item.program.includes('Computer Science') || item.program.includes('CS'))
    );
    expect(uoftCS).toBeDefined();
    expect(uoftCS.proLocked).toBe(false);

    // McGill CS
    const mcgillCS = results.find(item => 
      item.id === 'mcgill-university' && 
      (item.program.includes('Computer Science') || item.program.includes('Software'))
    );
    expect(mcgillCS).toBeDefined();
    expect(mcgillCS.proLocked).toBe(false);

    // McMaster Health Sci
    const mcmasterHealth = results.find(item => 
      item.id === 'mcmaster-university' && 
      (item.program.includes('Health Sciences') || item.program.includes('Health Sci'))
    );
    expect(mcmasterHealth).toBeDefined();
    expect(mcmasterHealth.proLocked).toBe(false);
  });
});
