/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class", 
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F2942",      // NayaPotha ප්‍රධාන තද නිල් පාට (Buttons & Headers)
          orange: "#F97316",    // '.ai' සහ ලෝගෝ එකේ තැඹිලි පාට
          green: "#16A34A",     // ලෝගෝ එකේ කොළ පාට
          light: "#F8FAFC",     // Card පසුබිම් පාට
          border: "#CBD5E1",    // Input/Card border පාට
        },
        risk: {
          low: "#22C55E",       // Low Risk 🟢
          medium: "#EAB308",    // Medium Risk 🟡
          high: "#EF4444",      // High Risk 🔴
        }
      },
      fontFamily: {
        poppins: ["Poppins_400Regular"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
        sinhala: ["NotoSansSinhala_400Regular"],
        "sinhala-bold": ["NotoSansSinhala_700Bold"],
      },
    },
  },
  plugins: [],
};