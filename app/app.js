const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const {
  getAllVideos,
  saveTranscript,
  selectVideosFragments,
  trimVideos,
  mergeVideos,
} = require("./utils");
require("dotenv").config();

const PORT = process.env.PORT || 5050;

const settings = {
  produceImmediately: true,
  finalVideoName:
    "2) FULL 02.10.2021 Buschcraft z Jasiem na działce w bolesławcu",
};

const myStart = () => {
  start(settings);
};

const start = async (settings) => {
  const videos = await getAllVideos("videos");
  const videosWithFragments = selectVideosFragments(videos);

  if (settings.produceImmediately) {
    const videosToMerge = await trimVideos(videosWithFragments);
    // console.log("działa", videos, videosWithFragments, videosToMerge);
    const result = await mergeVideos(videosToMerge, settings.finalVideoName);
    console.log("Wideo Gotowe => ", result);
  } else {
    console.log(
      "Change settings.produceImmediately to TRUE to trim and produce videos"
    );
  }

  return videosWithFragments;
};

// SERVER
app.use(express.static("videos"));
app.use(bodyParser.json());
app.use(cors());

app.get("/", async (req, res) => {
  const videos = await start(false);
  console.log(4444444444);
  res.send({ videos });
});

app.post("/transcript", (req, res) => {
  console.log(req.body);
  const { fileName, transcript } = req.body;
  saveTranscript(fileName, transcript);
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});

module.exports = { myStart };
