# Hacklanta 2026 — Agent Reference

> **Purpose:** This file is the working reference for an AI agent advising on Hacklanta 2026 project selection, planning, implementation, and submission. Read it before recommending a project or changing Hacklanta project files. The event guide supplied by the user is the source of event-specific facts in this document.
>
> **Current event dates:** Friday, October 9 through Sunday, October 11, 2026. The schedule and rules below reflect the supplied guide; check the event’s Discord for later changes.

## Instructions for the assisting agent

1. Read this file before proposing or making a project change related to Hacklanta.
2. Keep event requirements separate from recommendations. Treat dates, deadlines, track limits, and submission rules below as requirements; treat project ideas and prioritization as advice.
3. Do not silently replace the selected project, scope, track, or team decisions. If asked to implement, preserve the user’s chosen direction and make the smallest useful change consistent with the event rules.
4. Hacklanta requires an original project built during the official hacking period. Do not present earlier code, models, hardware, or designs as newly built. Clearly disclose prior work and build the core project and integrations during the event.
5. Do not claim a sponsor API, dataset, device, or service works unless it has been checked. Prefer a demo path that can run reliably without credentials or internet access when practical.
6. Keep the scope demoable by the deadline. Build one complete user flow before adding features. Leave time for testing, the public repository and README, the demo video, Devpost, and the required Google Form.
7. If guidance appears to conflict with a newer organizer announcement, follow the newer announcement and update this reference only when asked or when authorized to keep it current.

## Event overview

