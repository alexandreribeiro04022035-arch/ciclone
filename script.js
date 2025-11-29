// -------------------------------
// FUNÇÃO DE CADASTRO
// -------------------------------
function register() {
    let nome = document.getElementById("nome").value;
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;
    let confirmar = document.getElementById("confirmar").value;

    if (!nome || !email || !senha || !confirmar) {
        alert("Preencha todos os campos!");
        return;
    }

    if (senha !== confirmar) {
        alert("As senhas não coincidem!");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    // verificar se o email já existe
    if (users.some(u => u.email === email)) {
        alert("Este e-mail já está cadastrado!");
        return;
    }

    // adicionar novo usuário
    users.push({
        nome: nome,
        email: email,
        senha: senha,
        saldo: 0
    });

    localStorage.setItem("users", JSON.stringify(users));

    alert("Conta criada com sucesso!");
    window.location.href = "login.html";
}

// -------------------------------
// FUNÇÃO DE LOGIN
// -------------------------------
function login() {
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    let user = users.find(u => u.email === email && u.senha === senha);

    if (!user) {
        alert("E-mail ou senha incorretos!");
        return;
    }

    localStorage.setItem("loggedUser", JSON.stringify(user));
    window.location.href = "dashboard.html";
}

// -------------------------------
// CHECAR LOGIN EM PÁGINAS PROTEGIDAS
// -------------------------------
function checkLogin() {
    if (!localStorage.getItem("loggedUser")) {
        window.location.href = "login.html";
        return;
    }

    let user = JSON.parse(localStorage.getItem("loggedUser"));

    let nomeEl = document.getElementById("userName");
    let saldoEl = document.getElementById("userSaldo");

    if (nomeEl) nomeEl.innerText = user.nome;
    if (saldoEl) saldoEl.innerText = user.saldo.toFixed(2);
}

// -------------------------------
// LOGOUT
// -------------------------------
function logout() {
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html";
}

// -------------------------------
// VISUALIZAR ANÚNCIOS
// -------------------------------
function openAd(id) {
    localStorage.setItem("currentAd", id);
    window.location.href = "viewads.html";
}

// -------------------------------
// TIMER DE 30 SEGUNDOS
// -------------------------------
function startTimer() {
    let adId = localStorage.getItem("currentAd");
    document.getElementById("adIdLabel").innerText = adId;

    let timer = 30;
    let interval = setInterval(() => {
        timer--;
        document.getElementById("timer").innerText = timer + "s";

        if (timer <= 0) {
            clearInterval(interval);
            document.getElementById("finishBtn").style.display = "block";
        }
    }, 1000);
}

// -------------------------------
// FINALIZAR VISUALIZAÇÃO DO ANÚNCIO
// -------------------------------
function finishAd() {
    let user = JSON.parse(localStorage.getItem("loggedUser"));
    let users = JSON.parse(localStorage.getItem("users"));

    // adicionar saldo ao usuário
    user.saldo += 0.01;

    // atualizar na lista de usuários
    users = users.map(u => (u.email === user.email ? user : u));

    // salvar no localStorage
    localStorage.setItem("loggedUser", JSON.stringify(user));
    localStorage.setItem("users", JSON.stringify(users));

    alert("Crédito adicionado!");

    window.location.href = "viewad.html";
}