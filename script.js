const canvas = document.getElementById("plansza");
const ctx = canvas.getContext("2d");
const form = document.getElementById("ustawienia");
const punktyEl = document.getElementById("punkty");
const dlugoscEl = document.getElementById("dlugosc");
const rekordEl = document.getElementById("rekord");
const komunikat = document.getElementById("komunikat");

const RODZAJE = [
    { kolor: "#ff4d4d", punkty: 1, wzrost: 1, szansa: 0.6, czas: Infinity },
    { kolor: "#ffd23f", punkty: 5, wzrost: 2, szansa: 0.15, czas: 55 },
    { kolor: "#b05cff", punkty: -3, wzrost: -1, szansa: 0.25, czas: 90 },
];

const KIERUNKI = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
};

let szerokosc = 20;
let wysokosc = 15;
let pole = 30;
let waz = [];
let kierunek = { x: 1, y: 0 };
let kolejkaRuchow = [];
let jedzenie = [];
let napisy = [];
let punkty = 0;
let doWzrostu = 0;
let blysk = 0;
let timer = null;
let gra = false;
let pauza = false;
let rekord = 0;

try {
    rekord = Number(localStorage.getItem("snakeRekord")) || 0;
} catch (e) {
    rekord = 0;
}
rekordEl.textContent = rekord;

function ileJedzenia() {
    return Math.min(6, Math.max(2, Math.floor(szerokosc * wysokosc / 70)));
}

function zajete(x, y) {
    return waz.some(c => c.x === x && c.y === y) || jedzenie.some(j => j.x === x && j.y === y);
}

function losoweWolnePole() {
    const wolne = [];
    for (let y = 0; y < wysokosc; y++) {
        for (let x = 0; x < szerokosc; x++) {
            if (!zajete(x, y)) {
                wolne.push({ x, y });
            }
        }
    }
    if (wolne.length === 0) {
        return null;
    }
    return wolne[Math.floor(Math.random() * wolne.length)];
}

function losujRodzaj() {
    let los = Math.random();
    for (const rodzaj of RODZAJE) {
        if (los < rodzaj.szansa) {
            return rodzaj;
        }
        los -= rodzaj.szansa;
    }
    return RODZAJE[0];
}

function dodajJedzenie(rodzaj = losujRodzaj()) {
    const miejsce = losoweWolnePole();
    if (miejsce) {
        jedzenie.push({ x: miejsce.x, y: miejsce.y, rodzaj, zostalo: rodzaj.czas });
    }
}

function uzupelnijJedzenie() {
    if (!jedzenie.some(j => j.rodzaj.punkty > 0)) {
        dodajJedzenie(RODZAJE[0]);
    }
    while (jedzenie.length < ileJedzenia()) {
        dodajJedzenie();
    }
}

function dodajNapis(tekst, x, y, kolor) {
    napisy.push({ tekst, x, y, kolor, zostalo: 12 });
}

function aktualizujPanel() {
    punktyEl.textContent = punkty;
    punktyEl.classList.toggle("ujemne", punkty < 0);
    dlugoscEl.textContent = waz.length;

    if (punkty > rekord) {
        rekord = punkty;
        rekordEl.textContent = rekord;
        try {
            localStorage.setItem("snakeRekord", rekord);
        } catch (e) {
        }
    }
}

function przetnijNaPol() {
    const polowa = Math.max(1, Math.ceil(waz.length / 2));
    waz = waz.slice(0, polowa);
    doWzrostu = 0;
    blysk = 6;
    dodajNapis("przecięty!", waz[0].x, waz[0].y, "#ff9f43");
}

function zjedz(indeks) {
    const zjedzone = jedzenie.splice(indeks, 1)[0];
    const rodzaj = zjedzone.rodzaj;
    punkty += rodzaj.punkty;

    if (rodzaj.wzrost > 0) {
        doWzrostu += rodzaj.wzrost;
    } else {
        for (let i = 0; i < -rodzaj.wzrost && waz.length > 1; i++) {
            waz.pop();
        }
    }

    const znak = rodzaj.punkty > 0 ? "+" : "−";
    dodajNapis(znak + Math.abs(rodzaj.punkty), zjedzone.x, zjedzone.y, rodzaj.kolor);
}

function krok() {
    if (pauza) {
        return;
    }

    if (kolejkaRuchow.length > 0) {
        kierunek = kolejkaRuchow.shift();
    }

    const glowa = waz[0];
    const nowaGlowa = {
        x: (glowa.x + kierunek.x + szerokosc) % szerokosc,
        y: (glowa.y + kierunek.y + wysokosc) % wysokosc,
    };

    if (doWzrostu > 0) {
        doWzrostu--;
    } else {
        waz.pop();
    }

    const ugryziony = waz.some(c => c.x === nowaGlowa.x && c.y === nowaGlowa.y);
    waz.unshift(nowaGlowa);

    if (ugryziony) {
        przetnijNaPol();
    }

    const indeksJedzenia = jedzenie.findIndex(j => j.x === nowaGlowa.x && j.y === nowaGlowa.y);
    if (indeksJedzenia !== -1) {
        zjedz(indeksJedzenia);
    }

    jedzenie.forEach(j => j.zostalo--);
    jedzenie = jedzenie.filter(j => j.zostalo > 0);
    uzupelnijJedzenie();

    napisy.forEach(n => n.zostalo--);
    napisy = napisy.filter(n => n.zostalo > 0);
    if (blysk > 0) {
        blysk--;
    }

    aktualizujPanel();
    rysuj();
}

