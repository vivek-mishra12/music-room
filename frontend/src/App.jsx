import { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [roomState, setRoomState] = useState(null);

  const playerRef = useRef(null);

  useEffect(() => {
    socket.on("video-changed", (id) => {
      setVideoId(id);
    });

    socket.on("room-state", (data) => {
      console.log("Room State:", data);

      setRoomState(data);

      if (data.videoId) {
        setVideoId(data.videoId);
      }
    });

    socket.on("play", () => {
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    });

    socket.on("pause", () => {
      if (playerRef.current) {
        playerRef.current.pauseVideo();
      }
    });

    return () => {
      socket.off("video-changed");
      socket.off("room-state");
      socket.off("play");
      socket.off("pause");
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        playerRef.current &&
        roomId &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        socket.emit("time-update", {
          roomId,
          currentTime: playerRef.current.getCurrentTime(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId]);

  const joinRoom = () => {
    if (!roomId) {
      alert("Enter Room ID");
      return;
    }

    socket.emit("join-room", roomId);

    alert("Joined Room");
  };

  const extractVideoId = () => {
    let id = "";

    try {
      const url = new URL(videoUrl);

      if (url.hostname.includes("youtube.com")) {
        id = url.searchParams.get("v");
      }

      if (url.hostname.includes("youtu.be")) {
        id = url.pathname.slice(1);
      }
    } catch {
      alert("Invalid URL");
      return;
    }

    if (!id) {
      alert("Invalid Youtube URL");
      return;
    }

    setVideoId(id);

    socket.emit("change-video", {
      roomId,
      videoId: id,
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🎵 Sync Room</h1>

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <button onClick={joinRoom}>
        Join
      </button>

      <br />
      <br />

      <input
        placeholder="Youtube URL"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />

      <button onClick={extractVideoId}>
        Load Video
      </button>

      <br />
      <br />

      {videoId && (
        <>
          <YouTube
            videoId={videoId}
            onReady={(event) => {
              playerRef.current = event.target;

              if (
                roomState &&
                roomState.currentTime > 0
              ) {
                playerRef.current.seekTo(
                  roomState.currentTime,
                  true
                );

                if (roomState.isPlaying) {
                  playerRef.current.playVideo();
                }
              }
            }}
          />

          <br />

          <button
            onClick={() => socket.emit("play", roomId)}
          >
            Play
          </button>

          <button
            onClick={() => socket.emit("pause", roomId)}
          >
            Pause
          </button>
        </>
      )}
    </div>
  );
}

export default App;