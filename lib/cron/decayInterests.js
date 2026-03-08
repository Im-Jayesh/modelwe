import Profile from "@/models/Profile";
import dbConnect from "@/dbConfig/dbConnect";

export async function runInterestDecay() {
    await dbConnect();

    // 1. Decay all interest tags by 20%
    // 2. Decay all creator affinity scores by 10%
    const profiles = await Profile.find({});

    for (const profile of profiles) {
        const updatedInterests = new Map();
        
        // Decay Interest Tags
        for (let [tag, score] of profile.interestTags) {
            const newScore = score * 0.8;
            if (newScore > 0.5) { // Only keep if it's still significant
                updatedInterests.set(tag, newScore);
            }
        }

        // Decay Creator Affinity
        const updatedAffinity = (profile.affinityUsers || [])
            .map(a => ({
                ...a,
                interactionScore: a.interactionScore * 0.9
            }))
            .filter(a => a.interactionScore > 1); // Remove if they haven't interacted in a long time

        await Profile.updateOne(
            { _id: profile._id },
            { 
                $set: { 
                    interestTags: updatedInterests,
                    affinityUsers: updatedAffinity
                } 
            }
        );
    }
    console.log(">>> Interest Decay Cycle Complete");
}