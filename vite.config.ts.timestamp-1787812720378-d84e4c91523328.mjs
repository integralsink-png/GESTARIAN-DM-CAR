// vite.config.ts
import { defineConfig } from "file:///C:/Users/Administrador/Desktop/JUANI/VS%20CODE/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Administrador/Desktop/JUANI/VS%20CODE/node_modules/@vitejs/plugin-react/dist/index.js";
import basicSsl from "file:///C:/Users/Administrador/Desktop/JUANI/VS%20CODE/node_modules/@vitejs/plugin-basic-ssl/dist/index.mjs";
var vite_config_default = defineConfig(({ mode }) => {
  const mobileHttps = mode === "mobile";
  const port = mobileHttps ? 5174 : 5173;
  return {
    plugins: [
      react(),
      ...mobileHttps ? [basicSsl()] : []
    ],
    server: {
      host: true,
      port,
      strictPort: false,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    },
    preview: {
      host: true,
      port,
      strictPort: true,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: ["lucide-react", "framer-motion"],
            db: ["@supabase/supabase-js"],
            utils: ["jspdf", "html2canvas"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhZG9yXFxcXERlc2t0b3BcXFxcSlVBTklcXFxcVlMgQ09ERVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWRtaW5pc3RyYWRvclxcXFxEZXNrdG9wXFxcXEpVQU5JXFxcXFZTIENPREVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FkbWluaXN0cmFkb3IvRGVza3RvcC9KVUFOSS9WUyUyMENPREUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IGJhc2ljU3NsIGZyb20gJ0B2aXRlanMvcGx1Z2luLWJhc2ljLXNzbCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAvLyAnbnBtIHJ1biBkZXYnICAgICAgICAgIC0+IGh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyAoZXNjcml0b3JpbywgaWd1YWwgcXVlIHNpZW1wcmUpXG4gIC8vICducG0gcnVuIGRldjptb2JpbGUnICAgLT4gaHR0cHM6Ly8xOTIuMTY4LngueDo1MTc0IChIVFRQUyBhdXRvZmlybWFkbyBwYXJhIGVsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1cdTAwRjN2aWw6IHNvbG8gYXNcdTAwRUQgZWwgbmF2ZWdhZG9yIHBlcm1pdGUgZWwgbWljclx1MDBGM2Zvbm8pXG4gIGNvbnN0IG1vYmlsZUh0dHBzID0gbW9kZSA9PT0gJ21vYmlsZSdcbiAgY29uc3QgcG9ydCA9IG1vYmlsZUh0dHBzID8gNTE3NCA6IDUxNzNcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgLi4uKG1vYmlsZUh0dHBzID8gW2Jhc2ljU3NsKCldIDogW10pLFxuICAgIF0sXG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgcG9ydCxcbiAgICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZScsXG4gICAgICAgICdQcmFnbWEnOiAnbm8tY2FjaGUnLFxuICAgICAgICAnRXhwaXJlcyc6ICcwJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBwcmV2aWV3OiB7XG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgcG9ydCxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDYWNoZS1Db250cm9sJzogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJyxcbiAgICAgICAgJ1ByYWdtYSc6ICduby1jYWNoZScsXG4gICAgICAgICdFeHBpcmVzJzogJzAnLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICB1aTogWydsdWNpZGUtcmVhY3QnLCAnZnJhbWVyLW1vdGlvbiddLFxuICAgICAgICAgICAgZGI6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgICB1dGlsczogWydqc3BkZicsICdodG1sMmNhbnZhcyddXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFvVSxTQUFTLG9CQUFvQjtBQUNqVyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxjQUFjO0FBRXJCLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBSXhDLFFBQU0sY0FBYyxTQUFTO0FBQzdCLFFBQU0sT0FBTyxjQUFjLE9BQU87QUFDbEMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sR0FBSSxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztBQUFBLElBQ3BDO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTjtBQUFBLE1BQ0EsWUFBWTtBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1AsaUJBQWlCO0FBQUEsUUFDakIsVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLE1BQ2I7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTjtBQUFBLE1BQ0EsWUFBWTtBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1AsaUJBQWlCO0FBQUEsUUFDakIsVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLE1BQ2I7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCx1QkFBdUI7QUFBQSxNQUN2QixlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsVUFDTixjQUFjO0FBQUEsWUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ2pELElBQUksQ0FBQyxnQkFBZ0IsZUFBZTtBQUFBLFlBQ3BDLElBQUksQ0FBQyx1QkFBdUI7QUFBQSxZQUM1QixPQUFPLENBQUMsU0FBUyxhQUFhO0FBQUEsVUFDaEM7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
