const express = require("express");
const app = express();
const fs = require("fs-extra");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
  getAllVideos,
  saveTranscript,
  selectVideosFragments,
  trimVideos,
  mergeVideos,
  getFolders,
} = require("./utils");
require("dotenv").config();

const PORT = process.env.PORT || 5050;

const settings = {
  produceImmediately: true,
  baseVideoFolder: "videos",
};

const start = async (settings) => {
  const { baseVideoFolder, produceImmediately } = settings;

  fs.ensureDirSync(baseVideoFolder);
  const foldersList = getFolders(baseVideoFolder, ["myTemp", "result", "temp"]);

  const folderWithVideos = foldersList[0];

  const videos = await getAllVideos(baseVideoFolder, folderWithVideos);

  const videosWithFragments = selectVideosFragments(videos);

  if (produceImmediately) {
    const videosToMerge = await trimVideos(
      folderWithVideos,
      videosWithFragments
    );
    // console.log("działa", videos, videosWithFragments, videosToMerge);
    const result = await mergeVideos(videosToMerge, folderWithVideos);
    console.log("Wideo Gotowe => ", result);
  } else {
    console.log(
      "Change settings.produceImmediately to TRUE to trim and produce videos"
    );
  }

  return videosWithFragments;
};

const myStart = () => start(settings);

// SERVER
app.use(express.static("videos"));
app.use(bodyParser.json());
app.use(cors());

app.get("/", async (req, res) => {
  const videos = await start(settings);
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
