import Link from "next/link";

export function parseCaption(text = "") {
  if (!text) return null;

  // UPGRADED REGEX: 
  // 1. @\[[^\]]+\]\([^)]+\) -> Matches hidden mentions @[username](userId)
  // 2. @\w+                 -> Matches raw/legacy mentions @username
  // 3. #\w+                 -> Matches #hashtags
  // 4. https?:\/\/[^\s]+    -> Matches URLs
  const regex = /(@\[[^\]]+\]\([^)]+\)|@\w+|#\w+|https?:\/\/[^\s]+)/g;

  const parts = text.split(regex);

  return parts.map((part, i) => {
    
    // --- 1. HANDLE ROBUST MENTIONS: @[username](userId) ---
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      const display = mentionMatch[1]; 
      const userId = mentionMatch[2];  
      return (
        <Link
          key={i}
          href={`/profile/${userId}`} // Safely routes by ID
          className="text-blue-500 hover:underline font-medium"
        >
          @{display}
        </Link>
      );
    }

    // --- 2. HANDLE LEGACY/MANUAL MENTIONS: @username ---
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/profile/${username}`} // Routes by username string
          className="text-blue-500 hover:underline font-medium"
        >
          {part}
        </Link>
      );
    }

    // --- 3. HANDLE HASHTAGS: #explore ---
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/explore?tag=${tag}`} // Accurately routes to explore
          className="text-blue-500 hover:underline"
        >
          {part}
        </Link>
      );
    }

    // --- 4. HANDLE URLS ---
    if (part.startsWith("http")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {part}
        </a>
      );
    }

    // --- 5. HANDLE PLAIN TEXT ---
    return part;
  });
}