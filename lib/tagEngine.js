// lib/tagEngine.js
import { removeStopwords, eng } from 'stopword';

export function extractRobustTags(caption) {
    if (!caption) return [];
    
    // 1. Initial cleanup: Lowercase and remove URLs
    let text = caption.toLowerCase();
    text = text.replace(/(https?:\/\/[^\s]+)/g, ''); 

    const tags = new Set();
    
    // 2. High-Priority Hashtags: Always keep these as they are explicit intent
    const hashtags = text.match(/#(\w+)/g);
    if (hashtags) {
        hashtags.forEach(h => {
            const tag = h.slice(1);
            if (tag.length > 1) tags.add(tag);
        });
    }

    // 3. Process the rest of the text
    // Remove punctuation except for hashtags we already caught
    const cleanText = text.replace(/[^\w\s]/g, ' '); 
    const allWords = cleanText.split(/\s+/).filter(word => word.length > 2);

    // 4. Use the library to strip standard English stop-words ("the", "and", "he"...)
    const meaningfulWords = removeStopwords(allWords, eng);

    // 5. Custom Social Media Noise Filter
    // These aren't always in NLP libraries but clutter social feeds
    const socialNoise = new Set([
        "repost", "link", "bio", "follow", "comment", "like", "subscribe", 
        "video", "post", "today", "yesterday", "tomorrow", "everyone",
        "guys", "please", "thanks", "maybe", "actually", "going"
    ]);

    meaningfulWords.forEach(word => {
        // Only add if it's not in our custom noise list and not already a hashtag
        if (!socialNoise.has(word) && !tags.has(word)) {
            tags.add(word);
        }
    });

    // Return limited number of tags to prevent "tag stuffing" from breaking the algorithm
    return Array.from(tags).slice(0, 15); 
}