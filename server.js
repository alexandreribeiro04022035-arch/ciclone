import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----------------------------
// Configurações do Express
// ----------------------------
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------
// Conexão Neon PostgreSQL
// ----------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Teste de conexão ao BD
pool.connect()
  .then(() => console.log("🟢 Conectado ao Neon PostgreSQL"))
  .catch(err => console.error("🔴 Erro ao conectar no Neon:", err));

// ----------------------------
// ROTAS DE ARQUIVOS HTML
// ----------------------------
// Rota raiz -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Se você quiser rotas explícitas para os frames
app.get("/header-neobux.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/header-neobux.html"));
});

app.get("/body.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/body.html"));
});

app.get("/footer-black.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/footer-black.html"));
});

// ----------------------------
// ROTAS API EXEMPLO
// ----------------------------
app.get("/api/test", (req, res) => {
  res.json({ message: "API CICLONE funcionando!" });
});

// Aqui você pode adicionar suas rotas reais do cadastro, login, clicks, etc.
// Exemplo:
// app.post("/api/cadastro", async (req, res) => { ... });
// rota do cadastro neon 
app.post("/api/cadastro", async (req, res) => {
    const { nome, email, senha, chavepix, telefone, avatar } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO cadastro (nome, email, senha, chavepix, telefone, avatar)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nome, email, senha, chavepix, telefone, avatar]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});










// ----------------------------
// INICIAR SERVIDOR
// ----------------------------
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor CICLONE rodando na porta ${PORT}`);
});
