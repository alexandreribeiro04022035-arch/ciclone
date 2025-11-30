import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ---- CONFIGURAÇÃO DO BANCO ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Testar conexão
pool.connect()
  .then(() => console.log("🟢 Conectado ao PostgreSQL (Neon)!"))
  .catch(err => console.error("🔴 Erro ao conectar no BD:", err));

// ---- ROTAS ----
app.get("/", (req, res) => {
  res.json({ message: "CICLONE API rodando!" });
});

// Exemplo de rota que consulta usuários
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: "Erro ao consultar usuários" });
  }
});

// Exemplo rota adicionar user
app.post("/users", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (email, senha) VALUES ($1, $2) RETURNING *",
      [email, senha]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

// ---- PORTA DINÂMICA (Render) ----
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
