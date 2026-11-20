/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Official AWS palette — used by the logo and the AWS sign-in buttons
        aws: {
          orange: '#FF9900',
          'orange-dark': '#EC7211',
          squid: '#232F3E',
          'squid-light': '#37475A',
        },
        // Full Pitch Black Canvas (#000000) with signature re:Invent palette
        reinvent: {
          teal: '#005C7D',
          blue: '#083D8D',
          indigo: '#311068',
          violet: '#4C158B',
          purple: '#8A188B',
          magenta: '#BD009E',
          pink: '#D912B0',
          cyan: '#00B4D8',
          // Pitch Black Enterprise Surfaces
          obsidian: '#000000',
          squid: '#060608',
          card: '#0A0A0D',
          surface: '#121217',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-active': 'rgba(189, 0, 158, 0.5)',
        },
        navy: {
          950: '#000000',
          900: '#030305',
          800: '#08080C',
          700: '#0F0F14',
          600: '#16161D',
        },
        status: {
          pending: '#F59E0B',
          approved: '#10B981',
          rejected: '#EF4444',
          waitlisted: '#38BDF8',
          'checked-in': '#A855F7',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        // Exact signature AWS re:Invent pill gradient
        'reinvent-pill': 'linear-gradient(90deg, #005C7D 0%, #083D8D 25%, #4C158B 50%, #8A188B 75%, #BD009E 100%)',
        'reinvent-glow': 'radial-gradient(ellipse at 50% 0%, rgba(76, 21, 139, 0.25) 0%, rgba(189, 0, 158, 0.15) 35%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
