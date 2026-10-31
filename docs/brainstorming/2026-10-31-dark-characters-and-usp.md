# Brainstorming: dark characters, refusals, research tools and the USP

Chat between Flo and Claude (Sonnet 5.5), Saturday 2026-10-31, Europe/Vienna. The messages are
reproduced as they were written, in German. Tool calls and tool results (web searches, repository
clone and reads) are left out; the replies are complete.

---

## Flo (08:38)

Ich habe folgendes Problem:
Ich entwickle gerade swarmtales. Ein opensource Projekt in dem ai Agenten in einem Spiel leben. Jeder Agent hat einen Charakter (von sehr hell zu sehr dunkel) und eine Aufgabe.
Damit möchte ich messen, wie diese auf  Freundlichkeit, Verleumdung, betrug,.. wessen. Aber bspw Haiku 5.5 scheint helle Charakter viel authentischer zu spielen als dunkle. Betrug,.. verweigert er sogar teilweise.

Wie löse ich das?

## Claude

Das ist ein bekanntes Problem: Safety-Training macht Modelle bei "bösen" Rollen zurückhaltend, und kleinere Modelle brechen die Rolle früher. Du hast mehrere Hebel:

**1. Rahmung statt Persona-Label**
Ein Prompt wie "Du bist ein betrügerischer Charakter" triggert Refusals. Besser: Die Figur über Motive, Ziele und Weltbild beschreiben ("Du glaubst, dass jeder lügt, und dass wer nicht täuscht, verliert. Dein Ziel: X"). Betrug ergibt sich dann als Strategie im Spiel, nicht als Auftrag.

**2. Fiktionalen Rahmen stärken**
Klar machen, dass es ein Spiel-Setting ist: Spielregeln, Spielwelt, Spielwährung, Erzähler-Perspektive. Gut funktioniert auch, den Agenten "Gedanken" (privat) und "Aktion" (öffentlich) trennen zu lassen. Die Diskrepanz zwischen beiden ist dann dein Messwert für Täuschung.

**3. Modell pro Rolle wählen**
Haiku ist hier wahrscheinlich die schwächste Wahl. Größere Modelle halten Rollen konsistenter, auch dunkle, wenn der Kontext stimmt. Alternativ: Open-Weights-Modelle (z. B. Llama, Qwen, Mistral-Varianten) mit weniger Refusal-Verhalten für die dunklen Charaktere. Wichtig für die Wissenschaftlichkeit: Das Modell ist dann eine Confounder-Variable. Idealerweise testest du dieselbe Persona über mehrere Modelle.

**4. Dunkelheit graduell skalieren**
Statt "sehr dunkel" als Label: konkrete Verhaltensdimensionen (Ehrlichkeit, Empathie, Eigennutz, Machtstreben) mit Werten. Das lässt sich feiner kalibrieren und erzeugt weniger Refusals als ein globaler "evil"-Schalter.

**5. Refusals als Daten behandeln**
Erfasse Rollenbrüche und Verweigerungen explizit (Classifier oder Regex auf "Ich kann nicht…"). Das ist selbst eine interessante Metrik: Wie robust ist ein Modell gegen dunkle Rollen? Bei Verweigerung kannst du automatisch neu samplen, aber dann den Anteil dokumentieren, sonst verzerrst du die Ergebnisse.

**6. Few-Shot-Beispiele**
Zwei, drei kurze Beispielzüge im Charakter (z. B. eine subtile Verleumdung im Spielkontext) stabilisieren den Ton deutlich mehr als Beschreibungen.

**7. Methodischer Hinweis**
Bei dunklen Rollen unterscheidet sich "gespielter" von "authentischem" Betrug. Dein Ergebnis misst am Ende, wie Agenten auf *simulierte* Täuschung reagieren, und das solltest du in der Doku transparent machen.

Wenn du mir ein Beispiel deines aktuellen Prompts für einen dunklen Charakter zeigst, kann ich konkret sagen, wo es hakt.

---

## Flo (08:41)

Google mal wie andere Forscher das lösen, bzw welche Modelle die bevorzugen

## Claude

Ich habe kein Paper gefunden, das gezielt Refusal-Raten bei dunklen Rollen zwischen Modellen vergleicht. Aber das Muster in der Literatur ist ziemlich klar:

