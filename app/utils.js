const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const _ = require("lodash");

const rnd = (min = 0, max = 1) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const selectVideosFragments = (videos) => videos.map((v) => findFragments(v));

const findFragments = (videoObj) => {
  const { fileName, width } = videoObj;
  const procent = +process.env.FRAGMENTDURATIONPROCENT;
  const margin = +process.env.FRAGMENTDURATIONPROCENTMARGIN;

  const { duration, transcriptDetected, transcript } = videoObj;
  const fragments = []; // I calculate video fragments to take from videos, there cam be multiple fragments

  let start = 0;
  let end = duration;
  let fragmentDuration = duration;

  const newDuration = duration * ((procent + Math.random() * margin) * 0.01);

  if (transcriptDetected) {
    // get video fragments based on transcript
    for (const part of transcript) {
      start = part.timestamp;
      end = part.timestamp + 1;
    }
  } else {
    // get fragment based on procent
    console.log(`I take ${procent}% from ${fileName} + ${margin}% margin`);
    start = duration / 2 - newDuration / 2;
    end = duration / 2 + newDuration / 2;
    fragmentDuration = end - start;
  }

  start = parseFloat(start.toFixed(2));
  end = parseFloat(end.toFixed(2));
  fragmentDuration = parseFloat(fragmentDuration.toFixed(2));

  const fragmentName = mp4(`${noExt(fileName)}-${start}-${end}-${width}`);
  fragments.push({
    start,
    end,
    fragmentDuration,
    fragmentName,
    videoName: fileName,
  });

  const mergedFragments = fragments.map((fragment, index, allframgents) => {
    // console.log(444444444, fragment.start, allframgents[index + 1]?.start);
    // TO IMPLEMENT
    return fragment;
  });
  return { ...videoObj, fragments: mergedFragments };
};

const getAllVideos = async (folderName) => {
  fs.ensureDirSync(folderName);
  const files = fs.readdirSync(folderName);
  const videos = [];
  for (const fileName of files) {
    if (isMp4(fileName)) {
      const { duration, creation_time } = await getVideoMetadata(fileName);

      const transcriptDetected = fs.existsSync(
        path.resolve(folderName, json(fileName))
      );

      const transcript = [];
      if (transcriptDetected) {
        // read transcript from file at this point
      }

      videos.push({
        width: process.env.WIDTH,
        fileName,
        duration,
        creation_time,
        transcriptDetected,
        transcript,
      });
    }
  }

  const orderedVideos = _.orderBy(videos, ["creation_time"]);
  return orderedVideos;
};

const mp3 = (fileName) => `${path.parse(fileName).name}.mp3`;
const mp4 = (fileName) => `${path.parse(fileName).name}.mp4`;
const json = (fileName) => `${path.parse(fileName).name}.json`;
const noExt = (fileName) => path.parse(fileName).name;

// fn = fileName
const isMp3 = (fn) => path.parse(fn).ext.toLocaleLowerCase() === ".mp3";
const isMp4 = (fn) => path.parse(fn).ext.toLocaleLowerCase() === ".mp4";
const isJson = (fn) => path.parse(fn).ext.toLocaleLowerCase() === ".json";

const isVideo = (fileName) => {
  console.log(fileName.toLocaleLowerCase().includes(".mp4"));
  return fileName.toLocaleLowerCase().includes(".mp4");
};

const mergeVideos = (videosToMerge, _resultVideoName) => {
  const resultVideoName = `${_resultVideoName}-${process.env.WIDTH}.mp4`;
  // console.log("videosToMerge => ", videosToMerge);

  return new Promise((resolve, reject) => {
    fs.ensureDirSync(path.resolve("videos", "result"));
    const fileOutput = path.resolve("videos", "result", resultVideoName);

    // if (fs.existsSync(fileOutput)) {
    //   console.log("FILE IS ALLREADY THERE ", fileOutput);
    //   resolve(resultVideoName);
    //   return;
    // }

    const videos = videosToMerge.map((video) =>
      path.resolve("videos", "temp", video)
    );

    let mergedVideos = ffmpeg();
    videos.forEach((video) => {
      mergedVideos = mergedVideos.addInput(video);
    });

    // await concat({
    //   output: "test.mp4",
    //   videos,
    //   transition: {
    //     name: "directionalWipe",
    //     duration: 500,
    //   },
    // });

    mergedVideos
      .mergeToFile(fileOutput)
      .on("error", (err) => {
        console.log("error!", err);
        reject();
      })
      .on("end", () => {
        console.log("Ended!");
        resolve(resultVideoName);
      })
      .on("progress", (progress) =>
        console.log(Math.floor(progress.percent) + "%")
      );
  });
};

