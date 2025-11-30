import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com Neon PostgreSQL - CICLONE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== ROTAS CADASTRO =====
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, chavepix, telefone, avatar } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO cadastro (nome, email, senha, chavepix, telefone, avatar) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, email, senha, chavepix, telefone, avatar]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/cadastro/:email', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cadastro WHERE email = $1', [req.params.email]);
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTA LOGIN CICLONE =====
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

// ===== ROTAS CLICKS =====
app.post('/api/clicks', async (req, res) => {
  const { email, clicks_hoje, saldo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clicks (email, clicks_hoje, saldo) VALUES ($1, $2, $3) RETURNING *`,
      [email, clicks_hoje, saldo]
    );
    res.json({ success: true, click: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/clicks/:email', async (req, res) => {
  const { total_clicks, clicks_hoje, saldo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clicks SET total_clicks = $1, clicks_hoje = $2, saldo = $3, data_ultimo_click = CURRENT_TIMESTAMP 
       WHERE email = $4 RETURNING *`,
      [total_clicks, clicks_hoje, saldo, req.params.email]
    );
    res.json({ success: true, click: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS ANÚNCIOS =====
app.get('/api/anuncios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anuncios WHERE ativo = true');
    res.json({ success: true, anuncios: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS VIEWS_ANUNCIOS =====
app.post('/api/views_anuncios', async (req, res) => {
  const { email, anuncio_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO views_anuncios (email, anuncio_id) VALUES ($1, $2) RETURNING *`,
      [email, anuncio_id]
    );
    res.json({ success: true, view: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS AVALIAÇÕES =====
app.post('/api/avaliacoes', async (req, res) => {
  const { email, anuncio_id, nota } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO avaliacoes (email, anuncio_id, nota) VALUES ($1, $2, $3) RETURNING *`,
      [email, anuncio_id, nota]
    );
    
    // Atualizar stats do produto
    await pool.query(`
      INSERT INTO produtos_stats (anuncio_id, total_avaliadores, media_avaliacao) 
      VALUES ($1, 1, $2)
      ON CONFLICT (anuncio_id) 
      DO UPDATE SET 
        total_avaliadores = produtos_stats.total_avaliadores + 1,
        media_avaliacao = (produtos_stats.media_avaliacao * produtos_stats.total_avaliadores + $2) / (produtos_stats.total_avaliadores + 1),
        ultima_atualizacao = CURRENT_TIMESTAMP
    `, [anuncio_id, nota]);
    
    res.json({ success: true, avaliacao: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTA SISTEMA DE CRÉDITOS CICLONE =====
app.get('/api/creditos/atual', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM cadastro 
      WHERE recebendo_creditos = true AND limite_atingido = false 
      ORDER BY id ASC LIMIT 1
    `);
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ CICLONE Backend rodando na porta ${PORT}`);
});




/*   const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CICLONE Backend running on port ${PORT}`);
});    */










