# ATLAS OS

Terminal Natural Gas dla jednego użytkownika: Next.js, React, TypeScript,
Tailwind CSS i TradingView Lightweight Charts. Interfejs po polsku, wykres w UTC.

## Uruchomienie w GitHub Codespaces

W terminalu projektu `/workspaces/atlas-os`:

```bash
npm ci
cp -n .env.example .env.local
npm run dev
```

Otwórz port **3000** w zakładce **Ports**. Zachowaj widoczność **Private**.
W pliku `/workspaces/atlas-os/.env.local` ustaw `TWELVE_DATA_API_KEY`.
Po zmianie zmiennych zatrzymaj serwer `Ctrl+C` i ponownie wykonaj `npm run dev`.
Nie wysyłaj klucza na GitHub ani w rozmowie. Klucz jest używany wyłącznie przez backend.

## Stan integracji

**Prawdziwe dane Natural Gas nie są jeszcze zweryfikowane na koncie użytkownika.**
Publiczny katalog `https://api.twelvedata.com/commodities`, sprawdzony podczas
budowy 2026-09-08, zwrócił 32 instrumenty i nie zawierał Natural Gas/Henry Hub.
Nie zakładamy, że `NG`, `NG/USD` lub `NG=F` oznaczają właściwy instrument w Twelve Data.
Nie podstawiamy ETF-ów, akcji ani danych testowych.

Backend pobiera katalog surowców i wybiera jednoznaczny Natural Gas w USD.
Opcjonalny `TWELVE_DATA_SYMBOL` musi wskazywać pasujący instrument z katalogu.
Jeżeli gaz jest dostępny w innej klasyfikacji/API, adapter wymaga zmiany po
potwierdzeniu symbolu, kontraktu, jednostki i uprawnień u dostawcy.
W przeciwnym razie potrzebne jest inne źródło danych Henry Hub.

Katalog potwierdza nazwę Natural Gas i walutę, **nie** konkretny kontrakt Henry Hub,
wygaśnięcie, metodę rolowania czy jednostkę USD/MMBtu. UI nie deklaruje tych właściwości.

## Endpoint

`/api/market` przyjmuje opcjonalny parametr `interval`: `5min`, `15min`, `1h`, `4h`, `1day`.
Przykład: `/api/market?interval=1h`. Domyślnie `1h`, maksymalnie 300 świec.
Sukces zawiera instrument, OHLC, opcjonalny wolumen, źródło i czas danych.
Błędy mają format `{ "error": { "code": "...", "message": "..." } }`.

| HTTP | Znaczenie |
| --- | --- |
| 400 | Nieobsługiwany interwał |
| 403 | Brak uprawnień w planie dostawcy |
| 404 | Brak danych |
| 422 | Brak jednoznacznego instrumentu w katalogu |
| 429 | Limit dostawcy |
| 502 | Niepoprawne dane lub błąd dostawcy |
| 503 | Brak/odrzucony klucz albo problem z połączeniem |

## Zachowanie terminala

- Rzeczywiste świece są jedynym źródłem wykresu; brak trybu demo i `chartData.ts`.
- Cena to `close` ostatniej świecy, która może być jeszcze otwarta.
- Procent to zmiana względem poprzedniej świecy wybranego interwału,
  **nie** dzienna zmiana względem poprzedniego settlementu.
- Brak wolumenu nie jest zamieniany na zero. Dane częściowe są oznaczane.
- LIVE jest wyłączony: świeżo pobrana odpowiedź nie dowodzi real-time feedu.
- Starsza świeca jest oznaczana po długości interwału + 120 s; ta heurystyka
  nie rozpoznaje weekendów, świąt ani godzin handlu i nie oznacza awarii giełdy.
- Przy błędzie poprzednio pobrane dane pozostają widoczne z ostrzeżeniem.
- Zmiana interwału czyści wykres; spóźniona odpowiedź nie nadpisuje nowego interwału.
- Auto jest domyślnie wyłączone. Po włączeniu odpytuje co 60 s w widocznej karcie
  i wyłącza się po błędzie. Może to zużywać dzienny limit konta.
- Backend ma 60 s cache na interwał, współdzielenie trwających żądań i 60 s cooldown
  po błędzie. Cache działa w pamięci jednego procesu, nie pomiędzy serwerami.
- Weather Panel, Market Score i AI Analyst nie są podłączone; nie generują ocen.

## Weryfikacja

```bash
npm test
npm run typecheck
npm run build
npm run test:smoke
```

Testy obejmują walidację cen/czasu, identyfikację instrumentu, błędy, cache,
współdzielenie żądań i ochronę klucza w odpowiedziach. Fikcyjne świece występują
wyłącznie w testach. Testy nie potwierdzają dostępu do rzeczywistych notowań.
Test z kluczem użytkownika i wizualny test w Codespaces pozostają do wykonania.

## Źródła techniczne

- [Twelve Data: dane historyczne](https://support.twelvedata.com/en/articles/5656039-how-to-get-historical-prices)
- [Twelve Data: strefy czasowe](https://support.twelvedata.com/en/articles/5745849-timezones)
- [Katalog surowców Twelve Data](https://api.twelvedata.com/commodities)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/docs)

Kod ATLAS OS: MIT. Lightweight Charts: Apache-2.0, z atrybucją TradingView w interfejsie.