const trimVideo = (videoName, start, end, fragmentName) => {
  return new Promise((resolve, reject) => {
    // console.log(1, id, name, start, end);
    const endMinusStart = end - start;
    const fileInput = path.resolve("videos", videoName);

    fs.ensureDirSync(path.resolve("videos", "temp"));
    const fileOutput = path.resolve("videos", "temp", fragmentName);

    // check if fileOutput is allready produced
    // if (fs.existsSync(fileOutput)) {
    //   console.log("FILE IS ALLREADY THERE ", fileOutput);
    //   resolve(fragmentName);
    //   return;
    // }

    ffmpeg.ffprobe(fileInput, (err, metaData) => {
      if (err) return console.log("error_2", err);
      // const { duration } = metaData.format;

      fs.ensureDirSync(path.resolve("videos", "myTemp"));
      const temp = path.resolve("videos", "myTemp");

      ffmpeg()
        .input(fileInput, temp)
        .inputOptions([`-ss ${start}`])
        .outputOptions([`-t ${endMinusStart}`])
        // .noAudio()
        // .outputOptions([
        //   "-filter:v scale=w=3000:h=2000,drawtext=text='watermarkText':x=W-150:y=H-th-10:fontsize=32:fontcolor=white",
        //   "-crf 10",
        // ])
        // .outputOptions([
        //   "-filter:v zoompan=z='if(lte(mod(time,10),3),2,1)':d=1:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):fps=29.97",
        // ])
        // .outputOptions([
        //   "-filter:v zoompan=d=1:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)",
        // ])
        .output(fileOutput)
        .on("end", () => {
          console.log("done");
          resolve(fragmentName);
        })
        .on("error", (err) => {
          console.log("error!", err);
          reject();
        })
        .on("progress", (progress) =>
          console.log(Math.floor(progress.percent) + "%")
        )
        // .videoCodec("libx264")
        // .videoBitrate(1000)
        .fps(29.97)
        // .noAudio()
        .size(`${process.env.WIDTH}x?`)
        // .videoFilters("fade=in:0:30")
        // .videoFilters("fade=in:0:30", "pad=640:480:0:40:violet")
        .run();
    });
  });
};

const trimVideos = async (videos) => {
  const fragments = [];
  const videosToMerge = [];

  videos.forEach((v) => {
    v.fragments.forEach((item) => {
      fragments.push(item);
    });
  });

  for (const fragment of fragments) {
    const { videoName, start, end, fragmentName } = fragment;
    const trimedVideoName = await trimVideo(
      videoName,
      start,
      end,
      fragmentName
    );
    videosToMerge.push(trimedVideoName);
  }

  return videosToMerge;
};

const selectVideoFragments1 = (videoObj) => {
  const { fileName, width } = videoObj;
  const newDuration = process.env.FRAGMENTDURATION;
  const { duration, transcriptDetected, transcript } = videoObj;
  const fragments = []; // I calculate video fragments to take from videos, there cam be multiple fragments
  // console.log(duration, newDuration);

  let start = 0;
  let end = duration;
  let fragmentDuration = duration;

  if (transcriptDetected) {
    // get video fragments based on transcript
    for (const part of transcript) {
      const time = part.timestamp;
      fragments.push({ start: time, end: time + 1 });
    }
  } else {
    // get random fragment of the wideo without transcript === there is nothing spoken in the wideo
    start = duration / 2 - newDuration / 2;
    end = duration / 2 + newDuration / 2;
    if (newDuration >= duration) {
      start = 1;
      end = duration - 1;
    }
    if (duration < 3) {
      start = 0;
      end = duration;
    }
    fragmentDuration = end - start;
  }

  start = parseFloat(start.toFixed(2));
  end = parseFloat(end.toFixed(2));
  fragmentDuration = parseFloat(duration.toFixed(2));

  const fragmentName = `${fileName}-${start}-${end}-${width}.mp4`;
  fragments.push({
    start,
    end,
    fragmentDuration,
    fragmentName,
    videoName: fileName,
  });

  const mergedFragments = fragments.map((fragment, index, allframgents) => {
    // console.log(444444444, fragment.start, allframgents[index + 1]?.start);
    // TO IMPLEMENT
    return fragment;
  });
  return { ...videoObj, fragments: mergedFragments };
};

const saveTranscript = (fileName, transcript) => {
  const folder = path.resolve("videos");
  fs.writeFileSync(
    path.resolve(folder, json(fileName)),
    JSON.stringify({ transcript })
  );
};

const myReadSync = (fileName) => {
  fs.ensureDirSync(path.resolve("videos"));
  const file = path.resolve("videos", fileName);

  const data = fs.readFileSync(file, { encoding: "utf8" });

  return JSON.parse(data);
};

const getVideoMetadata = async (videoName) => {
  return new Promise((res, rej) => {
    const videoPath = path.resolve("videos", videoName);
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.log(960, videoName, err);
        rej({ duration: null, creation_time: null });
      }
      // console.log(44444444, metadata.format);
      const { duration } = metadata.format;
      const { creation_time } = metadata.format.tags;
      res({ duration, creation_time });
    });
  });
};

module.exports = {
  selectVideosFragments,
  getAllVideos,
  getVideoMetadata,
  saveTranscript,
  trimVideos,
  mergeVideos,
};
