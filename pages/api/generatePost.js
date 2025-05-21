import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { OpenAIApi, Configuration } from "openai";
import clientPromise from "../../lib/mongodb";

export default withApiAuthRequired(async function handler(req, res) {
  const { user } = await getSession(req, res);
  const client = await clientPromise;
  const db = await client.db("BlogStandard");

  const userProfile = await db
    .collection("users")
    .findOne({ auth0Id: user.sub });
  if (!userProfile?.availableTokens) {
    res.status(403);
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(config);

  try {
    const { topic, keywords } = req.body;

    if (!topic || !keywords) {
      res.status(422);
      return;
    }

    if (topic.length > 80 || !keywords.length > 80) {
      res.status(422);
      return;
    }

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an SEO friendly generator called BlogStandard. You are designed to output markdown without frontmatter.",
        },
        {
          role: "user",
          content: `Generate me a long and detailed SEO-friendly blog post on the following topic:
        ---
        ${topic}
        ---
        Targeting these keywords:
        ---
        ${keywords}
        ---`,
        },
      ],
    });

    const postContent = await response.data.choices[0]?.message?.content;
    const seoResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an SEO friendly generator called BlogStandard. You are designed to output JSON. Do not include HTML tags in your output.",
        },
        {
          role: "user",
          content: `Generate an SEO friendly title and SEO friendly meta description for the following blog post. 
          ${postContent}
          ---
          The output JSON must be in the following format:
          {
          "title" : "example title",
          "metaDescription" : "example meta description"
          }`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const { title, metaDescription } =
      JSON.parse(seoResponse.data.choices[0]?.message?.content) || {};

    console.log(
      "seoResponse.data.choices[0]?.message?.content >>> ",
      seoResponse.data.choices[0]?.message?.content
    );
    await db.collection("users").updateOne(
      { auth0Id: user.sub },
      {
        $inc: {
          availableTokens: -1,
        },
      }
    );

    const post = await db.collection("posts").insertOne({
      postContent,
      title: title,
      metaDescription: metaDescription,
      topic,
      keywords,
      userId: userProfile._id,
      created: new Date(),
    });
    console.log("POST :::: ", post);
    res.status(200).json({ postId: post.insertedId });
  } catch (error) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate post." });
  }
});
