app.get("/api/historico", async (req, res) => {

    const user = req.session.user_id;

    const { rows } = await db.query(
        `SELECT * FROM openbank 
         WHERE ptc_user = $1 OR quantum_user = $1
         ORDER BY id DESC`,
         [user]
    );

    res.json(rows);
});
