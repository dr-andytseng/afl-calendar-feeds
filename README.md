# AFL Calendar Feeds 📅

Subscribe to live AFL fixture calendars for all 18 teams — automatically updated every hour via GitHub Actions.

Fixtures are sourced from [fixturedownload.com](https://fixturedownload.com) and served as `.ics` files via GitHub Pages. Times are in **UTC** so your calendar app will display them in your local timezone automatically.

---

## 📲 How to subscribe

Pick your team's URL below and add it as a **calendar subscription** (not a one-time import) so it stays up to date.

| Team | Calendar URL |
|------|-------------|
| 🏉 **All Teams** | `https://dr-andytseng.github.io/afl-calendar-feeds/all-teams.ics` |
| Adelaide Crows | `https://dr-andytseng.github.io/afl-calendar-feeds/adelaide-crows.ics` |
| Brisbane Lions | `https://dr-andytseng.github.io/afl-calendar-feeds/brisbane-lions.ics` |
| Carlton | `https://dr-andytseng.github.io/afl-calendar-feeds/carlton.ics` |
| Collingwood | `https://dr-andytseng.github.io/afl-calendar-feeds/collingwood.ics` |
| Essendon | `https://dr-andytseng.github.io/afl-calendar-feeds/essendon.ics` |
| Fremantle | `https://dr-andytseng.github.io/afl-calendar-feeds/fremantle.ics` |
| Geelong Cats | `https://dr-andytseng.github.io/afl-calendar-feeds/geelong-cats.ics` |
| Gold Coast SUNS | `https://dr-andytseng.github.io/afl-calendar-feeds/gold-coast-suns.ics` |
| GWS Giants | `https://dr-andytseng.github.io/afl-calendar-feeds/gws-giants.ics` |
| Hawthorn | `https://dr-andytseng.github.io/afl-calendar-feeds/hawthorn.ics` |
| Melbourne | `https://dr-andytseng.github.io/afl-calendar-feeds/melbourne.ics` |
| North Melbourne | `https://dr-andytseng.github.io/afl-calendar-feeds/north-melbourne.ics` |
| Port Adelaide | `https://dr-andytseng.github.io/afl-calendar-feeds/port-adelaide.ics` |
| Richmond | `https://dr-andytseng.github.io/afl-calendar-feeds/richmond.ics` |
| St Kilda | `https://dr-andytseng.github.io/afl-calendar-feeds/st-kilda.ics` |
| Sydney Swans | `https://dr-andytseng.github.io/afl-calendar-feeds/sydney-swans.ics` |
| West Coast Eagles | `https://dr-andytseng.github.io/afl-calendar-feeds/west-coast-eagles.ics` |
| Western Bulldogs | `https://dr-andytseng.github.io/afl-calendar-feeds/western-bulldogs.ics` |

### Apple Calendar
1. Open Calendar → File → **New Calendar Subscription**
2. Paste your team's URL → click Subscribe
3. Set auto-refresh to **Every Hour**

### Google Calendar
1. Open Google Calendar → click **+** next to "Other calendars"
2. Select **From URL**
3. Paste your team's URL → click **Add Calendar**

### Outlook
1. Open Outlook Calendar → **Add Calendar** → **From Internet**
2. Paste your team's URL → click **OK**

---

## 🔧 How it works

- A GitHub Actions workflow runs **every hour** and fetches the latest fixture JSON from fixturedownload.com
- It converts the JSON to `.ics` format and commits any changes to `docs/`
- GitHub Pages serves the files publicly at the URLs above
- Each event uses a stable UID so updates (score changes, venue changes) replace existing calendar entries rather than creating duplicates

## 📁 Repo structure

```
.github/workflows/update-calendars.yml   # scheduled workflow
src/fetch-and-convert.js                 # converts JSON → ICS for one team
src/build-all.js                         # runs conversion for all 18 teams
docs/<team>.ics                          # generated calendar files (served via Pages)
package.json
```

## 🙏 Credits

Fixture data provided by [fixturedownload.com](https://fixturedownload.com).
