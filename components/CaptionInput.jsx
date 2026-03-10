"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { MentionsInput, Mention } from "react-mentions";
import debounce from "lodash.debounce";

export default function CaptionInput({ 
  value = "", 
  onChange = () => {}, 
  placeholder = "Write a caption... use @ to mention someone!",
  minHeight = "120px" // Default for posts
}) {

  // Generate styles dynamically based on props
  const styles = useMemo(() => ({
    control: { backgroundColor: "#fff", fontSize: 14, fontWeight: "normal" },
    input: {
      margin: 0,
      padding: "12px",
      border: "1px solid #e5e5e5",
      borderRadius: "8px",
      outline: "none",
      minHeight: minHeight,
    },
    suggestions: {
      list: {
        backgroundColor: "white",
        border: "1px solid rgba(0,0,0,0.1)",
        fontSize: 14,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        zIndex: 9999,
      },
      item: {
        padding: "8px 12px",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        "&focused": { backgroundColor: "#f3f4f6" },
      },
    },
  }), [minHeight]);

  const fetchUsersRaw = useCallback(async (query, callback) => {
    if (!query) return callback([]);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return callback([]);
      const data = await res.json();
      const formattedResults = (data.results || []).map((user) => ({
        id: String(user.userId ?? user._id ?? ""),
        display: String(user.username ?? ""),
        pic: user.profilePic ?? null,
        verified: Boolean(user.isVerified),
      }));
      callback(formattedResults);
    } catch (error) {
      callback([]);
    }
  }, []);

  const debouncedFetch = useMemo(
    () => debounce((query, callback) => fetchUsersRaw(query, callback), 300),
    [fetchUsersRaw]
  );

  useEffect(() => {
    return () => debouncedFetch.cancel();
  }, [debouncedFetch]);

  const dataFn = useCallback(
    (query, callback) => {
      if (!query) return callback([]);
      debouncedFetch(query, callback);
    },
    [debouncedFetch]
  );

  return (
    <div className="w-full relative">
      <MentionsInput
        value={value}
        onChange={(event, newValue) => onChange(newValue)}
        style={styles}
        placeholder={placeholder}
      >
        <Mention
          trigger="@"
          data={dataFn}
          appendSpaceOnAdd={true}
          className="bg-blue-100 text-blue-700 rounded-sm px-1 relative z-10"
          markup="@[__display__](__id__)"
          displayTransform={(id, display) => `@${display}`}
          renderSuggestion={(suggestion, search, highlightedDisplay) => (
            <div className="flex items-center gap-3">
              {suggestion.pic ? (
                <img src={suggestion.pic} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-xs text-white">
                  {suggestion.display.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  {highlightedDisplay}
                  {suggestion.verified && <span className="text-blue-500 text-xs">✓</span>}
                </span>
              </div>
            </div>
          )}
        />
      </MentionsInput>
    </div>
  );
}