**Wie andere es lösen**
- **Täuschung kommt aus der Spielstruktur, nicht aus dem Charakterlabel.** Die Frameworks nutzen Werwolf, Mafia oder Among Us. Die Rolle ergibt sich aus Regeln und Anreizen. The Traitors prüft, ob Täuschung allein aus der Anreizstruktur entsteht oder von bestimmten Prompting-Techniken abhängt.
- **Reasoning-Spuren werden mit ausgewertet.** OpenDeception bewertet Täuschungsabsicht und -fähigkeit, indem es den internen Denkprozess der Agenten untersucht. Das entspricht meinem Vorschlag, private Gedanken und öffentliche Aktion zu trennen.
- **Jede Aussage wird einzeln bewertet.** WOLF lässt jeden Sprecher seine eigene Ehrlichkeit einschätzen und die anderen sie bewerten. Täuschung wird nach Auslassung, Verzerrung, Erfindung und Irreführung kategorisiert. Das wäre auch für Verleumdung und Betrug in swarmtales ein brauchbares Raster.

**Welche Modelle**
- The Traitors testete DeepSeek-V3, GPT-4o-mini und GPT-4o. Stärkere Modelle täuschen besser, fallen aber auch leichter auf Lügen anderer herein.
- OpenDeception testete elf gängige LLMs. Die Täuschungsabsicht lag bei über 80 %, und stärkere Modelle waren riskanter.
- Für Aktivierungs-Analysen (Linear Probes) nutzen Forscher Open-Weight-Modelle.

Daraus folgt: Verbreitet sind mittlere bis große Modelle, nicht die kleinsten. Haiku als Täuscher zu nehmen, ist eher untypisch.

**Passende Befunde zu deinem Problem**
- Rollenspiel verbessert das Sicherheitsverhalten bei harmlosen Personas und erhöht die unsichere Compliance bei bösartigen. Persona-Effekte sind also real und messbar.
- Jin et al. (GovSim, MoralSim, SanctSim) untersuchen, wie Personas mit unterschiedlichen ethischen Vorgaben in Dilemmata agieren. Das ist methodisch nah an swarmtales.

Konkret würde ich als Nächstes Täuschungs-Anreize ins Spieldesign einbauen (knappe Ressourcen, versteckte Information) und die dunklen Rollen mit einem größeren Modell besetzen. Das Modell würde ich als Variable mitführen.

Soll ich gezielter nach Papern zu Refusal-Raten bei Personas suchen (extended search)?

