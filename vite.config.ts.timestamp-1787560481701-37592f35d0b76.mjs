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
      strictPort: true,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pbmlzdHJhZG9yXFxcXERlc2t0b3BcXFxcSlVBTklcXFxcVlMgQ09ERVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWRtaW5pc3RyYWRvclxcXFxEZXNrdG9wXFxcXEpVQU5JXFxcXFZTIENPREVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FkbWluaXN0cmFkb3IvRGVza3RvcC9KVUFOSS9WUyUyMENPREUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IGJhc2ljU3NsIGZyb20gJ0B2aXRlanMvcGx1Z2luLWJhc2ljLXNzbCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAvLyAnbnBtIHJ1biBkZXYnICAgICAgICAgIC0+IGh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyAoZXNjcml0b3JpbywgaWd1YWwgcXVlIHNpZW1wcmUpXG4gIC8vICducG0gcnVuIGRldjptb2JpbGUnICAgLT4gaHR0cHM6Ly8xOTIuMTY4LngueDo1MTc0IChIVFRQUyBhdXRvZmlybWFkbyBwYXJhIGVsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1cdTAwRjN2aWw6IHNvbG8gYXNcdTAwRUQgZWwgbmF2ZWdhZG9yIHBlcm1pdGUgZWwgbWljclx1MDBGM2Zvbm8pXG4gIGNvbnN0IG1vYmlsZUh0dHBzID0gbW9kZSA9PT0gJ21vYmlsZSdcbiAgY29uc3QgcG9ydCA9IG1vYmlsZUh0dHBzID8gNTE3NCA6IDUxNzNcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgLi4uKG1vYmlsZUh0dHBzID8gW2Jhc2ljU3NsKCldIDogW10pLFxuICAgIF0sXG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiB0cnVlLFxuICAgICAgcG9ydCxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDYWNoZS1Db250cm9sJzogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJyxcbiAgICAgICAgJ1ByYWdtYSc6ICduby1jYWNoZScsXG4gICAgICAgICdFeHBpcmVzJzogJzAnLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHByZXZpZXc6IHtcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBwb3J0LFxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnLFxuICAgICAgICAnUHJhZ21hJzogJ25vLWNhY2hlJyxcbiAgICAgICAgJ0V4cGlyZXMnOiAnMCcsXG4gICAgICB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTUwMCxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAgIHVpOiBbJ2x1Y2lkZS1yZWFjdCcsICdmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgICBkYjogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgICAgIHV0aWxzOiBbJ2pzcGRmJywgJ2h0bWwyY2FudmFzJ11cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9VLFNBQVMsb0JBQW9CO0FBQ2pXLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFFckIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFJeEMsUUFBTSxjQUFjLFNBQVM7QUFDN0IsUUFBTSxPQUFPLGNBQWMsT0FBTztBQUNsQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixHQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQUEsSUFDcEM7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQSxZQUFZO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxpQkFBaUI7QUFBQSxRQUNqQixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQSxZQUFZO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxpQkFBaUI7QUFBQSxRQUNqQixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLHVCQUF1QjtBQUFBLE1BQ3ZCLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLFFBQVEsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsWUFDakQsSUFBSSxDQUFDLGdCQUFnQixlQUFlO0FBQUEsWUFDcEMsSUFBSSxDQUFDLHVCQUF1QjtBQUFBLFlBQzVCLE9BQU8sQ0FBQyxTQUFTLGFBQWE7QUFBQSxVQUNoQztBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
