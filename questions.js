// Pula pytan dla gry Guess the Liar.
//
// Kazdy wpis ma dwa pola:
//   real - pytanie, ktore widzi wiekszosc graczy (niewinni)
//   fake - pytanie, ktore widzi klamca (impostor) - podobne, ale inne
//
// Gra losuje pytania z tej tablicy bez powtorzen az do wyczerpania puli,
// potem tasuje ja ponownie. Podmien / rozszerz ponizsza liste o docelowe
// 200 pytan - format zostaje identyczny.

module.exports = [
  { real: "Co jest totalnie przereklamowane?", fake: "Co jest totalnie niedocenione?" },
  { real: "Jakiego dania nigdy by nie zjadl/a?", fake: "Jakie danie zjadlby/zjadlaby codziennie?" },
  { real: "Co robisz, kiedy nie mozesz spac?", fake: "Co robisz, kiedy jestes znudzony/a?" },
  { real: "Jaki jest najgorszy prezent, jaki mozna dostac?", fake: "Jaki jest najlepszy prezent, jaki mozna dostac?" },
  { real: "Czego najbardziej boisz sie w ciemnosci?", fake: "Czego najbardziej boisz sie w tlumie?" },
  { real: "Jaka umiejetnosc chcialbys/chcialabys miec?", fake: "Jakiej umiejetnosci chcialbys/chcialabys sie pozbyc?" },
  { real: "Co robisz zawsze, gdy nikt nie patrzy?", fake: "Czego nigdy nie zrobisz, gdy ktos patrzy?" },
  { real: "Jaki film ogladales/as najwiecej razy?", fake: "Jaki film chcialbys/chcialabys obejrzec, ale nigdy nie mozesz sie zebrac?" },
  { real: "Co jest twoim guilty pleasure?", fake: "Czego sie wstydzisz, ze NIE lubisz?" },
  { real: "Jakie miejsce na swiecie chcesz odwiedzic?", fake: "Jakiego miejsca na swiecie nigdy nie chcesz odwiedzic?" },
  { real: "Co zrobiles/as, za co do dzis jest ci wstyd?", fake: "Z czego jestes najbardziej dumny/a?" },
  { real: "Jaka piosenka zawsze podnosi ci nastroj?", fake: "Jaka piosenka zawsze cie irytuje?" },
  { real: "Co uwazasz za strate czasu?", fake: "Co uwazasz za najlepsze wykorzystanie czasu?" },
  { real: "Jaki jest twoj ulubiony sposob na relaks?", fake: "Jaki jest twoj ulubiony sposob na stres?" },
  { real: "Co kupiles/as, a nigdy tego nie uzyles/as?", fake: "Co kupiles/as i uzywasz codziennie?" },
  { real: "Jaka jest najdziwniejsza rzecz w twoim pokoju?", fake: "Jaka jest najladniejsza rzecz w twoim pokoju?" },
  { real: "Co robisz, gdy jestes zdenerwowany/a?", fake: "Co robisz, gdy jestes szczesliwy/a?" },
  { real: "Jaki byl twoj najgorszy pomysl na biznes?", fake: "Jaki byl twoj najlepszy pomysl na biznes?" },
  { real: "Czego nie potrafisz robic, mimo ze probowales/as?", fake: "Co potrafisz robic lepiej niz inni?" },
  { real: "Co jest przeceniane w social mediach?", fake: "Co jest niedoceniane w social mediach?" }
];
