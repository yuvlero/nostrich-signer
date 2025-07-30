import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Proxy endpoint for publishing events to auth.nostrich.pro
  app.post("/api/publish-event", async (req, res) => {
    try {
      console.log('Proxying publish event request:', req.body);
      
      const response = await fetch('https://auth.nostrich.pro/api/publish-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      
      console.log('Auth server response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Auth server error:', errorText);
        return res.status(response.status).json({ 
          error: `Server responded with ${response.status}: ${errorText}` 
        });
      }
      
      const responseData = await response.text();
      console.log('Auth server success response:', responseData);
      
      res.status(200).json({ success: true, response: responseData });
      
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown proxy error' 
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
