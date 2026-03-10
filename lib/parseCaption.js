import Link from "next/link";

export function parseCaption(text = "") {
  const regex = /(#\w+|@\w+|https?:\/\/[^\s]+)/g;

  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1);

      return (
        <Link
          key={i}
          href={`/explore?tag=${tag}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </Link>
      );
    }

    if (part.startsWith("@")) {
      const username = part.slice(1);

      return (
        <Link
          key={i}
          href={`/profile/${username}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </Link>
      );
    }

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

    return part;
  });
}