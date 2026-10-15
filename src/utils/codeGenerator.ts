/**
 * ShepherdLink - Association Code Generator
 * Generates meaningful, memorable association codes based on association names.
 */

export const generateMeaningfulCode = (name: string): string => {
  const clean = (name || '').trim();
  if (!clean) return '';

  // Remove punctuation, retain letters and numbers
  const sanitized = clean.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const upperFull = sanitized.toUpperCase();

  // Known church / fellowship acronym mappings
  if (upperFull.includes('CHURCH OF SOUTH INDIA')) return 'CSI';
  if (upperFull.includes('ASSEMBLIES OF GOD')) return 'AOG';
  if (upperFull.includes('INDIAN PENTECOSTAL')) return 'IPC';
  if (upperFull.includes('BAPTIST CHURCH') || upperFull.includes('BAPTIST CONVENTION')) return 'CBC';

  // Case 1: First word is already an acronym (e.g. "UKUPS Pastors Association" -> "UKUPS")
  const firstWord = words[0];
  if (
    firstWord.length >= 2 &&
    firstWord.length <= 8 &&
    firstWord === firstWord.toUpperCase() &&
    /^[A-Z0-9]+$/.test(firstWord)
  ) {
    return firstWord;
  }

  // Common stop/filler words to exclude when forming acronyms
  const stopWords = new Set([
    'OF',
    'AND',
    '&',
    'THE',
    'FOR',
    'IN',
    'TO',
    'AT',
    'A',
    'AN',
    'BY',
    'WITH',
    'ON',
  ]);

  const meaningfulWords = words.filter((w) => !stopWords.has(w.toUpperCase()));
  const targetWords = meaningfulWords.length > 0 ? meaningfulWords : words;

  // Case 2: Multi-word names: take first letter of each meaningful word
  // e.g. "Vijayawada Pastors Association" -> "VPA"
  // "Bethel Pastors Fellowship" -> "BPF"
  // "All India Christian Pastors Association" -> "AICPA"
  if (targetWords.length >= 2) {
    const acronym = targetWords.map((w) => w[0].toUpperCase()).join('');
    if (acronym.length >= 2 && acronym.length <= 6) {
      return acronym;
    }
    if (acronym.length > 6) {
      return acronym.slice(0, 5);
    }
  }

  // Case 3: Single word
  // e.g. "Bethel" -> "BETHEL"
  if (targetWords.length === 1) {
    const w = targetWords[0].toUpperCase();
    if (w.length <= 6) return w;
    return w.slice(0, 5);
  }

  return 'ASSOC';
};

/**
 * Generates alternative suggested codes for the user to choose from
 */
export const getCodeSuggestions = (name: string): string[] => {
  const base = generateMeaningfulCode(name);
  if (!base) return [];

  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const suggestions = new Set<string>();

  suggestions.add(base);
  if (base.length <= 6) {
    suggestions.add(`${base}01`);
    suggestions.add(`${base}${yearSuffix}`);
    suggestions.add(`${base}-PA`);
  }

  return Array.from(suggestions).filter((s) => s.length >= 2 && s.length <= 10);
};
