# AFL Calendar Feeds 📅
### Free 2026 Australian Rules Football Fixture Calendars for All 18 Teams

Never miss a game! Subscribe to live **AFL (Australian Football League) 2026 fixture calendars** for all 18 teams — automatically updated every hour so you always have the latest match times, venues, and results in your calendar.

> ⚠️ This is **AFL — Australian Rules Football**, not American football (NFL).

---

## 🗓️ What is this?

This project generates `.ics` calendar subscription feeds for every AFL team's 2026 season fixtures. Once you subscribe, your calendar app automatically stays up to date — no manual imports needed.

- ✅ All 18 AFL teams
- ✅ All fixtures for the 2026 AFL season
- ✅ Match times converted to **your local timezone** automatically
- ✅ Venue / location included for every game
- ✅ Updated every hour from [fixturedownload.com](https://fixturedownload.com)
- ✅ Works with Apple Calendar, Google Calendar, Outlook, and any app that supports `.ics` subscriptions

---

## 📲 How to subscribe

Find your team below, copy the URL, and follow the instructions for your calendar app.

| Team | Subscribe URL |
|------|--------------|
| 🏉 **All Teams (Football Nuts)** | `https://dr-andytseng.github.io/afl-calendar-feeds/all-teams.ics` |
| Adelaide Crows | `https://dr-andytseng.github.io/afl-calendar-feeds/adelaide-crows.ics` |
| Brisbane Lions | `https://dr-andytseng.github.io/afl-calendar-feeds/brisbane-lions.ics` |
| Carlton Blues | `https://dr-andytseng.github.io/afl-calendar-feeds/carlton.ics` |
| Collingwood Magpies | `https://dr-andytseng.github.io/afl-calendar-feeds/collingwood.ics` |
| Essendon Bombers | `https://dr-andytseng.github.io/afl-calendar-feeds/essendon.ics` |
| Fremantle Dockers | `https://dr-andytseng.github.io/afl-calendar-feeds/fremantle.ics` |
| Geelong Cats | `https://dr-andytseng.github.io/afl-calendar-feeds/geelong-cats.ics` |
| Gold Coast Suns | `https://dr-andytseng.github.io/afl-calendar-feeds/gold-coast-suns.ics` |
| GWS Giants | `https://dr-andytseng.github.io/afl-calendar-feeds/gws-giants.ics` |
| Hawthorn Hawks | `https://dr-andytseng.github.io/afl-calendar-feeds/hawthorn.ics` |
| Melbourne Demons | `https://dr-andytseng.github.io/afl-calendar-feeds/melbourne.ics` |
| North Melbourne Kangaroos | `https://dr-andytseng.github.io/afl-calendar-feeds/north-melbourne.ics` |
| Port Adelaide Power | `https://dr-andytseng.github.io/afl-calendar-feeds/port-adelaide.ics` |
| Richmond Tigers | `https://dr-andytseng.github.io/afl-calendar-feeds/richmond.ics` |
| St Kilda Saints | `https://dr-andytseng.github.io/afl-calendar-feeds/st-kilda.ics` |
| Sydney Swans | `https://dr-andytseng.github.io/afl-calendar-feeds/sydney-swans.ics` |
| West Coast Eagles | `https://dr-andytseng.github.io/afl-calendar-feeds/west-coast-eagles.ics` |
| Western Bulldogs | `https://dr-andytseng.github.io/afl-calendar-feeds/western-bulldogs.ics` |

---

## 📱 Setup instructions by app

### Apple Calendar (iPhone, iPad, Mac)
1. Open the **Calendar** app → tap **Calendars** at the bottom
2. Tap **Add Calendar** → **Add Subscription Calendar**
3. Paste your team's URL → tap **Subscribe**
4. Set auto-refresh to **Every Hour**
5. Tap **Add** to confirm

### Google Calendar
1. Open [Google Calendar](https://calendar.google.com) on desktop
2. Click the **+** next to "Other calendars" in the left sidebar
3. Select **From URL**
4. Paste your team's URL → click **Add Calendar**
5. Note: Google Calendar refreshes subscriptions roughly every 24 hours

### Outlook (Desktop or Web)
1. Open Outlook Calendar
2. Click **Add Calendar** → **Subscribe from web**
3. Paste your team's URL → click **Import**

### Other calendar apps
Any app that supports **iCalendar (.ics) subscriptions** will work. Look for "Subscribe", "Add from URL", or "Calendar subscription" in your app's settings.

---

## 🌍 Timezones

All match times are stored in **UTC** in the calendar feed. Your calendar app will automatically convert them to your local timezone — whether you're watching from Melbourne, London, New York, or anywhere else in the world.

---

## ❓ Frequently Asked Questions

**Is this free?**
Yes, completely free. No sign-up required.

**How often is it updated?**
The feeds are automatically refreshed every hour via GitHub Actions.

**Will it show finals / finals series fixtures?**
Fixtures are sourced from fixturedownload.com. Finals fixtures will appear once the AFL announces them.

**Does it work outside Australia?**
Yes! Times automatically display in your local timezone.

**What's the difference between AFL and NFL?**
AFL is **Australian Rules Football** — an entirely different sport played on an oval field, popular in Australia. NFL is American Football. This calendar is for AFL only.

---

## 🔧 How it works (technical)

- A **GitHub Actions** workflow runs every hour and fetches the latest 2026 AFL fixture JSON from [fixturedownload.com](https://fixturedownload.com)
- A Node.js script converts the JSON to standard `.ics` (iCalendar) format
- The generated files are committed to the `docs/` folder and served via **GitHub Pages**
- Each event has a stable UID so updates replace existing calendar entries rather than creating duplicates

## 📁 Repo structure

```
.github/workflows/update-calendars.yml   # hourly scheduled workflow
src/fetch-and-convert.js                 # converts JSON → ICS for one team
src/build-all.js                         # runs conversion for all 18 teams
docs/<team>.ics                          # generated calendar files
docs/all-teams.ics                       # combined feed for all 18 teams
```

---

## 🙏 Credits

Fixture data provided by [fixturedownload.com](https://fixturedownload.com).

---

*Keywords: AFL 2026 calendar, Australian Football League fixtures, AFL schedule iCal, AFL Google Calendar, AFL Apple Calendar, AFL ics feed, AFL fixture subscription, Adelaide Crows, Brisbane Lions, Carlton Blues, Collingwood Magpies, Essendon Bombers, Fremantle Dockers, Geelong Cats, Gold Coast Suns, GWS Giants, Hawthorn Hawks, Melbourne Demons, North Melbourne Kangaroos, Port Adelaide Power, Richmond Tigers, St Kilda Saints, Sydney Swans, West Coast Eagles, Western Bulldogs*
