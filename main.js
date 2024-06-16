const youtubedl = require("youtube-dl-exec");
const ffmpegPath = require("ffmpeg-static");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function downloadYouTubeVideo(url) {
  try {
    const outputDir = process.cwd();
    const downloadsDir = path.join(outputDir, "downloads");

    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Fetch video information
    console.log("Fetching video information...");
    const info = await youtubedl(url, {
      dumpSingleJson: true,
    });

    const videoTitle = info.title.replace(/[\/:*?"<>|]/g, ""); // Sanitize the title for use as a filename
    const videoPath = path.join(outputDir, `${videoTitle}.mp4`);
    const audioPath = path.join(downloadsDir, `${videoTitle}.mp3`);

    // Download the video using youtube-dl
    console.log("Downloading video...");
    let downloadProgress = 0;
    const downloadInterval = setInterval(function () {
      process.stdout.write(`Download progress: ${downloadProgress}%\r`);
    }, 1000);

    await youtubedl(url, {
      output: videoPath,
      ffmpegLocation: ffmpegPath,
      format: "mp4",
      progress: function (progress) {
        downloadProgress = progress.percent.toFixed(2);
      },
    });

    clearInterval(downloadInterval);
    process.stdout.write("Download progress: 100%\n");

    // Ensure the video file exists before attempting conversion
    if (!fs.existsSync(videoPath)) {
      console.error("Error: Video file was not downloaded successfully.");
      return;
    }

    // Convert video to mp3 using ffmpeg
    console.log("Converting video to MP3...");
    let conversionProgress = 0;
    const conversionInterval = setInterval(function () {
      process.stdout.write(`Conversion progress: ${conversionProgress}%\r`);
    }, 1000);

    exec(
      `"${ffmpegPath}" -i "${videoPath}" -q:a 0 -map a "${audioPath}"`,
      function (error, _stdout, _stderr) {
        if (error) {
          console.error(`Error during conversion: ${error.message}`);
          return;
        }
        conversionProgress = 100;
        clearInterval(conversionInterval);
        process.stdout.write("Conversion progress: 100%\n");
        console.log("Conversion complete:", audioPath);

        // Optionally, delete the original video file
        fs.unlink(videoPath, function (err) {
          if (err) {
            console.error(`Error deleting video file: ${err.message}`);
          }
        });
      }
    );
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

rl.question("Enter the YouTube URL: ", function (url) {
  downloadYouTubeVideo(url);
  rl.close();
});
