// /api/users/search/route.js
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) return Response.json({ results: [] });

  await dbConnect();

  const results = await Profile.aggregate([
    {
      $search: {
        index: "profileSearchIndex", // Must match the name in Atlas
        compound: {
          should: [
            {
              autocomplete: {
                query: query,
                path: "username",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 5 } } // Username hits are more important
              }
            },
            {
              text: {
                query: query,
                path: ["firstName", "lastName"],
                fuzzy: { maxEdits: 1 }
              }
            }
          ]
        }
      }
    },
    { $limit: 10 },
    {
      $project: {
        username: 1,
        firstName: 1,
        lastName: 1,
        profilePic: 1,
        isVerified: 1,
        userId: 1,
        category: 1,            
        location: 1,            
        agency: 1,
        "stats.followersCount": 1,
        score: { $meta: "searchScore" } // Show the most relevant first
      }
    }
  ]);

  return Response.json({ results });
}