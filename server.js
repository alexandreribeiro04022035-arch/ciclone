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
// ⚡ CONFIGURAÇÕES EXPRESS - ARQUIVOS NA RAIZ
// =============================
app.use(cors());
app.use(express.json());

// MUDOU AQUI: Agora serve arquivos estáticos da RAIZ
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  // MUDOU AQUI: index.html agora está na raiz
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================
// 🔌 CONEXÃO COM BANCO (MANTIDO IGUAL)
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============================
// 🔐 ROTA LOGIN COMPLETA (MANTIDO IGUAL)
// =============================
app.post('/api/login-completo', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const result = await pool.query(
      'SELECT * FROM cadastro WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];
    
    let clicks = { total_clicks: 0, clicks_hoje: 0, data_ultimo_click: null };
    try {
      const clicksResult = await pool.query(
        'SELECT * FROM clicks WHERE email = $1',
        [user.email]
      );
      if (clicksResult.rows.length > 0) {
        clicks = clicksResult.rows[0];
      }
    } catch (clickError) {
      console.log('Tabela clicks não encontrada ou erro:', clickError.message);
    }

    const userData = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      senha: user.senha,
      chavepix: user.chavepix,
      telefone: user.telefone,
      avatar: user.avatar,
      recebendo_creditos: user.recebendo_creditos,
      limite_atingido: user.limite_atingido,
      saldo_redisponivel: user.saldo_redisponivel,
      data_criacao: user.data_criacao,
      clicks: clicks
    };

    res.json({ success: true, user: userData });

  } catch (error) {
    console.error('Erro no login:', error);
    res.json({ success: false, error: 'Erro interno do servidor' });
  }
});