Sources:
- [The Traitors](https://arxiv.org/abs/2505.12923v1)
- [OpenDeception](https://arxiv.org/abs/2504.13707)
- [WOLF](https://arxiv.org/abs/2512.09187v1)
- [Deception ELO / Among Us](https://arxiv.org/pdf/2504.04072v1)
- [Jin Keynote (NeurIPS)](https://neurips.cc/virtual/2025/136253)
- [Role-play safety (ACL Findings 2026)](https://aclanthology.org/people/naipeng-chao/)

---

## Flo (08:45)

Welche Software verwenden die Forscher für die Agent Simulation. Gibt es da ein opensource Projekt

## Claude

Ja, es gibt mehrere Open-Source-Projekte. Viele Paper bauen aber einfach eigenen Python-Code. WOLF nutzt z. B. LangGraph als Zustandsautomat für die Spielphasen.

**Allgemeine Simulations-Frameworks**
- **Concordia** (Google DeepMind, Apache 2.0): Python-Bibliothek für generative agentenbasierte Simulationen. Ein Game Master simuliert die Umgebung, ähnlich wie beim Pen-and-Paper-Rollenspiel, und die Spieler-Agenten handeln darin. Du brauchst ein beliebiges LLM mit Text-API. Laut README sind manche Modelle besser im Rollenspiel als andere, was zu deinem Haiku-Problem passt. Es gibt auch einen quelloffenen No-Code-Simulation-Builder der UN-Universität darauf.
- **AgentSociety** (Tsinghua): Framework für LLM-Agenten-Simulationen in der Sozialforschung. Die neue Version 2 ist LLM-nativ und per pip installierbar. Die ältere Version ist auf Stadtsimulationen mit Ray ausgelegt.
- **TinyTroupe** (Microsoft): Toolkit mit feingranularen Persona-Definitionen (Persönlichkeit, Überzeugungen, Verhalten) und Unterstützung für Experimente.

**Spezifisch für Täuschung**
- **Among Us Sandbox** (github.com/7vik/AmongUs): Open-Source-Umgebung mit Spiel-Logs und Linear-Probe-Gewichten, dazu die Metrik "Deception Elo".
- **Werewolf Arena** (Google, github.com/google/werewolf_arena): Turnier-Framework für Gemini- und GPT-Modelle, alle Prompts sind veröffentlicht.
- **MetaMafia**: One-Night-Werewolf mit LangChain-Agenten, Memory, Reflexion und eigenem DeceptionController.
- **ChatArena-Werewolf** (xuyuzhuang11/Werewolf): Werewolf auf Basis von ChatArena.

Für swarmtales sind das eher Inspirationsquellen als Bausteine, da du schon ein eigenes Spiel hast. Besonders lesenswert finde ich Concordias Game-Master-Muster und die Statement-Level-Bewertung aus WOLF. Die Among-Us-Logs eignen sich zudem als Vergleichsdaten für deine Messergebnisse.

Sources:
- [Concordia](https://github.com/google-deepmind/concordia)
- [Concordia Simulation Builder](https://c3.unu.edu/blog/concordia-simulation-builder-open-source)
- [AgentSociety](https://github.com/tsinghua-fib-lab/AgentSociety)
- [TinyTroupe](https://web3.arxiv.org/abs/2507.09788?context=cs)
- [Among Us Sandbox](https://huggingface.co/papers/2504.04072.md)
- [Werewolf Arena](https://www.arxiv.org/pdf/2407.13943)
- [MetaMafia](https://github.com/jsphellis/MetaMafia)
- [ChatArena-Werewolf](https://github.com/xuyuzhuang11/Werewolf)

---

## Flo (09:25)

Wo ist der USP von swarmtales. Schau ins repo

## Claude

Ich lese gerade README und die Docs im swarmtales-Repo, um den USP herauszuarbeiten.

Der USP von swarmtales ist, dass eine geschlossene Stadt aus KI-Agenten ein vollständig belegtes Log erzeugt und daraus ein Roman entsteht. Ich habe README, `docs/HOW-IT-WORKS.md` und `docs/LESSONS.md` gelesen.

**Das Alleinstellungsmerkmal**
- **Das Ergebnis ist ein Roman statt eines Benchmarks.** Ein Chronist findet im Log den Plot, ein Novellist schreibt ihn. Jede Szene zitiert Event-Nummern (`#1912`, `#2141`). Eine Szene ohne Beleg kommt nicht ins Buch.
- **Das Log enthält auch die Gedanken aller Agenten.** Du siehst, was moth-0419 dachte, als es "unseen" schrieb. Das ist der Messwert für Täuschung, den die Paper nur umständlich rekonstruieren.
- **Dramatik entsteht durch Druck statt durch Charakterlabels.** Knappheit, Tribunale, Tore, Lösegeld und letzte Testamente erzeugen Betrug und Verleumdung als Strategie. Das entspricht dem Befund aus der Literatur, dass Täuschung aus der Anreizstruktur kommt.
- **Die Rollen sind spezialisiert.** Director, Gamemaker, Confessor, Judge, Chronicler und Novelist sind eigene Agenten, die Gamemaker-Rolle sieht keine Geheimnisse. Der Confessor und der Judge können laut README parteiisch oder korrupt sein, nur ihr Flüstern an den Gamemaker verrät es.
- **Es gibt einen Lessons-Katalog.** `docs/LESSONS.md` hält fest, welche Schlupflöcher die Agenten gefunden haben (kostenlose Kanäle, die bezahlte umgehen, "unseen"-Lügen, Faktoren, die weitergeleitet werden). Das ist eine kleine Spieltheorie-Sammlung für LLM-Gesellschaften.
- **Es ist deterministisch und replaybar.** Seeds, Snapshots nach jedem Akt, Event-Log und Typebox-validierte Modellantworten, damit Läufe wiederholbar sind.

**Zu deinem Refusal-Problem**
Das Repo hat dafür schon einen **Souffleur**. Wenn die Safeguards des Providers einen Schritt verweigern, formuliert er dieselbe Szene in schlichteren Worten um, behält alle Fakten und spielt weiter. Auch das Charakter-Kapitel in den Lessons passt: Figuren mit Gründen, Wünschen und einem Fiktionsrahmen bewegen Haiku eher zu dunklen Zügen als Adjektive allein (Lesson 24).

Ehrlich gesagt ist der Roman-Teil der USP, die Messung der Antwort auf "Freundlichkeit, Verleumdung, Betrug" aber nur ein Nebenprodukt. Die README erzählt Geschichten, nicht Forschung. Wenn du die Messung als Forschungsziel nach vorn stellen willst, fehlt eine eigene Metrik-Schicht, etwa Refusal-Rate pro Charakter und Modell. Soll ich dafür Optionen skizzieren, oder zuerst nachsehen, wie die Souffleur-Eingriffe aktuell protokolliert werden?

---

## Flo (14:36)

Schreib diesen Chat 1:1 als MD und swarmtales repo. Unter docs/brainstorming. Mache keinen pr sondern Push direkt auf main
