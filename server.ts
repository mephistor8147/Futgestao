import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "football.db");
const db = new Database(dbPath);
const configPath = path.resolve(__dirname, "config.json");

function getConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return {
      admin_user: "admin",
      admin_pass: "admin",
      drive_sync_url: "",
      sync_interval_minutes: 30
    };
  }
}

async function syncFromDrive() {
  const config = getConfig();
  const url = config.drive_sync_url;
  if (!url) {
    console.log("[Sync] No Drive URL configured. Skipping sync.");
    return;
  }

  try {
    console.log("[Sync] Starting automatic sync from Drive...");
    // Extract File ID from Google Drive URL
    let fileId = "";
    const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
    if (match) {
      fileId = match[1];
    } else {
      throw new Error("Invalid Google Drive URL");
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error("Failed to download file from Google Drive.");
    }

    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    
    // Sync Players
    const playersSheet = workbook.Sheets['Jogadores'] || workbook.Sheets[workbook.SheetNames[0]];
    if (playersSheet) {
      const playersData = XLSX.utils.sheet_to_json(playersSheet) as any[];
      const insertPlayer = db.prepare("INSERT OR REPLACE INTO players (id, name, phone, whatsapp, role, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
      
      const syncPlayers = db.transaction((list) => {
        for (const p of list) {
          insertPlayer.run(
            p.id || null,
            p.nome || p.name || "Sem Nome",
            p.telefone || p.phone || "",
            p.whatsapp || "",
            p.cargo || p.role || "member",
            p.senha || p.password || "123456",
            p.status || "active"
          );
        }
      });
      syncPlayers(playersData);
    }

    // Sync Transactions
    const transSheet = workbook.Sheets['Transacoes'] || workbook.Sheets['Finanças'] || workbook.Sheets[workbook.SheetNames[1]];
    if (transSheet) {
      const transData = XLSX.utils.sheet_to_json(transSheet) as any[];
      const insertTrans = db.prepare("INSERT OR REPLACE INTO transactions (id, type, category, amount, date, description, player_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
      
      const syncTrans = db.transaction((list) => {
        for (const t of list) {
          insertTrans.run(
            t.id || null,
            t.tipo || t.type,
            t.categoria || t.category,
            t.valor || t.amount,
            t.data || t.date,
            t.descricao || t.description || "",
            t.jogador_id || t.player_id || null
          );
        }
      });
      syncTrans(transData);
    }
    console.log("[Sync] Automatic sync completed successfully.");
  } catch (error) {
    console.error("[Sync] Automatic sync failed:", (error as Error).message);
  }
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    photo TEXT,
    status TEXT DEFAULT 'active',
    role TEXT DEFAULT 'member',
    password TEXT
  );
`);

// Migration: Add columns if they don't exist
try {
  db.prepare("ALTER TABLE players ADD COLUMN whatsapp TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE players ADD COLUMN role TEXT DEFAULT 'member'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE players ADD COLUMN password TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE penalties ADD COLUMN days INTEGER DEFAULT 0").run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    player_id INTEGER,
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT -- payment, expense, update
  );

  CREATE TABLE IF NOT EXISTS penalties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    reason TEXT NOT NULL,
    days INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  -- Default settings
  INSERT OR IGNORE INTO settings (key, value) VALUES ('app_title', 'FutGestão');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('app_logo', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('db_type', 'sqlite');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('db_host', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('db_user', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('db_pass', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('db_name', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('pix_key', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'admin');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('treasurer_password', 'tesouro');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('member_password', 'membro');
`);

try {
  db.prepare("ALTER TABLE notifications ADD COLUMN image TEXT").run();
} catch (e) {}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' })); // Increased limit for photos

  const PORT = Number(process.env.PORT) || 3000;

  app.post("/api/admin/config", (req, res) => {
    try {
      const newConfig = req.body;
      const currentConfig = getConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/admin/config", (req, res) => {
    res.json(getConfig());
  });

  // Settings API
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all() as {key: string, value: string}[];
    const settingsObj = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        stmt.run(key, String(value));
      }
    });
    
    res.json({ success: true });
  });

  // Notifications API
  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications ORDER BY date DESC").all();
    res.json(notifications);
  });

  app.post("/api/notifications", (req, res) => {
    const { title, message, type, image } = req.body;
    const date = new Date().toISOString();
    const result = db.prepare("INSERT INTO notifications (title, message, date, type, image) VALUES (?, ?, ?, ?, ?)").run(title, message, date, type, image);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/notifications/:id", (req, res) => {
    const { id } = req.params;
    const { title, message, type, image } = req.body;
    db.prepare("UPDATE notifications SET title = ?, message = ?, type = ?, image = ? WHERE id = ?").run(title, message, type, image, id);
    res.json({ success: true });
  });

  app.delete("/api/notifications/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Login API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const config = getConfig();
    
    // Check Admin from config file
    if (username === config.admin_user && password === config.admin_pass) {
      return res.json({ success: true, role: 'admin' });
    }

    // Check Treasurer
    const treasurerPass = db.prepare("SELECT value FROM settings WHERE key = 'treasurer_password'").get() as any;
    if (username === 'tesoureiro' && password === (treasurerPass?.value || 'tesouro')) {
      return res.json({ success: true, role: 'treasurer' });
    }

    // Check Player
    const player = db.prepare("SELECT * FROM players WHERE name = ? AND password = ?").get(username, password) as any;
    if (player) {
      return res.json({ 
        success: true, 
        role: player.role || 'member', 
        playerId: player.id,
        playerName: player.name 
      });
    }

    res.status(401).json({ success: false, error: "Credenciais inválidas" });
  });

  app.post("/api/players/import", (req, res) => {
    try {
      const players = req.body;
      if (!Array.isArray(players)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of players." });
      }

      const insert = db.prepare("INSERT INTO players (name, phone, whatsapp, role, password, status) VALUES (?, ?, ?, ?, ?, ?)");
      const insertMany = db.transaction((playersList) => {
        for (const p of playersList) {
          insert.run(
            p.name || "Sem Nome",
            p.phone || "",
            p.whatsapp || "",
            p.role || "member",
            p.password || "123456",
            p.status || "active"
          );
        }
      });

      insertMany(players);
      res.json({ success: true, count: players.length });
    } catch (error) {
      console.error("[API] Error importing players:", error);
      res.status(500).json({ error: "Failed to import players: " + (error as Error).message });
    }
  });

  // API Routes
  app.get("/api/players", (req, res) => {
    const { playerId } = req.query;
    let players;
    if (playerId) {
      players = db.prepare("SELECT * FROM players WHERE id = ?").all(playerId);
    } else {
      players = db.prepare("SELECT * FROM players ORDER BY name ASC").all();
    }
    res.json(players);
  });

  app.post("/api/players", (req, res) => {
    try {
      const { name, phone, whatsapp, photo, role, password } = req.body;
      console.log(`[API] Registering player: ${name}`);
      const result = db.prepare("INSERT INTO players (name, phone, whatsapp, photo, role, password) VALUES (?, ?, ?, ?, ?, ?)").run(name, phone, whatsapp, photo, role || 'member', password || '123456');
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error("[API] Error registering player:", error);
      res.status(500).json({ error: "Failed to register player: " + (error as Error).message });
    }
  });

  app.delete("/api/players/:id", (req, res) => {
    db.prepare("DELETE FROM players WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/players/:id", (req, res) => {
    const { name, phone, whatsapp, photo, role, status, password, photoOnly } = req.body;
    if (photoOnly) {
      db.prepare("UPDATE players SET photo = ? WHERE id = ?").run(photo, req.params.id);
    } else {
      db.prepare("UPDATE players SET name = ?, phone = ?, whatsapp = ?, photo = ?, role = ?, status = ?, password = ? WHERE id = ?").run(name, phone, whatsapp, photo, role, status, password, req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/transactions", (req, res) => {
    const { playerId } = req.query;
    let transactions;
    if (playerId) {
      transactions = db.prepare(`
        SELECT t.*, p.name as player_name 
        FROM transactions t 
        LEFT JOIN players p ON t.player_id = p.id 
        WHERE t.player_id = ?
        ORDER BY date DESC
      `).all(playerId);
    } else {
      transactions = db.prepare(`
        SELECT t.*, p.name as player_name 
        FROM transactions t 
        LEFT JOIN players p ON t.player_id = p.id 
        ORDER BY date DESC
      `).all();
    }
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { type, category, amount, date, description, player_id } = req.body;
    const result = db.prepare(`
      INSERT INTO transactions (type, category, amount, date, description, player_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, category, amount, date, description, player_id || null);

    // Auto-generate notification for new expense
    if (type === 'expense') {
      const title = "Nova Despesa Registrada";
      const message = `Uma nova despesa de R$ ${amount} (${category}) foi adicionada: ${description}`;
      db.prepare("INSERT INTO notifications (title, message, date, type) VALUES (?, ?, ?, ?)").run(title, message, new Date().toISOString(), 'expense');
    }

    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/transactions/batch", (req, res) => {
    try {
      const transactions = req.body;
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of transactions." });
      }

      const insert = db.prepare(`
        INSERT INTO transactions (type, category, amount, date, description, player_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((list) => {
        for (const t of list) {
          insert.run(
            t.type,
            t.category,
            t.amount,
            t.date,
            t.description,
            t.player_id || null
          );
        }
      });

      insertMany(transactions);
      res.json({ success: true, count: transactions.length });
    } catch (error) {
      console.error("[API] Error batch inserting transactions:", error);
      res.status(500).json({ error: "Failed to insert transactions: " + (error as Error).message });
    }
  });

  app.get("/api/summary", (req, res) => {
    const income = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'income'").get() as any;
    const expense = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'").get() as any;
    res.json({
      totalIncome: income.total || 0,
      totalExpense: expense.total || 0,
      balance: (income.total || 0) - (expense.total || 0)
    });
  });

  // Backup API
  app.get("/api/admin/backup", (req, res) => {
    const dbPath = path.join(__dirname, "football.db");
    res.download(dbPath, `backup_futgestao_${new Date().toISOString().split('T')[0]}.db`);
  });

  // Penalties API
  app.get("/api/penalties", (req, res) => {
    const { playerId } = req.query;
    let penalties;
    if (playerId) {
      penalties = db.prepare(`
        SELECT p.*, pl.name as player_name 
        FROM penalties p 
        JOIN players pl ON p.player_id = pl.id 
        WHERE p.player_id = ? 
        ORDER BY date DESC
      `).all(playerId);
    } else {
      penalties = db.prepare(`
        SELECT p.*, pl.name as player_name 
        FROM penalties p 
        JOIN players pl ON p.player_id = pl.id 
        ORDER BY date DESC
      `).all();
    }
    res.json(penalties);
  });

  app.post("/api/admin/sync-drive", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      // Extract File ID from Google Drive URL
      let fileId = "";
      const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
      if (match) {
        fileId = match[1];
      } else {
        return res.status(400).json({ error: "Invalid Google Drive URL" });
      }

      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error("Failed to download file from Google Drive. Make sure it's shared with 'Anyone with the link'.");
      }

      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      
      // Sync Players
      const playersSheet = workbook.Sheets['Jogadores'] || workbook.Sheets[workbook.SheetNames[0]];
      if (playersSheet) {
        const playersData = XLSX.utils.sheet_to_json(playersSheet) as any[];
        const insertPlayer = db.prepare("INSERT OR REPLACE INTO players (id, name, phone, whatsapp, role, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        const syncPlayers = db.transaction((list) => {
          for (const p of list) {
            insertPlayer.run(
              p.id || null,
              p.nome || p.name || "Sem Nome",
              p.telefone || p.phone || "",
              p.whatsapp || "",
              p.cargo || p.role || "member",
              p.senha || p.password || "123456",
              p.status || "active"
            );
          }
        });
        syncPlayers(playersData);
      }

      // Sync Transactions
      const transSheet = workbook.Sheets['Transacoes'] || workbook.Sheets['Finanças'] || workbook.Sheets[workbook.SheetNames[1]];
      if (transSheet) {
        const transData = XLSX.utils.sheet_to_json(transSheet) as any[];
        const insertTrans = db.prepare("INSERT OR REPLACE INTO transactions (id, type, category, amount, date, description, player_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        const syncTrans = db.transaction((list) => {
          for (const t of list) {
            insertTrans.run(
              t.id || null,
              t.tipo || t.type,
              t.categoria || t.category,
              t.valor || t.amount,
              t.data || t.date,
              t.descricao || t.description || "",
              t.jogador_id || t.player_id || null
            );
          }
        });
        syncTrans(transData);
      }

      res.json({ success: true, message: "Sincronização concluída com sucesso!" });
    } catch (error) {
      console.error("[Sync] Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/penalties", (req, res) => {
    const { player_id, reason, days, date, status } = req.body;
    const result = db.prepare("INSERT INTO penalties (player_id, reason, days, date, status) VALUES (?, ?, ?, ?, ?)").run(player_id, reason, days, date, status || 'pending');
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/penalties/:id", (req, res) => {
    db.prepare("DELETE FROM penalties WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/penalties/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE penalties SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);
    
    // Check if dist exists
    if (!fs.existsSync(distPath)) {
      console.error(`[Production] ERROR: dist directory not found at ${distPath}`);
    } else {
      console.log(`[Production] dist directory found.`);
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        console.error(`[Production] ERROR: index.html not found at ${indexPath}`);
      } else {
        console.log(`[Production] index.html found.`);
      }
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Initial sync
    syncFromDrive();
    
    // Setup periodic sync
    const config = getConfig();
    const interval = (config.sync_interval_minutes || 30) * 60 * 1000;
    setInterval(syncFromDrive, interval);
  });
}

startServer();
