export interface CorpusDoc {
  id: string;
  title: string;
  year?: number;
  value?: number;
  valueAge50Plus?: number;
  source: string;
  url?: string;
  validFrom?: string;
  validTo?: string;
  tags: string[];
  rationale?: string;
}

export interface Corpus {
  version: string;
  lastReviewedISO: string;
  docs: CorpusDoc[];
}

export interface Citation {
  title: string;
  source: string;
  url?: string;
}

export interface RAGAnswer {
  answered: boolean;
  text: string;
  citations: Citation[];
}

export class RAG {
  private static corpus: Corpus | null = null;

  static async loadCorpus(): Promise<Corpus> {
    if (this.corpus) return this.corpus;

    try {
      const response = await fetch('/corpus.json');
      const json = (await response.json()) as Corpus;
      this.corpus = json;
      return json;
    } catch (e) {
      return { version: 'unknown', lastReviewedISO: '', docs: [] };
    }
  }

  static retrieve(query: string, k: number = 3): CorpusDoc[] {
    const c = this.corpus;
    if (!c) return [];

    const q = query.toLowerCase();
    const tokens = q.split(/\W+/).filter((t) => t.length > 2);

    const scored = c.docs
      .map((d) => {
        const text = `${d.title} ${(d.tags || []).join(' ')} ${d.rationale || ''}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (text.includes(t)) score += 1;
        }
        return { doc: d, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, k).map((x) => x.doc);
  }

  static answer(query: string): RAGAnswer {
    const hits = this.retrieve(query);

    if (hits.length === 0) {
      return {
        answered: false,
        text: "I don't have this in my curated corpus. I won't guess on a regulated number — please check the IRS, your plan administrator, or a licensed advisor.",
        citations: [],
      };
    }

    // Format a deterministic answer
    const top = hits[0];
    let text = `${top.title}: `;

    if (top.value !== undefined) {
      text += `$${top.value.toLocaleString()}`;
      if (top.valueAge50Plus) {
        text += ` ($${top.valueAge50Plus.toLocaleString()} for age 50+)`;
      }
    }

    if (top.rationale) {
      text += ` ${top.rationale}`;
    }

    return {
      answered: true,
      text,
      citations: hits.map((d) => ({
        title: d.title,
        source: d.source,
        url: d.url,
      })),
    };
  }
}
