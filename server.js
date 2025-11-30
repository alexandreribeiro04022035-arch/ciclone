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
// 🔐 ROTA DE LOGIN COMPLETA (para login-top.html)
// =============================
app.post('/api/login-completo', async (req, res) => {
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
    
    // Busca dados de clicks do usuário
    const clicksResult = await pool.query(
      'SELECT * FROM clicks WHERE user_id = $1',
      [user.id]
    );

    const clicks = clicksResult.rows[0] || {
      total_clicks: 0,
      clicks_hoje: 0,
      last_click: null
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        chavepix: user.chavepix,
        saldo_redisponivel: parseFloat(user.saldo_redisponivel) || 0,
        saldo_retirada: parseFloat(user.saldo_retirada) || 0,
        clicks: clicks
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📊 ROTA DASHBOARD (para dashboard.html)
// =============================
app.get('/api/dashboard/:user_id', async (req, res) => {
  const userId = req.params.user_id;

  try {
    // Busca dados do cadastro
    const userResult = await pool.query(
      'SELECT * FROM cadastro WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Busca dados de clicks
    const clicksResult = await pool.query(
      'SELECT * FROM clicks WHERE user_id = $1',
      [userId]
    );

    const clicks = clicksResult.rows[0] || {
      total_clicks: 0,
      clicks_hoje: 0,
      last_click: null
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        chavepix: user.chavepix,
        telefone: user.telefone,
        saldo_redisponivel: parseFloat(user.saldo_redisponivel) || 0,
        saldo_retirada: parseFloat(user.saldo_retirada) || 0,
        data_criacao: user.data_criacao
      },
      clicks: clicks
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 ROTA PARA ATUALIZAR CLICKS
// =============================
app.post('/api/clicks', async (req, res) => {
  const { user_id, clicks_hoje } = req.body;

  try {
    // Verifica se já existe registro de clicks para o usuário
    const existing = await pool.query(
      'SELECT * FROM clicks WHERE user_id = $1',
      [user_id]
    );

    if (existing.rows.length > 0) {
      // Atualiza clicks existentes
      const result = await pool.query(
        `UPDATE clicks 
         SET total_clicks = total_clicks + 1,
             clicks_hoje = $1,
             last_click = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING *`,
        [clicks_hoje, user_id]
      );
      res.json({ success: true, clicks: result.rows[0] });
    } else {
      // Cria novo registro de clicks
      const result = await pool.query(
        `INSERT INTO clicks 
         (user_id, total_clicks, clicks_hoje, last_click)
         VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [user_id, clicks_hoje]
      );
      res.json({ success: true, clicks: result.rows[0] });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📱 SERVIR ARQUIVOS DO FRONTEND
// =============================
app.get('/login-top.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login-top.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/viewads-top.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/viewads-top.html'));
});

// Rota para buscar usuário por email
app.get('/api/cadastro/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const result = await pool.query(
      'SELECT * FROM cadastro WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    res.json({ success: true, user: result.rows[0] });

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
