// Curated, source-tagged passages the RAG layer retrieves from. In production this
// corpus should be backed by the `research_papers` table plus a reviewed library of
// psychoeducation content — swap `getCorpus()` below for a database query without
// changing the retrieval or scoring logic.
//
// Every passage carries a source and a review date so responses can show freshness
// and provenance rather than presenting AI-generated text as unattributed fact,
// per the project's retrieval-grounded design (Section 3.2 of the algorithm analysis).

const CORPUS = [
  {
    id: 'sleep-mood-1',
    tags: ['sleep', 'mood', 'energy'],
    text: 'Poor sleep and low mood commonly reinforce each other — sleep disruption is one of the nine symptoms tracked by the PHQ-9 precisely because it is such a consistent companion to depressive episodes. Keeping a steady sleep and wake time, even on difficult days, is one of the more evidence-supported self-management steps alongside professional care.',
    source: 'PHQ-9 clinical documentation; sleep-mood literature (general clinical consensus)',
    reviewDate: '2024-01-01'
  },
  {
    id: 'anxiety-worry-1',
    tags: ['anxiety', 'worry', 'restless'],
    text: 'Difficulty controlling worry and physical restlessness are core features measured by the GAD-7. Structured breathing or grounding exercises do not remove the underlying cause of worry, but many people find they reduce the physical intensity enough to think more clearly in the moment.',
    source: 'GAD-7 clinical documentation',
    reviewDate: '2016-01-01'
  },
  {
    id: 'digital-apps-1',
    tags: ['app', 'digital', 'self-help', 'mood'],
    text: 'A meta-analysis of 176 randomized controlled trials found smartphone mental-health apps produce small but statistically significant reductions in depression and anxiety symptoms — meaningful, but modest compared with face-to-face therapy. Self-management tools work best as a complement to, not a replacement for, professional care.',
    source: 'Linardon et al., World Psychiatry, 2024',
    reviewDate: '2024-01-01'
  },
  {
    id: 'loneliness-1',
    tags: ['lonely', 'isolation', 'withdrawal'],
    text: 'Social withdrawal and loneliness are both a common symptom of low mood and a factor that can deepen it. Even brief, low-pressure contact with one trusted person has been repeatedly associated with better outcomes than withdrawing entirely, though everyone\u2019s situation is different.',
    source: 'General clinical consensus on depression self-management',
    reviewDate: '2023-01-01'
  },
  {
    id: 'chatbot-limits-1',
    tags: ['ai', 'chatbot', 'wellbeing'],
    text: 'A systematic review of AI-based conversational agents found real reductions in depressive symptoms and distress, but no significant improvement in overall psychological well-being — symptom relief and feeling well are not the same outcome, and this is part of why this platform treats itself as a support layer, not a replacement for a clinician.',
    source: 'Li, Zhang, Lee, Kraut & Mohr, npj Digital Medicine, 2023',
    reviewDate: '2023-01-01'
  },
  {
    id: 'treatment-gap-india-1',
    tags: ['india', 'access', 'stigma', 'treatment'],
    text: 'In India, the treatment gap for mental health — the share of people who need care but do not receive it — is estimated between 70% and 92%, among the widest globally, driven largely by stigma, cost, and workforce shortage rather than an absence of effective treatment. Reaching out, even for a first conversation, is a meaningful step against that gap.',
    source: 'Ministry of Health & Family Welfare, Tele-MANAS programme documentation',
    reviewDate: '2022-01-01'
  },
  {
    id: 'stress-general-1',
    tags: ['stress', 'overwhelm', 'exam', 'work'],
    text: 'Short-term stress responses (racing thoughts, tension, irritability) are a normal reaction to pressure, but when they persist for weeks and start affecting sleep, appetite, or concentration, they overlap meaningfully with the symptoms tracked by standard depression and anxiety screening tools — which is a reasonable moment to take a screening tool and consider talking to someone.',
    source: 'General clinical consensus on stress vs. clinical symptom overlap',
    reviewDate: '2023-01-01'
  }
];

function getCorpus() {
  return CORPUS;
}

module.exports = { getCorpus };
