import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import clientPromise from "../../lib/mongodb";

export default withApiAuthRequired(async function handler(req, res) {
  try {
    const {
      user: { sub },
    } = await getSession(req, res);
    const client = await clientPromise;
    const db = client.db("BlogStandard");
    const userProfile = await db.collection("users").findOne({ auth0Id: sub });
    const { lastPostDate, getNewPosts } = req.body;

    const posts = await db
      .collection("posts")
      .find({
        userId: userProfile._id,
        created: { [getNewPosts ? "$gt" : "$lt"]: new Date(lastPostDate) },
      })
      .limit(getNewPosts ? 0 : 5)
      .sort({ created: -1 })
      .toArray();

    res.status(200).json(posts);
    return;
  } catch (e) {
    console.log("ERROR trying to get the posts : ", e);
  }
});
