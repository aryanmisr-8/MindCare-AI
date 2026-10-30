// Item banks for validated, public-domain self-report screening instruments.
//
// PHQ-9 and GAD-7: developed by Drs. Robert L. Spitzer, Janet B.W. Williams,
// Kurt Kroenke and colleagues; Pfizer Inc. places no restriction on reproduction,
// translation, display, or distribution of these instruments for clinical and
// educational use. Attribution is retained below.
//
// CES-D: developed by Lenore Radloff at the U.S. National Institute of Mental
// Health (1977); the instrument is in the public domain.
//
// BDI-II (Beck Depression Inventory-II) is commercially licensed by Pearson /
// Psychological Corporation. Its items and scoring key are NOT reproduced here.
// The instrument is wired into the data model and API (see routes/screenings.js)
// as a licensed-content slot: an operator with a valid license can supply the
// item bank via ADMIN-configured content without any other code changes.

const RESPONSE_SCALE_4PT = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' }
];

const CESD_SCALE = [
  { value: 0, label: 'Rarely or none of the time (less than 1 day)' },
  { value: 1, label: 'Some or a little of the time (1–2 days)' },
  { value: 2, label: 'Occasionally or a moderate amount of time (3–4 days)' },
  { value: 3, label: 'Most or all of the time (5–7 days)' }
];

const PHQ9_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way'
];

const GAD7_ITEMS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen'
];

// Radloff (1977) CES-D 20-item scale. Items 4, 8, 12, 16 are reverse-scored (positively worded).
const CESD_ITEMS = [
  { text: 'I was bothered by things that usually don\u2019t bother me', reverse: false },
  { text: 'I did not feel like eating; my appetite was poor', reverse: false },
  { text: 'I felt that I could not shake off the blues even with help from my family or friends', reverse: false },
  { text: 'I felt that I was just as good as other people', reverse: true },
  { text: 'I had trouble keeping my mind on what I was doing', reverse: false },
  { text: 'I felt depressed', reverse: false },
  { text: 'I felt that everything I did was an effort', reverse: false },
  { text: 'I felt hopeful about the future', reverse: true },
  { text: 'I thought my life had been a failure', reverse: false },
  { text: 'I felt fearful', reverse: false },
  { text: 'My sleep was restless', reverse: false },
  { text: 'I was happy', reverse: true },
  { text: 'I talked less than usual', reverse: false },
  { text: 'I felt lonely', reverse: false },
  { text: 'People were unfriendly', reverse: false },
  { text: 'I enjoyed life', reverse: true },
  { text: 'I had crying spells', reverse: false },
  { text: 'I felt sad', reverse: false },
  { text: 'I felt that people disliked me', reverse: false },
  { text: 'I could not get "going"', reverse: false }
];

const INSTRUMENTS = {
  PHQ9: {
    code: 'PHQ9',
    displayName: 'Patient Health Questionnaire-9 (PHQ-9)',
    scale: RESPONSE_SCALE_4PT,
    items: PHQ9_ITEMS,
    selfHarmItemIndex: 8, // item 9, zero-indexed — checked independently of the total score
    bands: [
      { max: 4, band: 'Minimal', note: 'Little to no indication of depressive symptoms in the past two weeks.' },
      { max: 9, band: 'Mild', note: 'Some depressive symptoms — worth keeping an eye on.' },
      { max: 14, band: 'Moderate', note: 'A pattern of depressive symptoms that is worth discussing with a professional.' },
      { max: 19, band: 'Moderately severe', note: 'A significant symptom burden — a conversation with a clinician is recommended.' },
      { max: 27, band: 'Severe', note: 'A high symptom burden — please consider reaching out to a mental health professional soon.' }
    ],
    licensing: 'public_domain'
  },
  GAD7: {
    code: 'GAD7',
    displayName: 'Generalized Anxiety Disorder-7 (GAD-7)',
    scale: RESPONSE_SCALE_4PT,
    items: GAD7_ITEMS,
    selfHarmItemIndex: null,
    bands: [
      { max: 4, band: 'Minimal', note: 'Little to no indication of anxiety symptoms in the past two weeks.' },
      { max: 9, band: 'Mild', note: 'Some anxiety symptoms — worth monitoring.' },
      { max: 14, band: 'Moderate', note: 'A pattern of anxiety symptoms worth discussing with a professional.' },
      { max: 21, band: 'Severe', note: 'A high symptom burden — please consider reaching out to a mental health professional soon.' }
    ],
    licensing: 'public_domain'
  },
  CESD: {
    code: 'CESD',
    displayName: 'Center for Epidemiologic Studies Depression Scale (CES-D)',
    scale: CESD_SCALE,
    items: CESD_ITEMS.map((i) => i.text),
    reverseIndices: CESD_ITEMS.map((i, idx) => (i.reverse ? idx : null)).filter((v) => v !== null),
    selfHarmItemIndex: null,
    bands: [
      { max: 15, band: 'Minimal', note: 'Score is below the commonly used screening threshold.' },
      { max: 21, band: 'Mild to moderate', note: 'Score is at or above the commonly used screening threshold (16) — a pattern worth discussing with a professional.' },
      { max: 28, band: 'Moderate to marked', note: 'A more pronounced symptom pattern — a conversation with a clinician is recommended.' },
      { max: 60, band: 'Severe', note: 'A high symptom burden — please consider reaching out to a mental health professional soon.' }
    ],
    licensing: 'public_domain'
  },
  BDI2: {
    code: 'BDI2',
    displayName: 'Beck Depression Inventory-II (BDI-II)',
    licensing: 'requires_license',
    note: 'The BDI-II is a copyrighted, commercially licensed instrument (Pearson / Psychological Corporation). This deployment does not include its items. An operator with a valid license can supply the item bank and scoring key through the admin content pipeline without further code changes.'
  }
};

module.exports = { INSTRUMENTS };
