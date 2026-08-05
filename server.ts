import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Initial mock data provided by the user
let dbCapacidades = [
  {"id":1,"dataMovimentacao":"2026-07-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":150000,"capacidadeOutboundFechado":85000},
  {"id":2,"dataMovimentacao":"2026-06-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":3,"dataMovimentacao":"2026-06-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":4,"dataMovimentacao":"2026-06-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":5,"dataMovimentacao":"2026-06-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":6,"dataMovimentacao":"2026-06-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":7,"dataMovimentacao":"2026-06-06","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":8,"dataMovimentacao":"2026-06-07","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
  {"id":9,"dataMovimentacao":"2026-07-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
  {"id":10,"dataMovimentacao":"2026-07-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
  {"id":11,"dataMovimentacao":"2026-07-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
  {"id":12,"dataMovimentacao":"2026-07-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
  {"id":13,"dataMovimentacao":"2026-07-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
  {"id":14,"dataMovimentacao":"2026-08-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
  {"id":15,"dataMovimentacao":"2026-08-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
  {"id":16,"dataMovimentacao":"2026-08-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":17,"dataMovimentacao":"2026-08-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":18,"dataMovimentacao":"2026-08-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":19,"dataMovimentacao":"2026-08-06","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":20,"dataMovimentacao":"2026-08-07","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":21,"dataMovimentacao":"2026-08-08","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
  {"id":22,"dataMovimentacao":"2026-08-09","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
  {"id":23,"dataMovimentacao":"2026-08-10","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":24,"dataMovimentacao":"2026-08-11","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":25,"dataMovimentacao":"2026-08-12","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":26,"dataMovimentacao":"2026-08-13","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":27,"dataMovimentacao":"2026-08-14","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":28,"dataMovimentacao":"2026-08-15","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
  {"id":29,"dataMovimentacao":"2026-08-16","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
  {"id":30,"dataMovimentacao":"2026-08-17","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":31,"dataMovimentacao":"2026-08-18","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":32,"dataMovimentacao":"2026-08-19","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":33,"dataMovimentacao":"2026-08-20","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":34,"dataMovimentacao":"2026-08-21","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":35,"dataMovimentacao":"2026-08-22","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
  {"id":36,"dataMovimentacao":"2026-08-23","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
  {"id":37,"dataMovimentacao":"2026-08-24","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":38,"dataMovimentacao":"2026-08-25","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":39,"dataMovimentacao":"2026-08-26","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":40,"dataMovimentacao":"2026-08-27","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":41,"dataMovimentacao":"2026-08-28","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
  {"id":42,"dataMovimentacao":"2026-08-29","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
  {"id":43,"dataMovimentacao":"2026-08-30","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
  {"id":44,"dataMovimentacao":"2026-08-31","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000}
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get Capacities (with backend proxy and fast-fail fallback)
  app.get("/api/capacidades", async (req, res) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    try {
      // Attempt proxy request to user's real backend
      const response = await fetch("http://10.210.1.242:8080/api/capacidades", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const externalData = await response.json();
        console.log("Successfully fetched capacity data from real API at 10.210.1.242");
        // Sync internal DB with external values for interactive editing in this session
        if (Array.isArray(externalData)) {
          dbCapacidades = externalData;
        }
        return res.json(dbCapacidades);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Fail silently and use the fallback mock database
      console.log("Failed to connect to 10.210.1.242:8080. Using the persistent mock-database fallback.");
    }

    // Always return local DB on fallback
    return res.json(dbCapacidades);
  });

  // API Route: Update Capacity
  app.put("/api/capacidades/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { capacidadeInbound, capacidadeOutboundFracionado, capacidadeOutboundFechado } = req.body;

    const index = dbCapacidades.findIndex(item => item.id === id);
    if (index !== -1) {
      if (capacidadeInbound !== undefined) {
        dbCapacidades[index].capacidadeInbound = capacidadeInbound;
      }
      if (capacidadeOutboundFracionado !== undefined) {
        dbCapacidades[index].capacidadeOutboundFracionado = capacidadeOutboundFracionado;
      }
      if (capacidadeOutboundFechado !== undefined) {
        dbCapacidades[index].capacidadeOutboundFechado = capacidadeOutboundFechado;
      }

      // Optionally, attempt to forward to the user's real API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        await fetch(`http://10.210.1.242:8080/api/capacidades/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dbCapacidades[index]),
          signal: controller.signal,
        }).catch(() => {});
        clearTimeout(timeoutId);
      } catch (e) {}

      return res.json({ success: true, updated: dbCapacidades[index] });
    }

    return res.status(404).json({ success: false, error: "Registro não encontrado" });
  });

  // API Route: Bulk update by year, month, cd, category (Monthly Outbound)
  app.put("/api/capacidades", async (req, res) => {
    const { ano, mes, cd, categoria, capacidadefracionada, capacidadefechada, capacidadeFracionada, capacidadeFechada } = req.body;

    const valFrac = capacidadefracionada !== undefined ? capacidadefracionada : capacidadeFracionada;
    const valFech = capacidadefechada !== undefined ? capacidadefechada : capacidadeFechada;

    if (ano === undefined || mes === undefined || cd === undefined || !categoria) {
      return res.status(400).json({ success: false, error: "Parâmetros obrigatórios ausentes: ano, mes, cd, categoria" });
    }

    let updatedCount = 0;
    dbCapacidades.forEach((item) => {
      const parts = item.dataMovimentacao.split("-");
      const itemYear = parseInt(parts[0], 10);
      const itemMonth = parseInt(parts[1], 10);
      const itemCd = item.cd;
      const itemCat = item.categoria;

      if (itemYear === Number(ano) && itemMonth === Number(mes) && itemCd === Number(cd) && itemCat === categoria) {
        if (valFrac !== undefined) {
          item.capacidadeOutboundFracionado = valFrac;
        }
        if (valFech !== undefined) {
          item.capacidadeOutboundFechado = valFech;
        }
        updatedCount++;
      }
    });

    // Forward to user's real backend API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const response = await fetch("http://10.210.1.242:8080/api/capacidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`Forwarded monthly capacity PUT update to real API. Status: ${response.status}`);
    } catch (e) {
      console.log("Failed to forward monthly capacity PUT update to real API.");
    }

    return res.json({ success: true, updatedCount });
  });

  // API Route: Bulk POST update fallback
  app.post("/api/capacidades", async (req, res) => {
    if (req.body && req.body.ano !== undefined) {
      const { ano, mes, cd, categoria, capacidadefracionada, capacidadefechada, capacidadeFracionada, capacidadeFechada } = req.body;
      const valFrac = capacidadefracionada !== undefined ? capacidadefracionada : capacidadeFracionada;
      const valFech = capacidadefechada !== undefined ? capacidadefechada : capacidadeFechada;

      let updatedCount = 0;
      dbCapacidades.forEach((item) => {
        const parts = item.dataMovimentacao.split("-");
        const itemYear = parseInt(parts[0], 10);
        const itemMonth = parseInt(parts[1], 10);
        const itemCd = item.cd;
        const itemCat = item.categoria;

        if (itemYear === Number(ano) && itemMonth === Number(mes) && itemCd === Number(cd) && itemCat === categoria) {
          if (valFrac !== undefined) {
            item.capacidadeOutboundFracionado = valFrac;
          }
          if (valFech !== undefined) {
            item.capacidadeOutboundFechado = valFech;
          }
          updatedCount++;
        }
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const response = await fetch("http://10.210.1.242:8080/api/capacidades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log(`Forwarded monthly capacity POST update to real API. Status: ${response.status}`);
      } catch (e) {}

      return res.json({ success: true, updatedCount });
    }

    return res.status(400).json({ success: false, error: "Formato inválido" });
  });

  // Reset API route to restore default values
  app.post("/api/reset", (req, res) => {
    dbCapacidades = [
      {"id":1,"dataMovimentacao":"2026-07-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":150000,"capacidadeOutboundFechado":85000},
      {"id":2,"dataMovimentacao":"2026-06-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":3,"dataMovimentacao":"2026-06-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":4,"dataMovimentacao":"2026-06-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":5,"dataMovimentacao":"2026-06-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":6,"dataMovimentacao":"2026-06-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":7,"dataMovimentacao":"2026-06-06","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":8,"dataMovimentacao":"2026-06-07","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":155000,"capacidadeOutboundFechado":null},
      {"id":9,"dataMovimentacao":"2026-07-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
      {"id":10,"dataMovimentacao":"2026-07-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
      {"id":11,"dataMovimentacao":"2026-07-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
      {"id":12,"dataMovimentacao":"2026-07-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
      {"id":13,"dataMovimentacao":"2026-07-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":170000,"capacidadeOutboundFechado":95000},
      {"id":14,"dataMovimentacao":"2026-08-01","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
      {"id":15,"dataMovimentacao":"2026-08-02","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
      {"id":16,"dataMovimentacao":"2026-08-03","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":17,"dataMovimentacao":"2026-08-04","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":18,"dataMovimentacao":"2026-08-05","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":19,"dataMovimentacao":"2026-08-06","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":20,"dataMovimentacao":"2026-08-07","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":21,"dataMovimentacao":"2026-08-08","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
      {"id":22,"dataMovimentacao":"2026-08-09","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
      {"id":23,"dataMovimentacao":"2026-08-10","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":24,"dataMovimentacao":"2026-08-11","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":25,"dataMovimentacao":"2026-08-12","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":26,"dataMovimentacao":"2026-08-13","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":27,"dataMovimentacao":"2026-08-14","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":28,"dataMovimentacao":"2026-08-15","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
      {"id":29,"dataMovimentacao":"2026-08-16","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
      {"id":30,"dataMovimentacao":"2026-08-17","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":31,"dataMovimentacao":"2026-08-18","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":32,"dataMovimentacao":"2026-08-19","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":33,"dataMovimentacao":"2026-08-20","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":34,"dataMovimentacao":"2026-08-21","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":35,"dataMovimentacao":"2026-08-22","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
      {"id":36,"dataMovimentacao":"2026-08-23","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
      {"id":37,"dataMovimentacao":"2026-08-24","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":38,"dataMovimentacao":"2026-08-25","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":39,"dataMovimentacao":"2026-08-26","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":40,"dataMovimentacao":"2026-08-27","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":41,"dataMovimentacao":"2026-08-28","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000},
      {"id":42,"dataMovimentacao":"2026-08-29","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":114000,"capacidadeOutboundFechado":30000},
      {"id":43,"dataMovimentacao":"2026-08-30","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":0,"capacidadeOutboundFechado":0},
      {"id":44,"dataMovimentacao":"2026-08-31","cd":1965,"categoria":"Mercearia","capacidadeInbound":null,"capacidadeOutboundFracionado":190000,"capacidadeOutboundFechado":50000}
    ];
    return res.json({ success: true, message: "Banco redefinido para o padrão." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
