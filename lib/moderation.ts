/**
 * Content moderation utilities for task creation
 * Maintains banned words list and validation logic
 */

// Configurable banned words list - update this array to modify moderation rules
const BANNED_WORDS = [
  // Violence & weapons
  'kill', 'murder', 'gun', 'weapon', 'bomb', 'explosive', 'knife', 'violence', 'assault', 'attack',
  
  // Drugs & substances
  'drugs', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'pills', 'dealer', 'selling drugs',
  
  // Sexual content
  'sex', 'sexual', 'porn', 'nude', 'naked', 'escort', 'prostitute', 'hookup',
  
  // Hate speech & discrimination
  'racist', 'racism', 'nazi', 'hate', 'slur', 'bigot', 'discrimination',
  
  // Self-harm
  'suicide', 'kill myself', 'self harm', 'cutting', 'overdose',
  
  // Illegal activities
  'steal', 'theft', 'fraud', 'scam', 'fake id', 'cheat', 'plagiarism', 'illegal',
  
  // Alcohol (underage)
  'buy alcohol', 'get beer', 'purchase liquor', 'underage drinking',
  
  // Academic dishonesty
  'do my homework', 'write my essay', 'take my exam', 'academic dishonesty',
  
  // Inappropriate services
  'massage', 'personal services', 'intimate', 'private session'
];

// Additional phrases that should be flagged
const BANNED_PHRASES = [
  'no questions asked',
  'under the table',
  'cash only no receipt',
  'dont tell anyone',
  'keep this secret',
  'off the books',
  'no paper trail'
];

export interface ModerationResult {
  isAllowed: boolean;
  flaggedWords: string[];
  message?: string;
}

export class ModerationService {
  /**
   * Check if text contains banned content
   */
  static moderateText(text: string): ModerationResult {
    if (!text || !text.trim()) {
      return { isAllowed: true, flaggedWords: [] };
    }

    const normalizedText = text.toLowerCase().trim();
    const flaggedWords: string[] = [];

    // Check individual banned words
    for (const word of BANNED_WORDS) {
      if (normalizedText.includes(word.toLowerCase())) {
        flaggedWords.push(word);
      }
    }

    // Check banned phrases
    for (const phrase of BANNED_PHRASES) {
      if (normalizedText.includes(phrase.toLowerCase())) {
        flaggedWords.push(phrase);
      }
    }

    const isAllowed = flaggedWords.length === 0;

    return {
      isAllowed,
      flaggedWords,
      message: isAllowed ? undefined : 'This task contains language that is not allowed. Please edit and try again.'
    };
  }

  /**
   * Moderate task title and description together
   */
  static moderateTask(title: string, description: string): ModerationResult {
    const titleResult = this.moderateText(title);
    const descriptionResult = this.moderateText(description);

    const allFlaggedWords = [...titleResult.flaggedWords, ...descriptionResult.flaggedWords];
    const isAllowed = titleResult.isAllowed && descriptionResult.isAllowed;

    return {
      isAllowed,
      flaggedWords: allFlaggedWords,
      message: isAllowed ? undefined : 'This task contains language that is not allowed. Please edit and try again.'
    };
  }

  /**
   * Get the current banned words list (for admin/debugging purposes)
   */
  static getBannedWords(): string[] {
    return [...BANNED_WORDS];
  }

  /**
   * Get the current banned phrases list (for admin/debugging purposes)
   */
  static getBannedPhrases(): string[] {
    return [...BANNED_PHRASES];
  }

  /**
   * Check if specific word is banned
   */
  static isWordBanned(word: string): boolean {
    const normalizedWord = word.toLowerCase().trim();
    return BANNED_WORDS.some(bannedWord => 
      bannedWord.toLowerCase() === normalizedWord
    );
  }

  /**
   * Sanitize text by replacing banned words with asterisks (for display purposes)
   */
  static sanitizeText(text: string): string {
    if (!text) return text;

    let sanitized = text;
    const normalizedText = text.toLowerCase();

    // Replace banned words with asterisks
    for (const word of BANNED_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '*'.repeat(word.length));
    }

    // Replace banned phrases with asterisks
    for (const phrase of BANNED_PHRASES) {
      const regex = new RegExp(phrase, 'gi');
      sanitized = sanitized.replace(regex, '*'.repeat(phrase.length));
    }

    return sanitized;
  }
}