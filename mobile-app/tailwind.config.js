/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#102F50",          // Primary Navy
          navySecondary: "#12385B", // Secondary Navy
          orange: "#F59E0B",        // Orange
          success: "#16A36A",       // Success
          error: "#DC4545",         // Error
          info: "#2563EB",          // Info
          surface: "#F1F5F9",       // Secondary Surface
          border: "#E2E8F0",        // Border
          text: "#102F50",          // Main Text
          textSecondary: "#64748B", // Secondary Text
        }
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        sinhala: ["NotoSansSinhala_400Regular"],
        "sinhala-medium": ["NotoSansSinhala_500Medium"],
        "sinhala-semibold": ["NotoSansSinhala_600SemiBold"],
        "sinhala-bold": ["NotoSansSinhala_700Bold"],
      },
    },
  },
  plugins: [],
};