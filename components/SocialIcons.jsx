// components/SocialIcons.jsx
import React from "react";

/**
 * props:
 *  - socials: { instagram?: string, facebook?: string, twitter?: string, ... }
 *  - size: number (pixel size, default 36)
 *  - className: extra wrapper classes
 *  - iconClassName: classes applied to the <svg> (use text-color classes to control color)
 */
export default function SocialIcons({
  socials = {},
  size = 36,
  className = "",
  iconClassName = "w-full h-full",
}) {
  const entries = Object.entries(socials).filter(([, url]) => url && url.length);

  if (!entries.length) return null;

  const icons = {
    instagram: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClassName}>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 8.5h1.8V5.8H15c-1.4 0-2.5 1.1-2.5 2.5v1.2H11v2h1.5V19h2.1v-7.3H16.5l.5-2z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 7.5c-.6.3-1.2.6-1.9.7.7-.4 1.2-1 1.4-1.8-.6.4-1.3.6-2 .8-.6-.7-1.6-1.2-2.6-1.2-2 0-3.6 1.6-3.6 3.6 0 .3 0 .6.1.9-3-.2-5.7-1.6-7.5-3.8-.3.6-.5 1.3-.5 2 0 1.2.6 2.3 1.6 2.9-.6 0-1.2-.2-1.7-.5v.1c0 1.8 1.3 3.3 3 3.6-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.6 2.3 3 2.3-1.1.9-2.5 1.4-4.1 1.4H6c1.5.9 3.3 1.4 5.2 1.4 6.3 0 9.8-5.3 9.8-9.8v-.4c.7-.5 1.3-1.2 1.7-2z" stroke="currentColor" strokeWidth="0.8" fill="none"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        <path d="M8.4 10.3v6.8M6.4 8.4h4v8.7M14.4 12.6c0 2.7 0 3.9 0 3.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    website: (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        <path d="M2 12h20M12 2v20" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" className={iconClassName} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        <path d="M12 3v18" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {entries.map(([key, url]) => {
        const keyName = key.toLowerCase();
        const icon = icons[keyName] ?? icons.default;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${key}`}
            className="group inline-flex items-center justify-center rounded-full overflow-hidden transition-transform transform hover:scale-105"
            style={{ width: size, height: size }}
          >
            {/* circle background that adapts to text color */}
            <span className="w-full h-full flex items-center justify-center rounded-full" style={{ color: "currentColor" }}>
              {icon}
            </span>
          </a>
        );
      })}
    </div>
  );
}