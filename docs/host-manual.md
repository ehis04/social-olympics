# Social Olympics — Host Manual

This manual covers everything you need to know to create and manage a competition from start to finish. As host you have full control over your competition: you choose the events, manage members, confirm results, resolve disputes, and declare the winner.

---

## Table of Contents

1. [Creating a Competition](#1-creating-a-competition)
2. [Managing Members](#2-managing-members)
3. [Running Events](#3-running-events)
4. [Confirming Results](#4-confirming-results)
5. [Team Events](#5-team-events)
6. [Weightlifting Events](#6-weightlifting-events)
7. [Voting](#7-voting)
8. [Tiebreakers](#8-tiebreakers)
9. [Completing a Competition](#9-completing-a-competition)
10. [Moderation](#10-moderation)

---

## 1. Creating a Competition

Go to **Dashboard → Create Competition**. The creation form has six steps: Info, Events, Weighting, Members, Assign and Review.

### Step 1 — Basic Info

- **Name** — the competition name (subject to keyword filter, see [Moderation](#10-moderation))
- **Description** — optional, shown on the competition card
- **Visibility** — Public (appears in Discover) or Private (invite only)
- **Country and City** — the location of the competition
- **Prize Pot** — informational only; the platform does not handle money. Enter a suggested contribution and total pot for display purposes if you wish.

### Step 2 — Event Selection

Browse the event library and select the events for your competition. You must select at least one event. If the library does not have what you need, choose **Create a custom event**.

For each event you can set:
- **Weight tag** — how many points the event is worth relative to others (see [Event Weighting](#event-weighting) below)
- **Custom multiplier** — if you select Custom weight, enter a value between 0.1 and 3.0

Set the **minimum events** number (N). Each competitor's total score uses their best N results. Setting N lower than the total number of events means competitors can skip some events without penalty.

**Important:** Event weights are locked once the first event of the competition starts. Plan carefully before starting.

### Event Weighting

| Tag | Multiplier | When to use |
|---|---|---|
| Not Important | 0.5× | Warm-up or fun events with lower stakes |
| Standard | 1.0× | Default — most events |
| Important | 1.5× | Flagship events you want to emphasise |
| Very Important | 2.0× | The centrepiece event of the competition |
| Custom | 0.1×–3.0× | Fine-grained control |

### Step 3 — Scoring Options

- **MVP voting** — toggle on to enable anonymous MVP voting after each team event result is confirmed. MVP receives +1 point.
- **Worst performer voting** — toggle on to enable anonymous worst performer voting. Worst performer receives −1 point.

These toggles are locked once the first event starts.

### Members, Assign and Review

You can add people you follow and guest profiles, and assign them to events. After the competition is created you land on the **Members** tab, which shows:
- An **invite code** (8 characters) — share this with competitors
- An **invite link** — a direct URL that pre-fills the join screen; people who are signed out are brought back to it after signing in or registering

The mobile app can also show the invite as a **QR code**.

---

## 2. Managing Members

Go to the **Members** tab inside your competition.

### Inviting Members

Share the invite code, invite link, or QR code with the people you want to join. They must have a Social Olympics account to join.

### Changing Member Roles

Each member has one of three roles:

| Role | Can do |
|---|---|
| Competitor | Submit results, raise disputes, vote, send messages |
| Spectator | Follow along, chat and react — cannot submit results or vote |
| Co-host | Confirm results and invite members — cannot change competition settings |

To change a member's role, go to Members, find the member, and select a new role from the dropdown. People who join after the first event has started join as spectators; change them to Competitor if they should take part.

### Removing Members

From the Members tab, select a member and choose **Remove**. Removed members lose access to the competition immediately. Their already-confirmed results remain in the leaderboard.

### Creating a Ghost Profile

A ghost profile lets you add a non-registered user to your competition so they appear on the leaderboard.

1. Go to **Members → Add Guest**
2. Enter a display name for the guest
3. A ghost profile is created and appears on the leaderboard

Use **Copy claim link** next to the guest in Members and send it to them. When they sign in (or register) and claim the profile, all results, medals, and stats transfer to their permanent account automatically.

### Assigning a Co-host

From the Members tab, change a competitor's role to **Co-host** (host only). A co-host can start events, record and confirm results, resolve disputes, manage members and edit settings. They remain a competitor, so their own results still count. A competition has one co-host at a time.

---

## 3. Running Events

### Adding Events

Events are selected during competition creation. You can add more events from the library any time before the competition is completed via **Competition Settings → Events → Add event**. Upcoming events can also be removed there, and any unfinished event can be **cancelled** with a reason.

### Custom Events

You can create a custom event if the built-in library does not cover what you need:
- Within an existing category — the result type is inherited from the category
- In the **Other** category — you define the result type and rules yourself

### Reordering Events

Use the up and down arrows in **Competition Settings → Events** to change the running order.

### Starting an Event

Only one event can be active (Live) at a time. To start an event:

1. Go to the **Events** tab
2. Find the next event (status: Upcoming)
3. Tap **Start Event**

The event immediately shows as **Live** to all members on both web and mobile. Competitors can now submit results.

### Recording results

For individual events, **Record Results** opens a sheet with every participant. Results competitors have already submitted are filled in for you to check. Enter times as seconds or minutes:seconds and distances in metres. Saving ranks everyone and confirms the event.

### Resetting an Event

**Reset event** (on the recording screen) returns a live event to Upcoming and discards unconfirmed submissions, so you can restart it with different participants.

---

## 4. Confirming Results

After stopping an event, go to the event detail page to review all submitted results.

### Reviewing and Assigning Places

You will see all submitted results listed. For each result you can see the competitor's submitted value and any attached evidence.

Assign finishing places (1st, 2nd, 3rd, etc.) to each competitor. The scoring preview shows exactly how many points each place will award based on the event weight.

When you are satisfied, tap **Confirm Results**. Points are added to the leaderboard immediately and the activity feed updates in real time.

### The Dispute Window

Competitors have **24 hours** after confirmation to raise a dispute. During this window a flag is shown on the result.

### Resolving Disputes

Open disputes appear on the event page, each with the competitor's description of the issue. You are also notified when one is raised.

- **Correct result** — enter the corrected value (or mark DNF). Everyone in the event is re-ranked and points are recalculated automatically.
- **Resolve without changes** — close the dispute without editing the result.
- **Dismiss dispute** — the result stands as confirmed.

Open disputes must be settled before the competition can be completed.

The competitor is notified of the outcome in both cases.

---

## 5. Team Events

Team events involve peer-voted strength ratings, automated team balancing, and team result confirmation.

### Collecting Strength Ratings

Starting a team event gathers the competitors into a player pool, each with a strength rating from 1 to 10. Ratings worked out from past results are accepted straight away. Anyone without history starts at 5, can set their own rating, and the other competitors confirm it or say it is too high or low.

**Round 2:** if a majority rejects a rating, a second vote opens. If that is rejected too, the host decides.

**Host override:** you can set any player's rating at any time before teams are made. Use **Add competitors who joined late** to bring new competitors into the pool.

### How Teams Are Assigned

Choose the number of teams and tap **Balance teams**. The system assigns players so team strengths are as close as possible. You can re-balance until team results are entered.

### Recording Team Results

Enter one score per team (or mark a team DNF) and tap **Confirm team results**. Every member shares their team's place and points, and the team standings on the Leaderboard update.

---

## 6. Weightlifting Events

Weightlifting events are recorded like any other event: each lifter (or you, when recording) enters their **best successful lift in kilograms**. The heaviest lift wins and places follow from heaviest to lightest. Lifters who did not make a successful lift can be marked **DNF**, and they rank last.

**Tips for running a lifting event**

- Agree the lift (for example, bench press or deadlift), the number of attempts and any rules before you start, and note them in the event's **Details** so everyone can see them.
- Use **Record results** to enter everyone's best lift at once when you are running the event in person.
- If two lifters lift the same weight they share the place and the points, and the next lifter takes the next place.

---

## 7. Voting

### MVP Voting

MVP voting is available on team events if you enabled it at competition creation.

After confirming results, voting opens automatically. All competition members (competitors and spectators) can vote anonymously for the most valuable player. Voting stays open for 24 hours.

**To finalise the awards:** go to the event page and tap **Finalise awards**. The player with the most votes receives +1 point and an MVP entry in the activity feed. Ties are broken by random selection. If nobody has voted yet, voting stays open. Any awards still open are finalised automatically when you complete the competition.

### Worst Performer Voting

The same process applies for worst performer voting (if enabled). The player with the most votes receives −1 point. The same anonymous rules apply.

---

## 8. Tiebreakers

Competitors are ranked by points, then gold, silver and bronze medals. If two competitors are still level for a podium place, the Leaderboard shows a banner and, once all events are finished, you can tap **Start tiebreaker**. If you do not, they share the place.

### Step 1 — Medal Quality

The system checks medal counts automatically:
1. Most gold medals → winner
2. Most silver medals → winner
3. Most bronze medals → winner

If still tied after medal comparison, move to Step 2.

### Step 2 — Sealed Event Nomination

Both tied competitors are prompted to nominate one event they both contested. Nominations are hidden from each other until both have submitted.

What competitors see:
- Before submitting: they see only their own nomination field
- After both submit: both can see both nominated events

The competitor who wins more of the two nominated events takes the higher place. If the result is 1–1, the bigger raw winning margin (the actual difference in their scores) decides.

### Step 3 — Host Decides

If the sealed nomination step is also inconclusive, you as host make the final decision from the banner on the Leaderboard.

---

## 9. Completing a Competition

### When to Complete

Complete the competition when every event is confirmed or cancelled, any open disputes are settled and any started tiebreakers are resolved. To finish early, cancel the events you will not run.

### Completing

Go to **Competition Settings** and tap **Complete competition**. This:
- Finalises any MVP or worst-performer awards that are still open
- Locks the leaderboard permanently and assigns final ranks, applying tiebreaker results
- Opens the podium screen, where competitors who stayed level share their place
- Notifies every member that the final results are ready

### The Podium Screen

The **Podium** tab shows the top three competitors with their avatars, medal colours, and final point totals. The podium screen is viewable by all members.

**Sharing the podium (mobile):** tap the Share button on the podium screen to open the native share sheet and share a screenshot or link.

### Archiving a Competition

After completing, go to Competition Settings (or the Podium tab) and tap **Archive**. Archived competitions are removed from your active dashboard but remain accessible in your competition history. Members can still view the results and podium.

### Starting a New Season

Once a competition is complete (or archived), the host sees **Start new season** on the Podium tab and in Competition Settings. This creates a fresh copy of the competition with:

- the same name, description, visibility and settings, labelled **Season 2**, **Season 3** and so on;
- the same event list, weightings and points table (cancelled events are left out);
- the same members and co-host, all starting on zero points.

The new season starts in setup, so you can add or remove events and members before the first event begins. Every member gets a notification that the new season is ready. Each competition can have one next season; after it is created the button becomes **Go to season N**. The previous season's results and podium are not changed.

---

## 10. Moderation

### Keyword Filter

Competition names and descriptions are automatically checked against a keyword filter when you create or edit a competition. If a blocked term is detected, you will be asked to change the name or description before the competition can be saved.

### Reports

Members can report a competition, a profile, or a message using the Report button. Reports are reviewed by platform administrators. If your competition receives a report, it enters a review queue. You will be notified of any action taken.

### Suspensions

If a report results in a suspension, the affected person loses the ability to create new competitions. Existing competitions are not automatically removed. Appeals can be submitted via the support contact.

### Blocking

Anyone can block another person from their profile page. Blocking hides that person's chat messages and feed comments from the person who blocked them, and stops direct messages in both directions. Blocking does not remove anyone from a competition, so if a member is causing problems in your competition, remove them from the Members tab as well.

### When a Host Deletes Their Account

If you delete your account while hosting a competition that hasn't finished, the competition is handed to your co-host, or to the longest-standing active competitor if there is no co-host, and they are notified. A competition with no one left to take over is archived. Finished competitions keep their results, with your name shown as "Deleted user".
