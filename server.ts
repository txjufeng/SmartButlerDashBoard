import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodeFetch from "node-fetch";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Add basic logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Proxy route for hardware (Lights)
  app.get("/api/hardware/switch/:state", async (req, res) => {
    const { state } = req.params;
    const targetUrl = `http://112.80.221.107:58089/switch/${state}`;
    
    console.log(`[Hardware Proxy: Lights] Received request for state: ${state}`);
    console.log(`[Hardware Proxy: Lights] Forwarding to: ${targetUrl}`);
    
    try {
      const response = await nodeFetch(targetUrl, { 
        method: 'GET',
        timeout: 5000 
      });

      console.log(`[Hardware Proxy: Lights] Hardware responded with status: ${response.status}`);

      if (response.ok) {
        const data = await response.text();
        res.json({ success: true, data });
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ success: false, error: 'Hardware responded with error', detail: errorText });
      }
    } catch (error: any) {
      console.error(`[Hardware Proxy: Lights] Fetch failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Proxy route for hardware (Curtains)
  app.get("/api/hardware/curtain/:state", async (req, res) => {
    const { state } = req.params;
    // state should be 'open' or 'close'
    const targetUrl = `http://112.80.221.107:58089/curtain/${state}`;
    
    console.log(`[Hardware Proxy: Curtains] Received request for state: ${state}`);
    console.log(`[Hardware Proxy: Curtains] Forwarding to: ${targetUrl}`);
    
    try {
      const response = await nodeFetch(targetUrl, { 
        method: 'GET',
        timeout: 5000 
      });

      console.log(`[Hardware Proxy: Curtains] Hardware responded with status: ${response.status}`);

      if (response.ok) {
        const data = await response.text();
        res.json({ success: true, data });
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ success: false, error: 'Hardware responded with error', detail: errorText });
      }
    } catch (error: any) {
      console.error(`[Hardware Proxy: Curtains] Fetch failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
