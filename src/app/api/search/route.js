// /api/search/route.js
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import Post from "@/models/Post"; 

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return Response.json({ users: [], posts: [] });
  }

  await dbConnect();

  // 1. User Search Promise
  const usersPromise = Profile.aggregate([
    {
      $search: {
        index: "profileSearchIndex", 
        compound: {
          should: [
            { autocomplete: { query, path: "username", fuzzy: { maxEdits: 1 }, score: { boost: { value: 5 } } } },
            { text: { query, path: ["firstName", "lastName"], fuzzy: { maxEdits: 1 } } }
          ]
        }
      }
    },
    { $limit: 4 },
    {
      $project: {
        username: 1,
        firstName: 1,
        lastName: 1,
        profilePic: 1,
        userId: 1,
        score: { $meta: "searchScore" }
      }
    }
  ]);


// 2. Post Search Promise (Matching your Autocomplete Index)
  const postsPromise = Post.aggregate([
    {
      $search: {
        index: "postsSearch", // Must match your Atlas index name exactly
        compound: {
          should: [
            // Autocomplete on Tags (Boosted)
            {
              autocomplete: {
                query: query,
                path: "tags",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 3 } }
              }
            },
            // Autocomplete on Caption
            {
              autocomplete: {
                query: query,
                path: "caption",
                fuzzy: { maxEdits: 1 }
              }
            }
          ]
        }
      }
    },
    { $limit: 6 },
    
    // STEP 1: Extract the searchScore FIRST
    {
      $project: {
        _id: 1,
        caption: 1,
        imageUrl: 1, 
        tags: 1,
        userId: 1, // Keep this for the lookup!
        score: { $meta: "searchScore" }
      }
    },

    // STEP 2: Lookup the author details
    {
      $lookup: {
        from: "profiles", // Verify this matches your MongoDB collection name! (Usually lowercase plural)
        localField: "userId",
        foreignField: "userId",
        as: "authorData"
      }
    },

    // STEP 3: Unwind safely
    { 
      $unwind: { 
        path: "$authorData", 
        preserveNullAndEmptyArrays: true 
      } 
    },

    // STEP 4: Final UI formatting
    {
      $project: {
        _id: 1,
        caption: 1,
        imageUrl: 1, 
        tags: 1,
        score: 1,
        "author.username": "$authorData.username",
        "author.profilePic": "$authorData.profilePic"
      }
    }
  ]);

  try {
    const [users, posts] = await Promise.all([usersPromise, postsPromise]);
    return Response.json({ users, posts });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}