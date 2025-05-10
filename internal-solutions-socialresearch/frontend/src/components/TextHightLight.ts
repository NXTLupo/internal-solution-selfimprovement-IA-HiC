/**
 * Escapes special characters in a string for use in a regular expression
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Highlights keywords in text with consistent styling based on sentiment
 * @param text - The text to highlight keywords in
 * @param keywords - Array of keywords to highlight
 * @param sentiment - Optional sentiment to determine highlight color (positive, negative, or neutral)
 * @param commonWords - Optional array of common words to exclude from highlighting
 * @returns HTML string with highlighted keywords
 */
export const highlightKeywords = (
  text: string,
  keywords: string[],
  sentiment: string = 'neutral',
  commonWords: string[] = []
): string => {
  if (!text || typeof text !== 'string' || !keywords.length) return text;
  
  // Filter out common words and sort by length (longest first)
  const sortedKeywords = keywords
    .filter(word => !commonWords.includes(word.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  
  // Create a temporary representation of the text with placeholders
  // This prevents nested or overlapping replacements
  let segments: Array<{isKeyword: boolean, text: string, keyword?: string}> = [{isKeyword: false, text: text}];
  
  sortedKeywords.forEach(keyword => {
    try {
      const escapedKeyword = escapeRegExp(keyword);
      
      // Use word boundaries for single words to prevent partial word matches
      // For multi-word phrases, we'll still use the flexible pattern
      const isMultiWord = keyword.trim().includes(' ');
      const pattern = isMultiWord 
        ? `(${escapedKeyword})` 
        : `\\b(${escapedKeyword})\\b`;
      
      const regex = new RegExp(pattern, 'gi');
      
      // Create new segments array after processing this keyword
      const newSegments: typeof segments = [];
      
      // Process each existing segment
      segments.forEach(segment => {
        // Only process non-keyword segments
        if (!segment.isKeyword) {
          let lastIndex = 0;
          const matches = Array.from(segment.text.matchAll(regex));
          
          // If no matches, keep segment as is
          if (matches.length === 0) {
            newSegments.push(segment);
            return;
          }
          
          // Process each match
          matches.forEach(match => {
            const matchIndex = match.index!;
            
            // Add text before match
            if (matchIndex > lastIndex) {
              newSegments.push({
                isKeyword: false,
                text: segment.text.substring(lastIndex, matchIndex)
              });
            }
            
            // Add the keyword segment
            newSegments.push({
              isKeyword: true,
              text: match[0],
              keyword: keyword
            });
            
            lastIndex = matchIndex + match[0].length;
          });
          
          // Add remaining text after last match
          if (lastIndex < segment.text.length) {
            newSegments.push({
              isKeyword: false,
              text: segment.text.substring(lastIndex)
            });
          }
        } else {
          // Keep existing keyword segments
          newSegments.push(segment);
        }
      });
      
      segments = newSegments;
    } catch (e) {
      console.error("Error highlighting keyword:", keyword, e);
    }
  });
  
  // Convert segments back to HTML
  return segments.map(segment => {
    if (!segment.isKeyword) {
      return segment.text;
    } else {
      // Determine highlight color based on sentiment
      const textColor = sentiment === 'positive' 
        ? 'text-green-400' 
        : sentiment === 'negative' 
          ? 'text-red-400' 
          : 'text-blue-400';
      
      // Use a custom data attribute to avoid conflicts with HTML attributes
      return `<span data-highlight="true" class="${textColor} font-bold">${segment.text}</span>`;
    }
  }).join('');
};