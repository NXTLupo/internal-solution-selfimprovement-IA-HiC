import { Category } from '../../../../types/analysis';

// Types
export type WordCloudWord = {
  text: string;
  value: number; // Represents frequency * 10
  sentiment: 'positive' | 'negative';
  x?: number;
  y?: number;
  size?: number;
  rotate?: number;
};

/**
 * Processes merged sentiment analysis data to generate data for a word cloud visualization
 * 
 * @param mergedResult - The sentiment analysis result with positive and negative categories
 * @param maxWords - Maximum number of words to include (default: 100)
 * @param maxPhraseLength - Maximum number of words in a phrase to include (default: 3)
 * @returns Array of WordCloudWord objects sorted by frequency
 */
export const processWordCloudData = (
  mergedResult: { positive: Category[]; negative: Category[] } | null, 
  maxWords = 100, 
  maxPhraseLength = 3
): WordCloudWord[] => {
  if (!mergedResult) return [];
  
  const words: WordCloudWord[] = [];
  
  try {
    ['positive', 'negative'].forEach((sentiment) => {
      const categories = mergedResult[sentiment as keyof typeof mergedResult] || [];
      categories.forEach((category) => {
        const points = category.points || [];
        points.forEach((point) => {
          // Ensure point.point is treated as string and check frequency is a positive number
          const text = String(point.point).trim(); // Trim whitespace
          const frequency = typeof point.frequency === 'number' && point.frequency > 0 ? point.frequency : 0;
          
          // Filter out empty strings and phrases longer than maxPhraseLength words
          const wordCount = text.split(/\s+/).filter(Boolean).length; 
          if (text && frequency > 0 && wordCount > 0 && wordCount <= maxPhraseLength) {
            words.push({
              text: text,
              // value needs to be positive for log scale, ensure frequency > 0
              value: frequency * 10, 
              sentiment: sentiment as 'positive' | 'negative'
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Error processing word cloud data:', error);
    return []; // Return empty array on error
  }
  
  // Filter out words with value <= 0 before sorting, needed for log scale
  const validWords = words.filter(w => w.value > 0);

  // Sort by frequency (value) and take top N
  const sortedWords = validWords.sort((a, b) => b.value - a.value);
  const topWords = sortedWords.slice(0, maxWords);

  return topWords;
}; 