- **Event:** Hacklanta II, hosted by progsu; theme: **Music Festival**.
- **Venue:** Student Center East, Georgia State University, 55 Gilmer St SE, Atlanta, GA 30303.
- **Parking:** M Deck, 25 Auditorium Pl SE. Guide lists $4 for GSU students or $10 for non-GSU students for all three days if the vehicle stays in the deck; leaving changes the rate to per day.
- **Check-in:** Friday, October 9, starts at 3:00 PM; last call is 5:00 PM.
- **Required for participation:** government-issued ID, student ID, and acceptance email. Wear the event lanyard throughout the event.
- **Opening ceremony:** Friday, 5:30–6:30 PM, Student Center East State Ballroom.
- **Hacking period:** Friday, October 9, 8:30 PM through Sunday, October 11, 9:00 AM.
- **Judging expo:** Sunday, 9:30–11:30 AM, Student Center East State Ballroom.
- **Closing ceremony:** Sunday, 12:45 PM, Student Center East State Ballroom.
- **Event runs until:** Sunday, 3:00 PM, according to the guide’s overview.
- **Primary event communications:** [Hacklanta Discord](https://discord.gg/4z2UrEsxBq). Email: official@progsu.com. Follow Discord for live updates and the submission form.
- **Wi-Fi listed for non-GSU attendees:** Network `GSU`; guest username `HACKLANTA26`; password `progsuATL26`.
- Follow the [MLH Code of Conduct](https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md).

### Schedule checkpoints

| When | What |
| --- | --- |
| Fri, Oct 9, 3:00 PM | Check-in opens |
| Fri, Oct 9, 5:00 PM | Last call for check-in |
| Fri, Oct 9, 5:30–6:30 PM | Opening ceremony |
| Fri, Oct 9, 8:30 PM | Hacking begins |
| Sun, Oct 11, 9:00 AM | Hacking and submission deadline |
| Sun, Oct 11, 9:30–11:30 AM | Judging expo |
| Sun, Oct 11, 12:45 PM | Closing ceremony |

## Tracks and challenges

A team may enter **one main track** and **up to three side challenges**. Each main track has a first-place winner and an honorable mention.

### Main tracks

| Track | Prompt | Good project fit |
| --- | --- | --- |
| **COX: Social Good** | Build for overlooked people and places: access, safety, mobility, and everyday community systems. | A clear community need, identifiable beneficiaries, and a practical improvement in access or safety. |
| **Adobe: Creative** | Make something people feel: interactive art, music, games, and design tools that put new ideas on screen. | A polished, expressive, interactive experience. A game with a strong visual identity can fit well. |
| **AI/ML** | Put models to work: agents, assistants, and data pipelines that take real tasks off someone’s plate. | A model that performs a useful task in a real workflow, with visible input, output, and evidence it works. |
| **Fintech** | Rethink how money moves: payments, budgeting, investing, and tools that make finances easier to manage. | A focused financial task with a working flow and clear user benefit. Avoid unsupported claims about financial accuracy or security. |

### Side challenges

| Challenge | Requirement or fit | Prize listed in guide |
| --- | --- | --- |
| **Mercedes: Best Application of Computer Vision** | Computer vision must be central to the project. | $100 Visa gift card per team member |
| **MLH: Best Use of ElevenLabs** | Meaningful ElevenLabs use. | Wireless earbuds |
| **MLH: Best Use of Tiger Data** | Meaningful Tiger Data use. | Stream Deck Mini |
| **Replit: Best Small Business App built with Replit** | A useful small-business app built with Replit. | Dinner with the Replit team |
| **MLH: Best Use of Gemini API** | Meaningful Gemini API use. | MLH swag kits |
| **MLH: Best Use of Vultr** | Meaningful Vultr use. | M5Stack Official Tab5 |
| **MLH: Best Use of Solana** | Meaningful Solana use. | Assorted prizes |
| **MLH: Best Use of Auth0** | Meaningful Auth0 use. | Wireless headphones |
| **MLH: Best Domain Name from GoDaddy Registry** | Strong domain name from GoDaddy Registry. | Digital gift card |
| **Photon: Agents in iMessage** | Build an iMessage agent with Photon and integrate Spectrum, its open-source SDK. | Winner: $400 cash, $300 credits, and fast track to final interview; runner-up: $200 cash and $100 credits |
| **Shock Tracker: Zero Data** | Useful tool with no accounts, tracking, profiles, or stored personal information. | $50 per person and Hacklanta T-shirt |

Only claim a side challenge when the required technology or design is actually integrated and demonstrable. Do not add a sponsor tool just to list it.

## Project recommendation for this user

### Recommended concept: **Rep Rally** — a camera-based workout game

Build a small, playful fitness experience that uses a webcam to recognize one exercise, count valid reps, and award points in a short head-to-head or personal-best challenge. Add a music-festival-inspired visual treatment (for example, a stage, crowd meter, or setlist progression) so the game feels designed for Hacklanta’s theme.

**Recommended entry:** Adobe Creative as the main track, with Mercedes Best Application of Computer Vision as a side challenge. Consider Shock Tracker: Zero Data only if the finished experience truly has no accounts, tracking, profiles, or stored personal information. A live scoreboard based on persistent identities may conflict with that constraint.

**Why this is the strongest fit:**

- It builds on the user’s demonstrated computer-vision, YOLO, Raspberry Pi, and hardware experience, while creating a distinct new project for the event.
- Computer vision is essential to the experience, making the Mercedes side challenge credible.
- The RPG/game loop, visuals, and music-festival presentation give it a clear Adobe Creative story.
- A single exercise, one camera, rep counting, and a score screen form a credible demo-sized scope. The idea can be demonstrated even if advanced form coaching is deferred.

**Keep the first version small:**

1. Choose one exercise (such as squats) and one camera-based pose-detection approach.
2. Show a live camera preview and visible pose landmarks or tracking status.
3. Count reps using a simple, explainable movement cycle; provide a reset and a short calibration step.
4. Award points and show a local score/result screen.
5. Add one festival-themed visual/audio flourish only after rep counting works.
6. Test in different lighting and camera positions; give clear feedback when a person is out of frame.

**Do not promise** medical-grade form correction, injury prevention, precise calorie estimates, or reliable multi-person competition. Treat the prototype as a game and basic movement counter. Use consented demo footage or the participant’s live camera; avoid retaining video.

### Other concepts and category fit

| Concept | Best category/challenge fit | Assessment |
| --- | --- | --- |
| **Small-business SEO change tracker**: compare a business’s target keywords and search visibility before and after a website change. | Replit Small Business App side challenge; possibly COX Social Good if serving small local businesses is central. AI/ML only if a model does real work. | Strong practical business use, but live search rankings are hard to measure reliably in a short hackathon without a legitimate data source. Make it an honest monitoring/prototype workflow; do not fabricate Google ranking results. Better backup if the team prefers web apps and can secure a dependable dataset/API. |
| **Workout RPG with camera-based movement detection** | Adobe Creative main track; Mercedes Computer Vision side challenge. | Best overall recommendation given the user’s CV background and the event’s Creative theme. Keep the exercise and scoring narrow. |
| **Fintech transaction or subscription assistant** | Fintech main track; potentially AI/ML if a model automates a real task, or Solana only if blockchain is core. | Good match for the user’s agentic-finance internship experience. A safe scope is a synthetic-data subscription finder or spending explainer. Avoid connecting real bank accounts or handling real payments during the event. |
| **E-waste identification and repair/reuse helper** | COX Social Good main track; Mercedes CV side challenge if a new, event-built vision feature is central. | Closely matches prior experience, but the earlier e-waste sorter is pre-existing work. It must not be resubmitted as a new project. A genuinely new application built during Hacklanta could be eligible if prior hardware/model work is disclosed and the new work is substantial. |

### Selection rule

Choose the workout game if the team can get a reliable camera demo working early. Choose the SEO tool if the team has a trustworthy source of ranking or site-change data and a clear small-business user. Choose fintech if teammates can complete a convincing end-to-end demo with synthetic data. Do not select a track based only on keywords; select the one the finished project most clearly answers.

## Build and submission requirements

### Originality and eligibility

- Build an original, working project during the official Hacklanta hacking period.
- Software, hardware, AI, development tools, consumer products, fintech, creative technology, and open-source libraries/APIs/frameworks are allowed when they fit the event.
- Disclose anything that existed before the event, including starter templates, models, hardware, design, code, and prior project components.
- Main design, development, and integration must happen during the event.
- Previously completed projects or projects reused from another hackathon without major new work are not eligible.

### Required Devpost materials

Submit through [Hacklanta Devpost](https://hacklanta.devpost.com/) before hacking ends at **Sunday, October 11, 9:00 AM**. The guide says there are no exceptions.

Include all of the following:

- Project title and description.
- The problem and who the project serves.
- Team roster (maximum four people).
- Exactly one main track and no more than three side challenges.
- Public GitHub repository with useful README.
- Working demo link or clear run instructions.
- Public 2–3 minute demo video (YouTube, Google Drive, or another accessible URL).
- Technologies, APIs, datasets, and sponsor tools used.
- Disclosure of anything made before Hacklanta.
- Test credentials or special instructions judges need.
- Accessible links through the judging period.

One team member must also submit the required Google Form with the Devpost link, project name, team details, selected track, and challenges. The form is to be announced through Discord. Only one team member should submit both Devpost and the form.

### Judge presentation

- 3 minutes to pitch and demo, followed by 2 minutes of Q&A.
- Judges consider fit to the track prompt, prototype/demo polish, presentation effectiveness, and clarity of the use case.
- Prepare a reliable opening path: say who the project helps, show the core interaction immediately, explain the result, then state the technical contribution and limitations.

### Submission checklist

- [ ] Confirm all reused or pre-existing materials are disclosed.
- [ ] Confirm the project runs from a fresh clone or a stable public demo link.
- [ ] Confirm README setup steps and required environment variables are clear; do not commit secrets.
- [ ] Confirm repository is public and includes the complete project code.
- [ ] Record and publish a 2–3 minute demo video; verify it is public.
- [ ] Complete the Devpost write-up and select one main track plus at most three side challenges.
- [ ] Add test credentials or judge instructions if required.
- [ ] Submit the required Google Form using the team’s chosen submitter.
- [ ] Finish all submissions before Sunday, October 11, 9:00 AM.
- [ ] Attend judging expo and demo the project to earn the guide’s listed 200 participation points.

## Participant logistics and points

### Bring

- Government-issued ID and student ID (both required), plus acceptance email.
- Laptop and charger, phone and charger, refillable water bottle, and headphones.
- Hygiene supplies and bedding if staying overnight.
- Overnight stay is optional. Keep belongings secure; the organizers are not responsible for lost items.
- Late arrivals and walk-ins should report to the help desk outside Student Center East. Walk-in admission is not guaranteed.

### Food listed in the guide

- Friday dinner: Chinese Dhaba.
- Saturday brunch: Sbarro; dinner: Pizza Hut / DoorDash.
- Sunday breakfast: Jimmy John’s.
- Food options, hours, and availability can change; confirm current details before relying on them.

### Points

Scan each activity QR once using the member platform. The guide says workshop QR codes open near the end of the workshop; staff scan a participant’s personal QR for competition wins. Staff redeem prizes and deduct points. For a missed scan, ask staff whether an admin can correct it.

| Activity | Points |
| --- | ---: |
| Check-in | 15 |
| Each of 3 Cox workshops/panels | 30 |
| Each of 3 Adobe workshops/panels | 25 |
| GitHub Copilot workshop | 20 |
| Find all 5 VPs | 30 |
| Sponsor table checklist | 20 |
| Progirls station | 20 |
| DJ set | 15 |
| Just Dance floor | 15 |
| Demo at judging | 200 |
| Typing competition | 45 |
| Scavenger hunt, top 3 teams | 45 / 30 / 15 |

Prize shop prices and stock may change. Listed prices: stickers 30 points; Pop-It, Rubix Cube, or Squish Cube keychains 60; Four-Switch, Light-Up Switch, or Retro Game Player keychains 90; Hacklanta T-shirt 250 points (Sunday only).

## Official links

- [Hacklanta website](https://hacklanta.dev/)
- [Hacklanta Discord](https://discord.gg/4z2UrEsxBq)
- [Devpost submission page](https://hacklanta.devpost.com/)
- [Venue map](https://maps.app.goo.gl/vsgxP23bhcgDtaqP7)
- [Main entrance map](https://maps.app.goo.gl/N7WApJkHsDM1FZRw8)
- [M Deck map](https://maps.app.goo.gl/RSX6RfDkecFgtFvA8)
- [MLH Code of Conduct](https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md)
