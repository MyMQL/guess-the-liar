# Guess the Liar

Gra imprezowa dla znajomych. Wszyscy gracze oprócz jednego dostają to samo pytanie — kłamca dostaje pytanie podobne, ale inne, i nie wie o tym. Zadaniem reszty jest go namierzyć.

[![Downloads](https://img.shields.io/github/downloads/MyMQL/guess-the-liar/total)](https://github.com/TWOJ-USER/TWOJE-REPO/releases)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Status](https://img.shields.io/badge/status-stabilny-blue)

---

## Spis treści

- [Wymagania](#wymagania)
- [Instalacja — masz tylko plik ZIP](#instalacja--masz-tylko-plik-zip)
- [Uruchomienie](#uruchomienie)
- [Gra w sieci lokalnej](#gra-w-sieci-lokalnej)
- [Postawienie na serwerze (dostęp z internetu)](#postawienie-na-serwerze-dostęp-z-internetu)
- [Podmiana puli pytań](#podmiana-puli-pytań)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)
- [Zalecenia](#zalecenia)
- [Struktura projektu](#struktura-projektu)

---

## Wymagania

- **Node.js w wersji 18 lub nowszej** — to jedyna rzecz, którą musisz mieć zainstalowaną.
- Dowolny system: Windows, macOS lub Linux.
- Przeglądarka internetowa (Chrome, Firefox, Edge — cokolwiek).

Nie potrzebujesz żadnej wiedzy programistycznej. Poniższe kroki to kopiuj-wklej do terminala/wiersza poleceń.

---

## Instalacja — masz tylko plik ZIP

### Krok 1 — Zainstaluj Node.js

Jeśli nie masz Node.js na komputerze:

- **Windows / macOS:** wejdź na [nodejs.org](https://nodejs.org), pobierz wersję **LTS** i zainstaluj jak zwykły program (Next, Next, Zakończ).
- **Ubuntu / Debian:**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

Sprawdź, czy się zainstalowało:
```bash
node -v
npm -v
```
Obie komendy powinny zwrócić numer wersji. Jeśli zwracają błąd „command not found” — instalacja się nie powiodła, zrób krok 1 jeszcze raz.

### Krok 2 — Rozpakuj ZIP

Rozpakuj pobrany plik `guess-the-liar.zip` w dowolnym miejscu na dysku (Pulpit, Dokumenty — bez znaczenia). Po rozpakowaniu powinieneś zobaczyć folder `guess-the-liar` z plikami w środku (`server.js`, `package.json`, folder `public` itd.).

### Krok 3 — Otwórz terminal w tym folderze

- **Windows:** wejdź do rozpakowanego folderu w Eksploratorze plików, kliknij w pasek adresu na górze, wpisz `cmd` i wciśnij Enter.
- **macOS:** kliknij prawym na folder → *Nowy terminal w folderze* (albo otwórz Terminal i wpisz `cd ` i przeciągnij folder do okna).
- **Linux:** kliknij prawym w folderze → *Otwórz terminal tutaj*, albo:
  ```bash
  cd sciezka/do/guess-the-liar
  ```

### Krok 4 — Zainstaluj zależności

W otwartym terminalu wpisz:
```bash
npm install
```
Poczekaj, aż się skończy (kilkanaście-kilkadziesiąt sekund, zależnie od internetu). To pobiera dwie biblioteki, na których stoi gra (Express, Socket.io) — dzieje się to raz, nie trzeba tego powtarzać przy każdym uruchomieniu.

---

## Uruchomienie

W tym samym terminalu:
```bash
npm start
```

Powinieneś zobaczyć w konsoli:
```
Guess the Liar dziala na porcie 3000
```

Otwórz przeglądarkę i wejdź na:
```
http://localhost:3000
```

Gra działa. Żeby ją zatrzymać, wróć do terminala i wciśnij `Ctrl + C`.

---

## Gra w sieci lokalnej

Jeśli chcecie zagrać razem będąc w tym samym mieszkaniu/domu, na tym samym Wi-Fi:

1. Osoba hostująca uruchamia grę komendą `npm start` (jak wyżej).
2. Sprawdza swój lokalny adres IP:
   - Windows: `ipconfig` → szukaj `Adres IPv4` (np. `192.168.1.23`)
   - macOS/Linux: `ip a` lub `ifconfig` → szukaj adresu zaczynającego się od `192.168.` lub `10.`
3. Reszta graczy, będąc na tym samym Wi-Fi, wchodzi w przeglądarce na:
   ```
   http://ADRES-HOSTA:3000
   ```
   np. `http://192.168.1.23:3000`

Nie trzeba żadnego dodatkowego serwera ani konfiguracji — działa to od razu, dopóki wszyscy są w tej samej sieci.

---

## Postawienie na serwerze (dostęp z internetu)

Jeśli chcecie grać zdalnie (nie wszyscy w jednym miejscu), gra musi stać na serwerze dostępnym z internetu — najlepiej na małym VPS-ie albo na własnym komputerze z port forwardingiem na routerze.

Poniżej pełna konfiguracja pod **Ubuntu 24.04**, serwująca grę na porcie `8080` przez nginx, bez SSL (opcja rozsądna dla prywatnej gry towarzyskiej bez wrażliwych danych).

### 1. Node.js i pliki gry

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs unzip
sudo unzip guess-the-liar.zip -d /opt
cd /opt/guess-the-liar
npm install --omit=dev
```

### 2. Usługa systemd (żeby gra działała w tle i wstawała po restarcie serwera)

Utwórz plik:
```bash
sudo nano /etc/systemd/system/guess-the-liar.service
```
Wklej:
```ini
[Unit]
Description=Guess the Liar
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/guess-the-liar
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
Uruchom:
```bash
sudo chown -R www-data:www-data /opt/guess-the-liar
sudo systemctl daemon-reload
sudo systemctl enable --now guess-the-liar
sudo systemctl status guess-the-liar
```
Status musi pokazać `active (running)`.

> Jeśli `which node` pokazuje inną ścieżkę niż `/usr/bin/node` (np. po instalacji przez nvm), popraw `ExecStart` w pliku na faktyczną ścieżkę.

### 3. Nginx jako reverse proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/guess-the-liar
```
Wklej:
```nginx
server {
    listen 8080;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Nagłówki `Upgrade`/`Connection` są wymagane — bez nich Socket.io nie połączy się przez WebSocket.

```bash
sudo ln -s /etc/nginx/sites-available/guess-the-liar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Firewall (UFW) — tylko wymagany port otwarty, SSH zablokowane

```bash
sudo ufw --force reset && sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw deny 22/tcp && sudo ufw allow 8080/tcp && sudo ufw --force enable
```

**Uwaga:** ta konfiguracja jawnie blokuje SSH. Jeśli zarządzasz serwerem zdalnie po SSH, dostosuj regułę (`allow 22/tcp` zamiast `deny`) — inaczej stracisz zdalny dostęp po zamknięciu obecnej sesji.

### 5. Port forwarding na routerze (jeśli hostujesz z domu)

W panelu routera ustaw przekierowanie portu **8080 TCP** na lokalny adres IP maszyny hostującej grę (np. `192.168.100.150`). Zewnętrzny i wewnętrzny port mogą, ale nie muszą się zgadzać — dla prostoty trzymaj oba jako `8080`.

Sprawdź działanie z zewnątrz (np. z telefonu na danych komórkowych, nie na Wi-Fi):
```
http://TWOJ-PUBLICZNY-IP:8080
```

Jeśli nie działa mimo poprawnej konfiguracji, sprawdź czy Twój dostawca internetu nie stosuje CGNAT (brak realnego publicznego IP na routerze) — to częsta przyczyna przy łączach domowych.

---

## Podmiana puli pytań

Plik `questions.js` zawiera pytania w formacie:
```js
{ real: "Pytanie dla większości graczy", fake: "Pytanie dla kłamcy" }
```
Podmień/rozszerz tę listę o własne pytania — format musi zostać identyczny.

**Ważne:** Node.js wczytuje ten plik raz, przy starcie serwera. Po podmianie pliku trzeba zrestartować proces, inaczej zmiany nie zaczną obowiązywać:
```bash
sudo systemctl restart guess-the-liar
```
Restart kasuje wszystkie aktywne pokoje i trwające gry — rób to między rozgrywkami, nie w trakcie rundy.

---

## Rozwiązywanie problemów

| Problem | Przyczyna / rozwiązanie |
|---|---|
| `npm: command not found` | Node.js nie jest zainstalowany albo terminal trzeba zrestartować po instalacji. |
| `Error: listen EADDRINUSE :::3000` | Port 3000 jest już zajęty przez inny program. Zmień port: `PORT=4000 npm start` |
| Gracze w LAN nie mogą się połączyć | Sprawdź, czy firewall na komputerze hosta nie blokuje portu 3000 lokalnie, i czy wszyscy są w tej samej sieci Wi-Fi. |
| Strona nie ładuje się z internetu po skonfigurowaniu serwera | Sprawdź kolejno: `sudo systemctl status guess-the-liar`, `sudo systemctl status nginx`, `sudo ufw status`, port forwarding na routerze. |
| Zmiana w `questions.js` nie widoczna w grze | Brak restartu usługi — patrz sekcja wyżej. |
| Socket.io łączy się, ale gra "zawiesza się" po pierwszej rundzie | Prawie zawsze brak nagłówków `Upgrade`/`Connection` w konfiguracji nginx. |

---

## Zalecenia

- **Minimum 3 graczy** — mechanika głosowania traci sens przy mniejszej liczbie.
- **10–15 rund** to sensowny czas rozgrywki (~20–30 minut) — więcej zaczyna się dłużyć.
- Trzymaj pulę pytań na **co najmniej 30–40 pozycji** przy dłuższych sesjach, żeby uniknąć zbyt szybkich powtórek w obrębie jednej gry.
- Jeśli hostujesz z domu, port forwarding + reguły firewalla z sekcji wyżej wystarczą dla użytku towarzyskiego — to nie jest konfiguracja do wystawiania publicznie nieznajomym.
- Rób kopię `questions.js` przed edycją, żeby móc łatwo wrócić do poprzedniej wersji.

---

## Struktura projektu

```
guess-the-liar/
  server.js        — logika serwera: pokoje, rundy, głosowanie, punktacja
  questions.js      — pula pytań (real/fake)
  package.json
  public/
    index.html      — struktura wszystkich ekranów gry
    style.css       — wygląd
    client.js        — komunikacja z serwerem, obsługa interfejsu
  README.md
```
