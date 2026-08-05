/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        'btn-color': 'var(--btn-color)',
        'icon-color': 'var(--icon-color)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        error: 'var(--error)',
        'card-bg': 'var(--card-bg)',
        'dashboard-bg': 'var(--dashboard-bg)',
        'table-bg': 'var(--table-bg)',
        'header-bg': 'var(--header-bg)',
        bg: {
          950: '#000000',
          900: '#1c1c1e',
          800: '#2c2c2e',
          700: '#3a3a3c',
          600: '#48484a',
          500: '#636366',
        },
      },
      borderRadius: {
        custom: 'var(--radius)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'Calibri Light', 'Calibri', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        borderBreatheUser: {
          '0%, 100%': { borderColor: 'rgba(6, 182, 212, 0.2)' },
          '50%': { borderColor: 'rgba(6, 182, 212, 1)' },
        },
        borderBreatheMetis: {
          '0%, 100%': { borderColor: 'rgba(58, 58, 60, 0.5)' },
          '50%': { borderColor: 'rgba(200, 200, 200, 1)' },
        }
      },
      animation: {
        'border-breathe-user': 'borderBreatheUser 3s ease-in-out infinite',
        'border-breathe-metis': 'borderBreatheMetis 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
