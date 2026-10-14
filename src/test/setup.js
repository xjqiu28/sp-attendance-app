import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Testing Library only auto-cleans between tests when Vitest globals
// are on — they aren't here, so unmount each test's render explicitly.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
