import { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import axios from "axios";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [roomState, setRoomState] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);

  const [queue, setQueue] = useState([]);

  const playerRef = useRef(null);

  useEffect(() => {
    socket.on("video-changed", (id) => {
      setVideoId(id);
    });

    socket.on("room-state", (data) => {
      setRoomState(data);

      if (data.videoId) {
        setVideoId(data.videoId);
      }

      if (data.queue) {
        setQueue(data.queue);
      }
    });

    socket.on("queue-updated", (newQueue) => {
      setQueue(newQueue);
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
      socket.off("queue-updated");
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
          currentTime:
            playerRef.current.getCurrentTime(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId]);

  const joinRoom = () => {
    const cleanRoomId = roomId.trim();

    if (!cleanRoomId) {
      alert("Enter Room ID");
      return;
    }

    socket.emit("join-room", cleanRoomId);

    alert(`Joined ${cleanRoomId}`);
  };

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await axios.get(
        "http://localhost:5000/search",
        {
          params: {
            q: searchQuery,
          },
        }
      );

      setResults(res.data);
    } catch (err) {
      console.log(err);
      alert("Search Failed");
    }
  };

  const addSongToQueue = (video) => {
    if (!roomId.trim()) {
      alert("Join a room first");
      return;
    }

    socket.emit("add-to-queue", {
      roomId,
      song: {
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail:
          video.snippet.thumbnails.default.url,
      },
    });
  };

  const playSong = (song) => {
    setVideoId(song.videoId);

    socket.emit("change-video", {
      roomId,
      videoId: song.videoId,
    });
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1000px",
        margin: "auto",
      }}
    >
      <h1>🎵 Sync Room</h1>

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) =>
          setRoomId(e.target.value)
        }
      />

      <button onClick={joinRoom}>
        Join Room
      </button>

      <hr />

      <h2>Search Song</h2>

      <input
        placeholder="Search any song..."
        value={searchQuery}
        onChange={(e) =>
          setSearchQuery(e.target.value)
        }
      />

      <button onClick={searchSongs}>
        Search
      </button>

      <br />
      <br />

      {results.map((video) => (
        <div
          key={video.id.videoId}
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <img
            src={
              video.snippet.thumbnails.default.url
            }
            alt="thumb"
          />

          <div
            style={{
              flex: 1,
            }}
          >
            <p>
              {video.snippet.title}
            </p>

            <small>
              {
                video.snippet.channelTitle
              }
            </small>
          </div>

          <button
            onClick={() =>
              addSongToQueue(video)
            }
          >
            Add To Queue
          </button>
        </div>
      ))}

      <hr />

      <h2>🎶 Shared Queue</h2>

      {queue.length === 0 && (
        <p>No songs in queue</p>
      )}

      {queue.map((song, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <img
            src={song.thumbnail}
            alt="thumb"
          />

          <div
            style={{
              flex: 1,
            }}
          >
            {song.title}
          </div>

          <button
            onClick={() =>
              playSong(song)
            }
          >
            Play
          </button>
        </div>
      ))}

      <hr />

      {videoId && (
        <>
          <YouTube
            videoId={videoId}
            onReady={(event) => {
              playerRef.current =
                event.target;

              if (
                roomState &&
                roomState.currentTime > 0
              ) {
                playerRef.current.seekTo(
                  roomState.currentTime,
                  true
                );

                if (
                  roomState.isPlaying
                ) {
                  playerRef.current.playVideo();
                }
              }
            }}
          />

          <br />

          <button
            onClick={() =>
              socket.emit(
                "play",
                roomId
              )
            }
          >
            ▶ Play
          </button>

          <button
            onClick={() =>
              socket.emit(
                "pause",
                roomId
              )
            }
          >
            ⏸ Pause
          </button>
        </>
      )}
    </div>
  );
}

export default App;