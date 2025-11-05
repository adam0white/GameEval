/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/frontend/**/*.{js,ts,jsx,tsx}", "./index.html", "./main.tsx"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#f97316",
          dark: "#c2410c",
        },
        success: "#22c55e",
        error: "#ef4444",
        background: "#0a0a0a",
        surface: "#161616",
        border: "#333333",
      },
      fontSize: {
        // AC3 Typography Scale Requirements
        h1: ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],      // 32px
        h2: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],      // 24px  
        h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],  // 20px
        body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],    // 16px
        small: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }], // 14px
      },
    },
  },
};

