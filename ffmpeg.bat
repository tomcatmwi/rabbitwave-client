rem create concatenated soundtrack
..\ffmpeg\ffmpeg.exe -f concat -i ./concatfile.txt -ac 2 -vn -y concat_audio.wav

rem merge video with new soundtrack
..\ffmpeg\ffmpeg -i video.webm -i concat_audio.webm -c copy -map 0:v:0 -map 1:a:0 -y video_final.webm

rem convert video track to mp4 - bugzik
..\ffmpeg\ffmpeg.exe -i video_video.webm -crf 0 -movflags faststart -y video_video.mp4

rem produce final
..\ffmpeg\ffmpeg.exe -i video_video.webm -i concat_audio.wav -map 0:v:0 -map 1:a:0 -crf 0 -movflags faststart -y video_final.mp4
