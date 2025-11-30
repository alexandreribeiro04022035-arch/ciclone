import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// =============================
// ⚡ CONFIGURAÇÕES EXPRESS
// =============================
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// =============================
// 🔌 CONEXÃO COM NEON POSTGRESQL
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============================
// 📌 ROTA DE CADASTRO
// =============================
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, chavepix, telefone, avatar } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO cadastro 
       (nome, email, senha, chavepix, telefone, avatar, recebendo_creditos, limite_atingido, saldo_redisponivel, data_criacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
       RETURNING *`,
      [nome, email, senha, chavepix || null, telefone || null, avatar || null, false, false, 0.00]
    );

    res.json({ success: true, user: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🔐 ROTA DE LOGIN (básico)
// =============================
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM cadastro WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        saldo: user.saldo_redisponivel || 0
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🚀 INICIAR SERVIDOR
// =============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ CICLONE rodando na porta ${PORT}`);
});