// =============================
// 📌 ROTA CADASTRO (MANTIDO IGUAL)
// =============================
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, chavepix, telefone, avatar } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO cadastro 
       (nome, email, senha, chavepix, telefone, avatar, recebendo_creditos) 
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [nome, email, senha, chavepix, telefone, avatar]
    );

    res.json({ success: true, user: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📊 ROTA DASHBOARD (MANTIDO IGUAL)
// =============================
app.get('/api/dashboard/:user_id', async (req, res) => {
  const userId = req.params.user_id;

  try {
    const userResult = await pool.query(
      'SELECT * FROM cadastro WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    const clicksResult = await pool.query(
      'SELECT * FROM clicks WHERE email = $1',
      [user.email]
    );

    const clicks = clicksResult.rows[0] || {
      total_clicks: 0,
      clicks_hoje: 0,
      data_ultimo_click: null
    };

    res.json({
      success: true,
      user: user,
      clicks: clicks
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 ROTA CLICKS (MANTIDO IGUAL)
// =============================
app.post('/api/clicks', async (req, res) => {
  const { email, clicks_hoje } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM clicks WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE clicks 
         SET total_clicks = total_clicks + 1,
             clicks_hoje = $1,
             data_ultimo_click = CURRENT_TIMESTAMP
         WHERE email = $2
         RETURNING *`,
        [clicks_hoje, email]
      );
      res.json({ success: true, clicks: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO clicks 
         (email, total_clicks, clicks_hoje, data_ultimo_click)
         VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [email, clicks_hoje]
      );
      res.json({ success: true, clicks: result.rows[0] });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📦 ROTAS ANÚNCIOS (MANTIDO IGUAL)
// =============================
app.get('/api/anuncios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anuncios WHERE ativo = true');
    res.json({ success: true, anuncios: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/anuncios/:id', async (req, res) => {
  const anuncioId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM anuncios WHERE id = $1 AND ativo = true', [anuncioId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Anúncio não encontrado' });
    }

    res.json({ success: true, anuncio: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 ROTA HEALTH CHECK (MANTIDO IGUAL)
// =============================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'CICLONE API online e conectada ao banco' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 SISTEMA DE CLICKS - CADA UM RECEBE PELO PRÓPRIO CLICK (SEM LIMITE)
// =============================
app.post('/api/registrar-click', async (req, res) => {
  const { email, anuncio_id } = req.body;

  try {
    // 1. BUSCA O USUÁRIO QUE CLICOU
    const usuarioResult = await pool.query(
      `SELECT * FROM cadastro WHERE email = $1`,
      [email]
    );

    if (usuarioResult.rows.length === 0) {
      return res.json({ success: false, error: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    // 2. VERIFICA SE ESTÁ RECEBENDO CRÉDITOS
    if (!usuario.recebendo_creditos) {
      return res.json({ 
        success: false, 
        error: 'Você não está recebendo créditos'
      });
    }

    // 3. ATUALIZA CLICKS DO USUÁRIO
    const existing = await pool.query('SELECT * FROM clicks WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE clicks SET 
         total_clicks = total_clicks + 1, 
         clicks_hoje = clicks_hoje + 1, 
         data_ultimo_click = CURRENT_TIMESTAMP 
         WHERE email = $1`,
        [email]
      );
    } else {
      await pool.query(
        `INSERT INTO clicks (email, total_clicks, clicks_hoje, data_ultimo_click) 
         VALUES ($1, 1, 1, CURRENT_TIMESTAMP)`,
        [email]
      );
    }

    // 4. ADICIONA CRÉDITO DIRETO PARA O PRÓPRIO USUÁRIO (SEM LIMITE)
    const novoSaldo = parseFloat(usuario.saldo_redisponivel) + 0.0001;
    
    await pool.query(
      'UPDATE cadastro SET saldo_redisponivel = $1 WHERE id = $2',
      [novoSaldo, usuario.id]
    );

    res.json({ 
      success: true, 
      message: '✅ Click registrado! +R$ 0,0001 creditados na sua conta',
      usuario: usuario.email,
      novo_saldo: novoSaldo
    });

  } catch (error) {
    console.error('Erro no registrar-click:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📊 ROTA ESTATÍSTICAS SIMPLIFICADA (SEM PRODUTOS)
// =============================
app.get('/api/estatisticas', async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM cadastro');
    const clicks = await pool.query('SELECT COALESCE(SUM(total_clicks), 0) as total FROM clicks');
    const anuncios = await pool.query('SELECT COUNT(*) as total FROM anuncios');
    
    const maiorSaldo = await pool.query(
      'SELECT nome, saldo_redisponivel as saldo FROM cadastro ORDER BY saldo_redisponivel DESC LIMIT 1'
    );
    
    const maisClicks = await pool.query(`
      SELECT cad.nome, c.total_clicks 
      FROM clicks c 
      JOIN cadastro cad ON c.email = cad.email 
      ORDER BY c.total_clicks DESC LIMIT 1
    `);

    res.json({
      success: true,
      total_usuarios: parseInt(usuarios.rows[0].total),
      total_clicks: parseInt(clicks.rows[0].total),
      total_anuncios: parseInt(anuncios.rows[0].total),
      maior_saldo: maiorSaldo.rows[0] || { nome: null, saldo: 0 },
      mais_clicks: maisClicks.rows[0] || { nome: null, total_clicks: 0 }
    });
    
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message
    });
  }
});

// =============================
// 🔄 ROTA PARA ATIVAR/RECEBER CRÉDITOS (OPCIONAL)
// =============================
app.post('/api/ativar-creditos', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE cadastro SET recebendo_creditos = true 
       WHERE email = $1 RETURNING *`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Usuário não encontrado' });
    }

    res.json({ 
      success: true, 
      usuario: result.rows[0],
      message: '✅ Agora você está recebendo créditos pelos seus cliques!'
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
  console.log(`✅ CICLONE PTC rodando na porta ${PORT}`);
  console.log(`✅ Sistema PTC básico - Apenas visualização de anúncios`);
  console.log(`✅ Arquivos servidos da RAIZ do projeto`);
});
