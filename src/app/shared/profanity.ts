// Blocks slurs and strong profanity in names people choose (event names, display names).
// Uses obscenity's English list, which also catches spelling tricks like "sh1t" or "f u c k".
// Shared by the app and api/agent.ts, so the assistant can't set a blocked name either.
import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// Mild words that are fine in a party name ("Shit Show Saturday"). Words from obscenity's list only;
// words that aren't on it ("crap", "damn") are already allowed.
export const ALLOWED_WORDS = ['shit', 'dick', 'piss', 'ass', 'arse', 'turd'];

const matcher = new RegExpMatcher({
  ...new DataSet<{ originalWord: string }>()
    .addAll(englishDataset)
    .removePhrasesIf(phrase => ALLOWED_WORDS.includes(phrase.metadata?.originalWord ?? ''))
    .build(),
  ...englishRecommendedTransformers,
});

export function isNameAllowed(name: string): boolean {
  return !matcher.hasMatch(name);
}
