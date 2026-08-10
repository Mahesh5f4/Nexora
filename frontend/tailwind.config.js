/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        surface: {
          DEFAULT: "#0f172a",
          light: "#1e293b",
          lighter: "#334155",
        },
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          muted: "rgba(99, 102, 241, 0.1)",
        },
        secondary: {
          DEFAULT: "#ec4899",
          hover: "#db2777",
          muted: "rgba(236, 72, 153, 0.1)",
        },
        accent: {
          DEFAULT: "#10b981",
          hover: "#059669",
          muted: "rgba(16, 185, 129, 0.1)",
        },
        danger: {
          DEFAULT: "#ef4444",
          hover: "#dc2626",
          muted: "rgba(239, 68, 68, 0.1)",
        },
        text: {
          main: "#f8fafc",
          muted: "#94a3b8",
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'premium': '0 0 50px -12px rgba(0, 0, 0, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'premium-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
