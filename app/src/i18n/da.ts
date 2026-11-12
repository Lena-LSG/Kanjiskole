// Danish UI copy. Keys, not inline strings, so English can be added later as a second dictionary.
import type { Explanation } from "@kanjiskole/core";

const n = (x: number) => x.toLocaleString("da-DK");

export const da = {
  locale: "da-DK",
  num: n,
  misc: {
    flashcard: "Flashcard",
    kanjiNo: (i: number) => `Kanji #${n(i)}`,
    grade: (g: number) => `${g}. klasse`,
    dataVersion: (v: string) => `Data ${v}`,
  },
  error: {
    title: "Noget gik i stykker.",
    body: "Dine fremskridt er gemt. Det er kun skærmen, der faldt.",
    retry: "Prøv igen",
  },
  greeting(hour: number): string {
    if (hour >= 4 && hour < 10) return "God morgen";
    if (hour < 17 && hour >= 10) return "God dag";
    if (hour < 23 && hour >= 17) return "God aften";
    return "Det er sent";
  },
  home: {
    waiting: (x: number) => (x === 1 ? "1 kanji venter på dig" : `${n(x)} kanji venter på dig`),
    doneTitle: "Færdig for i dag",
    doneSub: "Intet forfalder før i morgen. Du kan tage fem ekstra nye, hvis du keder dig.",
    summary: (due: number, fresh: number, min: number) => `${n(due)} repetitioner · ${n(fresh)} nye · ca. ${n(min)} min`,
    start: "Start session",
    extra: "5 ekstra nye",
    reviews: "Repetition",
    dueToday: "forfalder i dag",
    fresh: "Nye",
    ofToday: (x: number) => `af ${n(x)} i dag`,
    accuracy: "Træfsikkerhed",
    streak: "Stime",
    streakSub: (x: number): string => (x === 1 ? "dag i træk" : "dage i træk"),
    known: "Kendte kanji",
    knownSub: (total: number) => `af ${n(total)} jōyō`,
    blitzBest: "Lyntest-rekord",
    blitzSub: "point på 60 sek.",
    map: "Kortet",
    mapSub: "én celle pr. kanji, i den rækkefølge du lærer dem",
    mapLabel: (m: number, y: number, l: number, u: number) => `Fremskridt: ${n(m)} modne, ${n(y)} unge, ${n(l)} i gang, ${n(u)} ikke set`,
    legend: { mature: "Moden", young: "Ung", learning: "I gang", unseen: "Ikke set" },
    calibrate: "Kalibrér: hvilke kan du allerede?",
    kana: "Kana: hiragana og katakana",
    vocab: "Ordforråd: ord du kan læse",
    weakest: "Dine svageste kanji",
    settings: "Indstillinger",
    profile: "Indstillinger",
    search: "Søg kanji",
  },
  tabs: { home: "Hjem", kanji: "Kanji", stats: "Statistik", blitz: "Lyntest", nav: "Hovedmenu" },
  session: {
    pause: "Pause",
    newKanji: "Ny kanji",
    newTest: "Ny · test",
    again: "Igen",
    review: "Repetition",
    gotIt: "Forstået, test mig",
    show: "Vis svar",
    flashPrompt: "Betydning? Og hvordan læses ordet?",
    flashPromptNoWord: "Betydning og læsning?",
    keysOpts: "1–4 vælg · Enter videre · Esc pause",
    keysTyped: "Enter tjek / videre · Esc pause",
    keysIntro: "Enter videre · Esc pause",
    keysFlash: "Mellemrum vis · 1–4 svar · Esc pause",
    right: ["正解", "その通り", "完璧"],
    rightSuffix: "rigtigt",
    wrong: "Forkert",
    youWrote: "Du skrev",
    correctIs: "rigtigt er",
    alsoRight: (main: string) => `Også rigtigt. Den almindelige læsning er ${main}.`,
    guessed: "Gættede",
    next: "Videre",
    tooEasy: "For let",
    comesBack: "kommer igen om lidt",
    alsoValid: "Mit svar var også en gyldig læsning",
    check: "Tjek",
    typePlaceholder: "fx jikan eller じかん",
    finishedTitle: "Færdig for nu",
    finished: (answers: number, fresh: number) => `${n(answers)} svar i dag, ${n(fresh)} nye kanji. 済 (sumi) betyder "afsluttet".`,
    back: "Tilbage",
    nothing: "Intet at lave lige nu.",
  },
  kinds: {
    mean: { label: "Betydning", q: "Hvad betyder den?" },
    which: { label: "Find kanjien", q: "Hvilken kanji betyder" },
    fill: { label: "Byg ordet", q: "Hvilken kanji mangler?" },
    read: { label: "Læsning", q: "Hvordan læses det?" },
    type: { label: "Skriv læsningen", q: "Skriv læsningen (romaji eller kana)" },
  },
  why: "Hvorfor?",
  howRead: "Sådan læses det",
  audio: {
    play: "Afspil udtale",
    listenQ: "Lyt: hvad hørte du?",
    listenLabel: "Lyt",
    again: "Hør igen",
    setting: "Læs svaret op",
    on: "Til",
    off: "Fra",
    noVoice: "Ingen japansk stemme fundet. Installér en under Android-indstillinger → Tekst-til-tale, så kommer lyden.",
  },
  part: {
    rendaku: (k: string, base: string, r: string) => `${k} er ${base}, men stemmes til ${r} inde i ordet (rendaku).`,
    sokuon: (k: string, base: string, r: string) => `${k} er ${base}, men forkortes til ${r} foran næste lyd (lille っ).`,
    whole: (k: string, r: string) => `${k} læses ${r} som ét hele, ikke kanji for kanji.`,
    irregular: (k: string, r: string) => `${k} læses ${r} her: en særlig læsning, der hører til ordet.`,
  },
  explain(e: Explanation, m: (k: string) => string = () => ""): { tag: string; text: string } {
    switch (e.code) {
      case "rendaku":
        return e.missed
          ? { tag: "Rendaku", text: `${e.kanji} bliver stemt bagerst i et sammensat ord: ${e.correct}. Du kender reglen. Du brugte den bare ikke.` }
          : { tag: "Rendaku", text: `Ingen rendaku her: ${e.kanji} er ${e.correct}. Ikke alt bliver stemt, bare fordi det kan.` };
      case "voicing":
        return { tag: "Stemthed", text: `Én lyd stemt forkert. Rigtigt er ${e.correct}. Dakuten tæller.` };
      case "long-vowel":
        return e.missed
          ? { tag: "Lang vokal", text: "Du tabte en lang vokal. På japansk er det et andet ord, ikke en accent." }
          : { tag: "Lang vokal", text: "Der er ingen lang vokal her. Du har lagt en til." };
      case "sokuon":
        return e.missed
          ? { tag: "Lille っ", text: "Du mangler den lille っ: pausen er en del af ordet." }
          : { tag: "Lille っ", text: "Der er ingen っ her. Pausen findes kun i dit hoved." };
      case "small-kana":
        return { tag: "Små kana", text: `ゃゅょ er ikke やゆよ. Rigtigt er ${e.correct}.` };
      case "other-reading":
        return {
          tag: e.usedIsOn ? "On i stedet for kun" : "Kun i stedet for on",
          text: `Du læste ${e.kanji} som ${e.used}. Det er en rigtig læsning af ${e.kanji}, bare ikke i dette ord, hvor den er ${e.correct}.`,
        };
      case "rare-reading":
        return { tag: "Sjælden læsning", text: "Den læsning findes, men ikke som svaret på dette ord. Tag den almindelige." };
      case "lookalike": {
        const both = `${e.chosen} (${m(e.chosen)}) og ${e.target} (${m(e.target)})`;
        const diff = e.chosenOnly.length || e.targetOnly.length
          ? ` Forskellen: ${e.target} har ${e.targetOnly.join(" + ") || "ingen ekstra dele"}, ${e.chosen} har ${e.chosenOnly.join(" + ") || "ingen ekstra dele"}.`
          : " Delene er de samme, så se på stregernes længde og placering.";
        return { tag: "Forveksling", text: `${both} ligner hinanden${e.shared.length ? `: begge har ${e.shared.join(" + ")}` : ""}.${diff}` };
      }
      case "other-kanji":
        return { tag: "Anden kanji", text: `Du valgte ${e.chosen}, som betyder "${m(e.chosen)}". ${e.target} betyder "${m(e.target)}".` };
    }
  },
  intervals(days: number) {
    if (days === 0) return "nu";
    if (days < 31) return `${days} d`;
    if (days < 365) return `${Math.round(days / 30)} md`;
    return `${(days / 365).toFixed(1).replace(".", ",")} år`;
  },
  grades: ["Igen", "Svært", "Godt", "Let"] as readonly string[],
  panel: {
    strokes: (x: number) => `${x} streger`,
    freq: (i: number) => `#${n(i + 1)} i hyppighed`,
    parts: "Dele",
  },
  blitz: {
    title: "Lyntest",
    intro: "60 sekunder, fire valgmuligheder, så mange rigtige som muligt. Tre rigtige i træk giver dobbelt point.",
    mine: "Spørgsmålene kommer fra dine egne kanji, med vægt på dem du fejler.",
    top: "Du har under 20 kanji i gang, så spørgsmålene kommer fra de første 300 i pensum.",
    best: (x: number) => (x ? `Din rekord: ${n(x)}` : "Ingen rekord endnu."),
    start: "Start",
    points: "point",
    inARow: (x: number) => `${x} i træk · ×2`,
    record: "Rekord",
    sub: "Lyntest · 60 sekunder",
    zero: ["Nul point.", "Det tæller ikke som en rekord. Heller ikke som en indsats."],
    newRecord: ["Ny rekord.", "Den slår du nok ikke i morgen. Bevis det modsatte."],
    off: (gap: number) => [`${n(gap)} fra rekorden.`, "Det var ikke din bedste. Det ved du godt."],
    close: (gap: number) => [`${n(gap)} fra rekorden.`, "Tæt på. Én gang til?"],
    misses: (x: number) => `Fejl (${x})`,
    missesNote: "kommer med i dagens repetition",
    again: "Igen",
    home: "Til forsiden",
  },
  calibrate: {
    title: "Hvilke kan du læse?",
    body: "Tryk på dem, hvor du kender betydningen og mindst én læsning. Vær ærlig: om 3–4 uger skal du selv skrive læsningen.",
    picked: (x: number, total: number) => `${n(x)} valgt · ${n(total)} kalibreret indtil nu`,
    next: "Næste 25",
    stop: "Gem og stop",
    done: "Du er igennem alle 2.136. Imponerende, eller også var du ikke ærlig.",
  },
  kanji: {
    search: "Kanji, læsning eller betydning",
    results: (x: number) => `${n(x)} kanji`,
    none: "Ingen kanji passer. Prøv romaji, kana eller engelsk.",
    stage: "Stadie",
    stages: ["Ikke set", "I gang", "Ung", "Moden"] as readonly string[],
    next: "Næste",
    inDays: (d: number) => (d <= 0 ? "i dag" : `om ${n(d)} d`),
    lapses: "Fejl",
    words: "Ord",
    notSeen: "ikke set",
    mnemonic: "HUSKEREGEL",
    mnemonicEmpty: "Ingen huskeregel endnu. Skriv din egen; de virker bedst.",
    edit: "Rediger",
    save: "Gem",
    cancel: "Fortryd",
    strokes: "Stregrækkefølge",
    queue: "Sæt i kø",
    queued: "I køen",
    leech: "Igle: du har fejlet denne 8+ gange. En huskeregel hjælper.",
  },
  kana: {
    title: "Kana",
    intro: "Hiragana og katakana, med samme repetition som kanji. Nye kana får lette svarmuligheder; forvekslingerne (シ/ツ, ソ/ン) kommer, når de sidder fast.",
    hira: "Hiragana",
    kata: "Katakana",
    progress: (started: number, total: number, solid: number) => `${n(started)} af ${n(total)} i gang · ${n(solid)} sidder fast`,
    due: (x: number) => (x ? `${n(x)} til repetition i dag` : "Intet til repetition i dag"),
    practise: "Øv",
    know: "Jeg kan dem allerede",
    knowConfirm: (script: string) => `Markér alle ${script} som kendt? De bliver tjekket med indtastning om 3–4 uger, så vær ærlig.`,
    knowYes: "Ja, markér dem",
    knowNo: "Fortryd",
    marked: (x: number) => `${n(x)} kana markeret som kendt.`,
    readQ: "Hvordan udtales den?",
    pickQ: "Hvilken kana er det?",
    typeQ: "Skriv udtalen (romaji)",
    readLabel: "Læs",
    pickLabel: "Find kanaen",
    typeLabel: "Skriv",
    newKana: "Ny kana",
    isRead: (k: string, r: string) => `${k} udtales ${r}.`,
    mixup: (a: string, ar: string, b: string, br: string) => `${a} (${ar}) og ${b} (${br}) forveksles tit. Se på strøgenes retning.`,
    picked: (p: string, pr: string, k: string, kr: string) => `Du valgte ${p}, som udtales ${pr}. Den rigtige er ${k}: ${kr}.`,
    placeholder: "fx shi",
    done: "Alle kana er i gang. Nu er det repetition, der tæller.",
    chart: "Oversigt",
  },
  vocab: {
    title: "Ordforråd",
    intro: "Et ord bliver et kort, når du kender alle dets kanji: de letteste og mest almindelige først. Ordforrådet vokser altså ud af det, du allerede kan læse.",
    progress: (started: number, unlocked: number, total: number) => `${n(started)} i gang · ${n(unlocked)} låst op af ${n(total)}`,
    due: (x: number) => (x ? `${n(x)} til repetition i dag` : "Intet til repetition i dag"),
    none: "Ingen ord er låst op endnu. Lær eller kalibrér nogle kanji først.",
    next: "Næste ord",
    practise: "Øv",
    meaningQ: "Hvad betyder det?",
    readQ: "Hvordan læses det?",
    typeQ: "Skriv læsningen (romaji eller kana)",
    spellQ: "Hvordan staves det?",
    meaningLabel: "Betydning",
    readLabel: "Læsning",
    typeLabel: "Skriv",
    spellLabel: "Stavning",
    newWord: "Nyt ord",
    means: (w: string, g: string) => `${w} betyder "${g}".`,
    spelled: (w: string, r: string) => `${r} staves ${w}.`,
  },
  stats: {
    title: "Statistik",
    perDay: "Repetitioner, 14 dage",
    retention: "Træfsikkerhed, 30 dage",
    streak: "Stime",
    stages: "Stadier",
    leeches: "Igler",
    leechesNone: "Ingen igler. Endnu.",
    weakest: "Svageste lige nu",
    weakestNone: "Lær nogle kanji først.",
  },
  settings: {
    title: "Indstillinger",
    perDay: "Nye kanji pr. dag",
    style: "Repetitioner som",
    quiz: "Blandet quiz",
    flash: "Flashcards",
    importTitle: "Importér fra prototypen",
    importHelp: "Indsæt JSON fra den gamle Kanjiskole (eller vælg filen). Kort, rekord og indstillinger flyttes over; at importere to gange ændrer intet.",
    importPick: "Vælg fil",
    importRun: "Importér",
    imported: (x: number, skipped: number) => `${n(x)} kort importeret${skipped ? `, ${n(skipped)} sprunget over` : ""}.`,
    importFailed: "Det var ikke en Kanjiskole-eksport.",
    exportTitle: "Eksportér alt",
    exportHelp: "Hele din historik som JSON. Du er aldrig låst inde.",
    exportRun: "Eksportér",
    about: "Om data",
    aboutText:
      "Kanji, ord og komponenter fra KANJIDIC2, JMdict, RADKFILE og KRADFILE, ejet af Electronic Dictionary Research and Development Group og brugt under gruppens licens (CC BY-SA 4.0). Stregrækkefølge fra KanjiVG (CC BY-SA 3.0).",
    language: "Sprog",
    languages: { da: "Dansk", en: "English" },
    close: "Luk",
  },
};

export type Strings = typeof da;
