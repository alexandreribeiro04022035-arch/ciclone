
import pkg from "pg";
const { Client } = pkg;

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Método inválido" });

    const { userPTC, userQuantum, valor, transacao } = req.body;

    const client = new Client({
        connectionString: process.env.NEON_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        // CREDITAR SALDO NO PTC
        await client.query(
            "UPDATE banco SET saldo = saldo + $1 WHERE id = $2",
            [valor, userPTC]
        );

        // REGISTRAR OPENBANK PTC
        await client.query(
            `INSERT INTO openbank 
            (usuario_ptc, usuario_quantum, valor, tipo, metodo, status, transacao, descricao) 
            VALUES ($1,$2,$3,'transferencia','saldo','ok',$4,'Quantum → PTC')`,
            [userPTC, userQuantum, valor, transacao]
        );

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Erro no PTC" });
    } finally {
        await client.end();
    }
}