function rysujTlo() {
    for (let y = 0; y < wysokosc; y++) {
        for (let x = 0; x < szerokosc; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? "#1c2b22" : "#203127";
            ctx.fillRect(x * pole, y * pole, pole, pole);
        }
    }
}

function rysujJedzenie() {
    jedzenie.forEach(j => {
        const srodekX = j.x * pole + pole / 2;
        const srodekY = j.y * pole + pole / 2;
        const migaj = j.zostalo < 20 && j.zostalo % 4 < 2;

        ctx.globalAlpha = migaj ? 0.3 : 1;
        ctx.shadowColor = j.rodzaj.kolor;
        ctx.shadowBlur = pole * 0.5;
        ctx.fillStyle = j.rodzaj.kolor;
        ctx.beginPath();
        ctx.arc(srodekX, srodekY, pole * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(srodekX - pole * 0.1, srodekY - pole * 0.1, pole * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function rysujWeza() {
    waz.forEach((segment, i) => {
        const postep = waz.length > 1 ? i / (waz.length - 1) : 0;
        ctx.fillStyle = `hsl(${140 - postep * 50}, 72%, ${58 - postep * 22}%)`;
        ctx.beginPath();
        ctx.roundRect(segment.x * pole + 1, segment.y * pole + 1, pole - 2, pole - 2, pole * 0.3);
        ctx.fill();
    });

    const glowa = waz[0];
    const srodekX = glowa.x * pole + pole / 2;
    const srodekY = glowa.y * pole + pole / 2;
    const bokX = -kierunek.y;
    const bokY = kierunek.x;

    [-1, 1].forEach(strona => {
        const okoX = srodekX + kierunek.x * pole * 0.15 + bokX * strona * pole * 0.2;
        const okoY = srodekY + kierunek.y * pole * 0.15 + bokY * strona * pole * 0.2;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(okoX, okoY, pole * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(okoX + kierunek.x * pole * 0.04, okoY + kierunek.y * pole * 0.04, pole * 0.06, 0, Math.PI * 2);
        ctx.fill();
    });
}

function rysujNapisy() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.max(13, pole * 0.7)}px Segoe UI, Arial, sans-serif`;

    napisy.forEach(n => {
        ctx.globalAlpha = n.zostalo / 12;
        ctx.fillStyle = n.kolor;
        ctx.fillText(n.tekst, n.x * pole + pole / 2, n.y * pole + pole / 2 - (12 - n.zostalo) * 2);
    });
    ctx.globalAlpha = 1;
}

function rysuj() {
    rysujTlo();
    rysujJedzenie();
    rysujWeza();
    rysujNapisy();

    if (blysk > 0) {
        ctx.fillStyle = `rgba(255, 80, 60, ${blysk * 0.05})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function start() {
    const nowaSzerokosc = Number(document.getElementById("szerokosc").value);
    const nowaWysokosc = Number(document.getElementById("wysokosc").value);

    if (!Number.isInteger(nowaSzerokosc) || !Number.isInteger(nowaWysokosc) || nowaSzerokosc < 5 || nowaWysokosc < 5 || nowaSzerokosc > 40 || nowaWysokosc > 40) {
        komunikat.textContent = "Wymiary planszy muszą być od 5 do 40";
        komunikat.classList.add("widoczny");
        return;
    }

    szerokosc = nowaSzerokosc;
    wysokosc = nowaWysokosc;
    pole = Math.max(12, Math.floor(Math.min(600 / szerokosc, 600 / wysokosc)));
    canvas.width = szerokosc * pole;
    canvas.height = wysokosc * pole;

    const startX = Math.floor(szerokosc / 2);
    const startY = Math.floor(wysokosc / 2);
    waz = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
    ];
    kierunek = { x: 1, y: 0 };
    kolejkaRuchow = [];
    jedzenie = [];
    napisy = [];
    punkty = 0;
    doWzrostu = 0;
    blysk = 0;
    pauza = false;
    gra = true;

    uzupelnijJedzenie();
    aktualizujPanel();
    rysuj();
    komunikat.classList.remove("widoczny");

    clearInterval(timer);
    timer = setInterval(krok, Number(document.getElementById("predkosc").value));

    if (document.activeElement) {
        document.activeElement.blur();
    }
}

form.addEventListener("submit", e => {
    e.preventDefault();
    start();
});

document.addEventListener("keydown", e => {
    if (!gra) {
        return;
    }

    if (e.code === "Space") {
        e.preventDefault();
        pauza = !pauza;
        komunikat.textContent = "Pauza – naciśnij spację";
        komunikat.classList.toggle("widoczny", pauza);
        return;
    }

    const klawisz = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const nowyKierunek = KIERUNKI[klawisz];
    if (!nowyKierunek || pauza) {
        return;
    }
    e.preventDefault();

    const ostatni = kolejkaRuchow.length > 0 ? kolejkaRuchow[kolejkaRuchow.length - 1] : kierunek;
    const przeciwny = nowyKierunek.x === -ostatni.x && nowyKierunek.y === -ostatni.y;
    const takiSam = nowyKierunek.x === ostatni.x && nowyKierunek.y === ostatni.y;

    if (!przeciwny && !takiSam && kolejkaRuchow.length < 3) {
        kolejkaRuchow.push(nowyKierunek);
    }
});

rysujTlo();
