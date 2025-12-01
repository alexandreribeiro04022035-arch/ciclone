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
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// =============================
// 🔌 CONEXÃO COM BANCO
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============================
// 🔐 ROTA LOGIN COMPLETA (CORRETA)
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
    
    // CORREÇÃO: Busca dados de clicks pelo EMAIL (não user_id)
    let clicks = { total_clicks: 0, clicks_hoje: 0, data_ultimo_click: null };
    try {
      const clicksResult = await pool.query(
        'SELECT * FROM clicks WHERE email = $1',
        [user.email]  // CORREÇÃO: busca por email
      );
      if (clicksResult.rows.length > 0) {
        clicks = clicksResult.rows[0];
      }
    } catch (clickError) {
      console.log('Tabela clicks não encontrada ou erro:', clickError.message);
    }

    // CORREÇÃO: Manda o usuário INTEIRO igual você quer
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
// 📌 ROTA CADASTRO
// =============================
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha, chavepix, telefone, avatar } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO cadastro 
       (nome, email, senha, chavepix, telefone, avatar) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [nome, email, senha, chavepix, telefone, avatar]
    );

    res.json({ success: true, user: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📊 ROTA DASHBOARD (CORRIGIDA)
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

    // CORREÇÃO: Busca clicks por EMAIL
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
      user: user,  // CORREÇÃO: manda user INTEIRO
      clicks: clicks
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 ROTA CLICKS (CORRIGIDA)
// =============================
app.post('/api/clicks', async (req, res) => {
  const { email, clicks_hoje } = req.body;  // CORREÇÃO: recebe email

  try {
    const existing = await pool.query(
      'SELECT * FROM clicks WHERE email = $1',  // CORREÇÃO: busca por email
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
        [clicks_hoje, email]  // CORREÇÃO: usa email
      );
      res.json({ success: true, clicks: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO clicks 
         (email, total_clicks, clicks_hoje, data_ultimo_click)
         VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [email, clicks_hoje]  // CORREÇÃO: usa email
      );
      res.json({ success: true, clicks: result.rows[0] });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📦 ROTAS ANÚNCIOS
// =============================
app.get('/api/anuncios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anuncios WHERE ativo = true');
    res.json({ success: true, anuncios: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 🎯 ROTA HEALTH CHECK
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
// 🎯 SISTEMA DE CLICKS E CRÉDITOS AUTOMÁTICO
// =============================
app.post('/api/registrar-click', async (req, res) => {
  const { email, anuncio_id } = req.body;

  try {
    // 1. ENCONTRA O USUÁRIO COM MENOR ID QUE RECEBE CRÉDITOS
    const usuarioCreditoResult = await pool.query(
      `SELECT * FROM cadastro 
       WHERE recebendo_creditos = true AND limite_atingido = false 
       ORDER BY id ASC LIMIT 1`
    );

    if (usuarioCreditoResult.rows.length === 0) {
      return res.json({ success: false, error: 'Nenhum usuário recebendo créditos no momento' });
    }

    const usuarioCredito = usuarioCreditoResult.rows[0];

    // 2. ATUALIZA CLICKS DO USUÁRIO QUE CLICOU
    const existing = await pool.query('SELECT * FROM clicks WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE clicks SET total_clicks = total_clicks + 1, clicks_hoje = clicks_hoje + 1, data_ultimo_click = CURRENT_TIMESTAMP WHERE email = $1`,
        [email]
      );
    } else {
      await pool.query(
        `INSERT INTO clicks (email, total_clicks, clicks_hoje, data_ultimo_click) VALUES ($1, 1, 1, CURRENT_TIMESTAMP)`,
        [email]
      );
    }

    // 3. ADICIONA R$ 0,0001 AO SALDO DO USUÁRIO COM MENOR ID
    const novoSaldo = parseFloat(usuarioCredito.saldo_redisponivel) + 0.0001;
    
    await pool.query(
      'UPDATE cadastro SET saldo_redisponivel = $1 WHERE id = $2',
      [novoSaldo, usuarioCredito.id]
    );

    // 4. VERIFICA SE ATINGIU O LIMITE DE R$ 1000,00
    if (novoSaldo >= 1000.00) {
      await pool.query(
        'UPDATE cadastro SET limite_atingido = true, recebendo_creditos = false WHERE id = $1',
        [usuarioCredito.id]
      );

      // 5. PASSA PARA O PRÓXIMO USUÁRIO COM MENOR ID
      const proximoUsuarioResult = await pool.query(
        `SELECT * FROM cadastro 
         WHERE recebendo_creditos = false AND limite_atingido = false 
         ORDER BY id ASC LIMIT 1`
      );

      if (proximoUsuarioResult.rows.length > 0) {
        await pool.query(
          'UPDATE cadastro SET recebendo_creditos = true WHERE id = $1',
          [proximoUsuarioResult.rows[0].id]
        );
      }
    }

    res.json({ 
      success: true, 
      message: 'Click registrado e crédito adicionado',
      usuario_credito: usuarioCredito.email,
      novo_saldo: novoSaldo
    });

  } catch (error) {
    console.error('Erro no registrar-click:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// ⭐ SISTEMA DE AVALIAÇÕES 0-9
// =============================
app.post('/api/avaliacoes', async (req, res) => {
  const { email, anuncio_id, nota } = req.body;

  try {
    // 1. REGISTRA AVALIAÇÃO
    const result = await pool.query(
      `INSERT INTO avaliacoes (email, anuncio_id, nota) 
       VALUES ($1, $2, $3) RETURNING *`,
      [email, anuncio_id, nota]
    );

    // 2. ATUALIZA ESTATÍSTICAS DO PRODUTO
    await pool.query(`
      INSERT INTO produtos_stats (anuncio_id, total_avaliadores, media_avaliacao) 
      VALUES ($1, 1, $2)
      ON CONFLICT (anuncio_id) 
      DO UPDATE SET 
        total_avaliadores = produtos_stats.total_avaliadores + 1,
        media_avaliacao = (produtos_stats.media_avaliacao * produtos_stats.total_avaliadores + $2) / (produtos_stats.total_avaliadores + 1),
        ultima_atualizacao = CURRENT_TIMESTAMP
    `, [anuncio_id, nota]);

    res.json({ 
      success: true, 
      avaliacao: result.rows[0],
      message: 'Avaliação registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro na avaliação:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// 📢 ROTA CRIAR ANÚNCIO
// =============================
app.post('/api/anuncios', async (req, res) => {
  const { titulo, banner_url, link_anuncio, tempo_exibicao } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO anuncios (titulo, banner_url, link_anuncio, tempo_exibicao) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [titulo, banner_url, link_anuncio, tempo_exibicao || 30]
    );

    res.json({ success: true, anuncio: result.rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});






// =============================
// 🔄 INICIALIZAR SISTEMA DE CRÉDITOS (PRIMEIRO USUÁRIO)
// =============================
app.get('/api/iniciar-creditos', async (req, res) => {
  try {
    // CONFIGURA PRIMEIRO USUÁRIO PARA RECEBER CRÉDITOS
    const result = await pool.query(
      `UPDATE cadastro SET recebendo_creditos = true 
       WHERE id = (SELECT id FROM cadastro ORDER BY id ASC LIMIT 1)
       RETURNING *`
    );

    res.json({ 
      success: true, 
      usuario_inicial: result.rows[0],
      message: 'Sistema de créditos iniciado'
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
