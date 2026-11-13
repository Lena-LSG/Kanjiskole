// Who made what the app is built on, and under which licence. The single source for the About screen; CREDITS.md
// says the same for the repository. Names, licences and links are not translated; `role` keys into t.about.roles.
export interface Credit { name: string; by: string; role: "dict" | "strokes" | "audio" | "jlpt" | "furigana" | "glosses" | "components" | "fonts" | "srs"; licence: string; url: string; licenceUrl: string }

export const CREDITS: readonly Credit[] = [
  { name: "KANJIDIC2 · JMdict · JMnedict", by: "Electronic Dictionary Research and Development Group", role: "dict", licence: "CC BY-SA 4.0", url: "https://www.edrdg.org/", licenceUrl: "https://www.edrdg.org/edrdg/licence.html" },
  { name: "RADKFILE · KRADFILE", by: "Electronic Dictionary Research and Development Group", role: "components", licence: "CC BY-SA 4.0", url: "https://www.edrdg.org/krad/kradinf.html", licenceUrl: "https://www.edrdg.org/edrdg/licence.html" },
  { name: "KanjiVG", by: "Ulrich Apel and contributors", role: "strokes", licence: "CC BY-SA 3.0", url: "https://kanjivg.tagaini.net/", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { name: "Kanji alive", by: "Kanji alive", role: "audio", licence: "CC BY 4.0", url: "https://kanjialive.com/", licenceUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "JLPT word lists", by: "Jonathan Waller (tanos.co.uk), via yomitan-jlpt-vocab", role: "jlpt", licence: "CC BY", url: "https://www.tanos.co.uk/jlpt/", licenceUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { name: "JmdictFurigana", by: "Doublevil, via @furifont/dictionary (antfu)", role: "furigana", licence: "CC BY-SA 4.0", url: "https://github.com/Doublevil/JmdictFurigana", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { name: "jmdict-simplified", by: "scriptin, via kotobako-data", role: "glosses", licence: "CC BY-SA 4.0", url: "https://github.com/scriptin/jmdict-simplified", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { name: "kanji-data", by: "David Luz Gouveia", role: "dict", licence: "MIT", url: "https://github.com/davidluzgouveia/kanji-data", licenceUrl: "https://opensource.org/license/mit" },
  { name: "Shippori Mincho B1 · Zen Kaku Gothic New", by: "The Shippori Mincho Project Authors · The Zen Kaku Gothic Project Authors", role: "fonts", licence: "SIL OFL 1.1", url: "https://fonts.google.com/", licenceUrl: "https://openfontlicense.org/" },
  { name: "FSRS · ts-fsrs", by: "Open Spaced Repetition", role: "srs", licence: "MIT", url: "https://github.com/open-spaced-repetition/ts-fsrs", licenceUrl: "https://opensource.org/license/mit" },
];

export const SOURCE_URL = "https://github.com/Lena-LSG/Kanji";
