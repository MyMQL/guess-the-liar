# Guess the Liar

Gra imprezowa dla znajomych. Jeden gracz (klamca) dostaje inne, ale podobne
pytanie niz reszta i musi zblefowac odpowiedz tak, zeby nie zostac wykrytym.

## Struktura projektu

```
guess-the-liar/
  server.js        - serwer (Express + Socket.io), cala logika gry i pokoi
  questions.js      - pula pytan (para real/fake) - PODMIEN na docelowe 200 pytan
  package.json
  public/
    index.html      - struktura strony (wszystkie ekrany gry)
    style.css       - wyglad
    client.js       - logika frontendu / komunikacja z serwerem
```

## Uruchomienie lokalne

```
npm install
npm start
```

Domyslnie serwer nasluchuje na porcie 3000 (`http://localhost:3000`).
Port mozna zmienic zmienna srodowiskowa `PORT`.

## Podmiana puli pytan

`questions.js` eksportuje tablice obiektow `{ real, fake }`. Wystarczy
podmienic/rozszerzyc te tablice - format i mechanizm losowania (bez powtorzen
az do wyczerpania puli) zostaja bez zmian.

## Zasady gry (jak zaimplementowane)

- Min. 3 graczy w pokoju, host ustawia liczbe rund przy tworzeniu pokoju.
- Kazda runda: jeden losowy gracz (nie ten sam co w poprzedniej rundzie, jesli
  to mozliwe) dostaje "fake" pytanie, reszta dostaje "real" pytanie z tej
  samej pary.
- Po odpowiedzi wszystkich graczy (lub recznie przez hosta) - odslona
  prawdziwego pytania i wszystkich odpowiedzi.
- Glosowanie: kazdy wskazuje podejrzanego (nie moze glosowac na siebie).
- Wykrycie liczone jest po najwyzszej liczbie glosow: jesli jest jeden,
  jednoznaczny lider glosowania i jest nim klamca -> "zlapany".
  W kazdym innym przypadku (remis, brak wiekszosci, zle wskazanie) klamca
  "ucieka".
- Punktacja: zlapany klamca -> wszyscy poza nim +1. Klamca, ktory uciekl -> +1
  tylko dla niego.
- Wyniki pokazywane po kazdej rundzie, po ostatniej rundzie - tabela koncowa.
