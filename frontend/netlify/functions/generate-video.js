const axios = require("axios");

exports.handler = async function (event, context) {
  try {
    const { script } = JSON.parse(event.body);

    const response = await axios.post(
      "https://api.featherless.ai/v1/generate", // replace with real endpoint
      {
        script: script,
        avatar: "default"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        videoUrl: response.data.video_url
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Video generation failed" })
    };
  }
};