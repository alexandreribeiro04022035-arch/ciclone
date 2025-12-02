app.post("/api/q_to_ptc", async (req, res) => {
    const { ptcUser, valor } = req.body;

    const quantumUser = req.session.user_id;

    await supa.from("openbank").insert({
        ptc_user: ptcUser,
        quantum_user: quantumUser,
        tipo: "quantum_to_ptc",
        valor: valor
    });

    res.json({ ok: true, message: "Solicitação enviada ao PTC." });
});
