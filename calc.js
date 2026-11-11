// Formulas behind the Nichely calculators. Plain script (window.KDP) so every page can use it,
// and importable in Node for the checks in nichely/test.
(() => {
  // ---------- BSR -> sales (same curves as the Nichely extension) ----------
  const MODELS = { kindle: { a: 16986, b: 0.877 }, books: { a: 19450, b: 0.8495 } };
  function salesPerDay(bsr, store) {
    if (!(bsr >= 1)) return null;
    const m = MODELS[store] || MODELS.books;
    return m.a * bsr ** -m.b;
  }

  // ---------- royalties (Amazon.com marketplace) ----------
  // Ebook: 70% x (list price - delivery at $0.15/MB) between $2.99 and $12.99 (band widened
  // from $9.99 on July 7, 2026); otherwise 35% of the list price. Formula from KDP's pricing page.
  function ebookRoyalty(price, fileMb = 1, plan = 'auto') {
    if (!(price > 0)) return null;
    const eligible70 = price >= 2.99 && price <= 12.99;
    const rate = plan === '35' || !eligible70 ? 0.35 : 0.7;
    const delivery = rate === 0.7 ? Math.max(0, fileMb) * 0.15 : 0;
    return { rate, delivery, royalty: Math.max(0, (price - delivery) * rate) };
  }

  // Amazon.com paperback printing costs (KDP help "printing costs", 2026). Large trim = wider
  // than 6.12" or taller than 9". Royalty rate is 50% up to $9.98 and 60% from $9.99.
  const INK = {
    black: { min: 24, flatUpTo: 110, flat: [2.3, 2.84], perPage: [0.012, 0.017] },
    premium: { min: 24, flatUpTo: 40, flat: [3.6, 4.2], perPage: [0.065, 0.08] },
    standard: { min: 72, flatUpTo: 0, flat: [0, 0], perPage: [0.0255, 0.0402] },
  };
  function paperbackPrintCost(pages, largeTrim = false, ink = 'black') {
    const t = INK[ink] || INK.black;
    if (!(pages >= t.min) || pages > (ink === 'standard' ? 600 : 828)) return null;
    const i = largeTrim ? 1 : 0;
    if (pages <= t.flatUpTo) return t.flat[i];
    return 1 + pages * t.perPage[i];
  }
  function paperbackRoyalty(price, pages, largeTrim = false, ink = 'black') {
    const print = paperbackPrintCost(pages, largeTrim, ink);
    if (!(price > 0) || print === null) return null;
    const rate = price < 9.99 ? 0.5 : 0.6;
    const royalty = price * rate - print;
    const minPrice = Math.ceil((print / 0.6) * 100) / 100;
    return { rate, print, royalty, minPrice: Math.max(minPrice, 0.01) };
  }

  // ---------- paperback cover size ----------
  // KDP "Create a paperback cover": standard color paper has the same thickness as white.
  const SPINE_PER_PAGE = { white: 0.002252, cream: 0.0025, standard: 0.002252, premium: 0.002347, color: 0.002347 };
  const BLEED = 0.125;
  function coverSize(trimW, trimH, pages, paper = 'white') {
    if (!(trimW > 0 && trimH > 0 && pages >= 24)) return null;
    const spine = pages * (SPINE_PER_PAGE[paper] || SPINE_PER_PAGE.white);
    const width = BLEED + trimW + spine + trimW + BLEED;
    const height = BLEED + trimH + BLEED;
    return { spine, width, height, px: { width: Math.round(width * 300), height: Math.round(height * 300) }, spineText: pages > 79 };
  }

  const api = { salesPerDay, ebookRoyalty, paperbackPrintCost, paperbackRoyalty, coverSize };
  if (typeof window !== 'undefined') window.KDP = api;
  globalThis.KDP = api;
})();
