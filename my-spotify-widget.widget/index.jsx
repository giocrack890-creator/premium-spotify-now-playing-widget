import { css, run } from "uebersicht"

export const refreshFrequency = 1000

export const className = css`
  top: 100px;
  left: 372px;
  position: absolute;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  color: white;
  z-index: 9999;
  user-select: none;
`

export const command = `
osascript <<'EOF'
if application "Spotify" is running then
  tell application "Spotify"
    try
      set currentState to player state as string
      if currentState is "playing" or currentState is "paused" then
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set artworkUrl to artwork url of current track
        set trackDuration to duration of current track
        set playerPos to player position
        return "OK||" & trackName & "||" & artistName & "||" & albumName & "||" & artworkUrl & "||" & currentState & "||" & trackDuration & "||" & playerPos
      else
        return "NOT_PLAYING"
      end if
    on error
      return "NOT_PLAYING"
    end try
  end tell
else
  return "SPOTIFY_CLOSED"
end if
EOF
`

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const rgb = (c, a = 1) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`

const darken = (c, amount = 0.2) => ({
    r: clamp(Math.round(c.r * (1 - amount)), 0, 255),
    g: clamp(Math.round(c.g * (1 - amount)), 0, 255),
    b: clamp(Math.round(c.b * (1 - amount)), 0, 255),
})

const lighten = (c, amount = 0.2) => ({
    r: clamp(Math.round(c.r + (255 - c.r) * amount), 0, 255),
    g: clamp(Math.round(c.g + (255 - c.g) * amount), 0, 255),
    b: clamp(Math.round(c.b + (255 - c.b) * amount), 0, 255),
})

const hashString = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
        hash |= 0
    }
    return Math.abs(hash)
}

const colorFromArtwork = (artwork) => {
    if (!artwork) return { r: 56, g: 74, b: 64 }

    const h = hashString(artwork)

    const palettes = [
        { r: 158, g: 64, b: 64 },
        { r: 201, g: 116, b: 44 },
        { r: 174, g: 145, b: 46 },
        { r: 74, g: 132, b: 84 },
        { r: 61, g: 108, b: 156 },
        { r: 97, g: 78, b: 155 },
        { r: 133, g: 66, b: 114 },
        { r: 96, g: 96, b: 96 },
    ]

    return palettes[h % palettes.length]
}

const formatTime = (ms) => {
    if (!ms || Number.isNaN(ms)) return "0:00"
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, "0")}`
}

const openSpotify = (e) => {
    if (e) e.stopPropagation()
    run(`open -a Spotify`)
}

const playPause = (e) => {
    e.stopPropagation()
    run(`osascript -e 'tell application "Spotify" to playpause'`)
}

const nextTrack = (e) => {
    e.stopPropagation()
    run(`osascript -e 'tell application "Spotify" to next track'`)
}

const previousTrack = (e) => {
    e.stopPropagation()
    run(`osascript -e 'tell application "Spotify" to previous track'`)
}

const seekTo = (e, durationMs) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const seconds = Math.floor((durationMs / 1000) * ratio)
    run(`osascript -e 'tell application "Spotify" to set player position to ${seconds}'`)
}

const Equalizer = ({ playing, color }) => {
    const bar = (height, delay) => ({
        ...eqBarStyle,
        height,
        background: `linear-gradient(180deg, ${rgb(lighten(color, 0.36), 0.98)} 0%, ${rgb(lighten(color, 0.14), 0.76)} 100%)`,
        animationPlayState: playing ? "running" : "paused",
        animationDelay: delay,
    })

    return (
        <div style={eqWrapStyle}>
            <div style={bar("9px", "0s")} />
            <div style={bar("15px", "0.12s")} />
            <div style={bar("11px", "0.24s")} />
        </div>
    )
}

export const render = ({ output }) => {
    if (!output) {
        return (
            <div style={widgetStyle}>
                <style>{globalStyles}</style>
                <div style={loadingCardStyle}>
                    <div style={placeholderArt}></div>
                    <div style={contentStyle}>
                        <div style={eyebrowRowStyle}>
                            <div style={eyebrowStyle}>NOW PLAYING</div>
                        </div>
                        <div style={trackStyle}>Loading...</div>
                        <div style={artistStyle}>Buscando Spotify</div>
                    </div>
                </div>
            </div>
        )
    }

    if (output.includes("SPOTIFY_CLOSED")) {
        return (
            <div style={widgetStyle} onClick={openSpotify}>
                <style>{globalStyles}</style>
                <div style={fallbackCardStyle}>
                    <div style={placeholderArt}></div>
                    <div style={contentStyle}>
                        <div style={eyebrowRowStyle}>
                            <div style={eyebrowStyle}>SPOTIFY</div>
                        </div>
                        <div style={trackStyle}>Spotify cerrado</div>
                        <div style={artistStyle}>Click para abrir</div>
                    </div>
                </div>
            </div>
        )
    }

    if (output.includes("NOT_PLAYING")) {
        return (
            <div style={widgetStyle} onClick={openSpotify}>
                <style>{globalStyles}</style>
                <div style={fallbackCardStyle}>
                    <div style={placeholderArt}></div>

                    <div style={contentStyle}>
                        <div style={eyebrowRowStyle}>
                            <div style={eyebrowStyle}>SPOTIFY</div>
                        </div>

                        <div style={trackStyle}>Nada sonando</div>
                        <div style={artistStyle}>Listo para arrancar</div>

                        <div style={fallbackControlsRowStyle}>
                            <div style={controlsCompactCenteredStyle}>
                                <button style={buttonStyle} onClick={previousTrack}>⏮</button>
                                <button style={buttonStyle} onClick={playPause}>▶</button>
                                <button style={buttonStyle} onClick={nextTrack}>⏭</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const parts = output.trim().split("||")

    const track = parts[1] || ""
    const artist = parts[2] || ""
    const album = parts[3] || ""
    const artwork = parts[4] || ""
    const state = parts[5] || ""
    const durationMs = parseInt(parts[6] || "0", 10)
    const positionMs = Math.floor((parseFloat(parts[7] || "0") || 0) * 1000)

    const progress = durationMs > 0 ? Math.min((positionMs / durationMs) * 100, 100) : 0
    const isPlaying = state === "playing"

    const dominant = colorFromArtwork(artwork)
    const deep = darken(dominant, 0.86)
    const mid = darken(dominant, 0.7)
    const glow = lighten(dominant, 0.1)
    const edge = lighten(dominant, 0.18)
    const soft = lighten(dominant, 0.28)

    const cardStyle = {
        ...baseCardStyle,
        background: `
      linear-gradient(145deg,
        ${rgb(deep, 0.97)} 0%,
        ${rgb(mid, 0.9)} 56%,
        rgba(10,11,14,0.9) 100%)
    `,
        border: `1px solid ${rgb(edge, 0.12)}`,
        boxShadow: `0 22px 52px rgba(0,0,0,0.34), 0 0 34px ${rgb(glow, 0.08)}`,
        opacity: isPlaying ? 1 : 0.95,
    }

    const blurStyle = {
        ...backdropArtStyle,
        backgroundImage: artwork ? `url("${artwork}")` : "none",
        filter: isPlaying
            ? "blur(56px) saturate(1.4) brightness(0.7)"
            : "blur(56px) saturate(0.88) brightness(0.52) grayscale(0.2)",
    }

    const overlayStyle = {
        ...overlayBaseStyle,
        background: `
      radial-gradient(circle at 15% 12%, ${rgb(soft, 0.1)} 0%, transparent 30%),
      linear-gradient(145deg, ${rgb(deep, 0.2)} 0%, rgba(6,8,10,0.46) 100%)
    `,
    }

    const progressStyle = {
        ...progressFillStyle,
        width: `${progress}%`,
        background: `linear-gradient(90deg, rgba(255,255,255,0.96), ${rgb(lighten(dominant, 0.34), 0.9)})`,
        boxShadow: `0 0 12px ${rgb(lighten(dominant, 0.28), 0.18)}`,
    }

    const dynamicButton = {
        ...buttonStyle,
        background: `linear-gradient(180deg, ${rgb(lighten(dominant, 0.08), 0.16)} 0%, rgba(255,255,255,0.045) 100%)`,
        border: `1px solid ${rgb(lighten(dominant, 0.16), 0.07)}`,
        boxShadow: `0 6px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.07)`,
    }

    const artDynamicStyle = {
        ...artStyle,
        border: `1px solid ${rgb(edge, 0.1)}`,
        filter: isPlaying ? "none" : "saturate(0.84) brightness(0.95)",
    }

    return (
        <div style={widgetStyle} onClick={openSpotify}>
            <style>{globalStyles}</style>

            <div style={cardStyle}>
                <div style={blurStyle}></div>
                <div style={overlayStyle}></div>

                <div style={innerStyle}>
                    {artwork ? (
                        <img src={artwork} style={artDynamicStyle} />
                    ) : (
                        <div style={placeholderArt}></div>
                    )}

                    <div style={contentStyle}>
                        <div style={eyebrowRowStyle}>
                            <div style={eyebrowStyle}>NOW PLAYING</div>

                            <div style={spotifyMiniStyle}>
                                <div style={spotifyDotStyle}></div>
                            </div>
                        </div>

                        <div style={trackStyle}>{track}</div>
                        <div style={artistStyle}>{artist}</div>
                        <div style={albumStyle}>{album}</div>

                        <div style={progressBlockStyle}>
                            <div style={progressWrapStyle} onClick={(e) => seekTo(e, durationMs)}>
                                <div style={progressBgStyle}>
                                    <div style={progressStyle}></div>
                                </div>
                            </div>

                            <div style={timeRowStyle}>
                                <span>{formatTime(positionMs)}</span>
                                <span>{formatTime(durationMs)}</span>
                            </div>
                        </div>

                        <div style={controlsSectionStyle}>
                            <div style={equalizerRowStyle}>
                                <Equalizer playing={isPlaying} color={dominant} />
                            </div>

                            <div style={controlsRowStyle}>
                                <div style={controlsCompactCenteredStyle}>
                                    <button style={dynamicButton} onClick={previousTrack}>⏮</button>
                                    <button style={dynamicButton} onClick={playPause}>
                                        {isPlaying ? "⏸" : "▶"}
                                    </button>
                                    <button style={dynamicButton} onClick={nextTrack}>⏭</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const globalStyles = `
  @keyframes eqPulse {
    0% { transform: scaleY(0.45); opacity: 0.55; }
    25% { transform: scaleY(1); opacity: 1; }
    50% { transform: scaleY(0.68); opacity: 0.82; }
    75% { transform: scaleY(0.92); opacity: 0.94; }
    100% { transform: scaleY(0.45); opacity: 0.55; }
  }

  button:hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
  }

  button {
    transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
  }
`

const widgetStyle = {
    width: "356px",
    cursor: "pointer",
}

const baseCardStyle = {
    position: "relative",
    overflow: "hidden",
    borderRadius: "28px",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
}

const loadingCardStyle = {
    ...baseCardStyle,
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "18px",
    background: "linear-gradient(145deg, rgba(32,36,40,0.96) 0%, rgba(18,20,24,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 22px 52px rgba(0,0,0,0.34)",
}

const fallbackCardStyle = {
    ...baseCardStyle,
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "18px",
    background: "linear-gradient(145deg, rgba(30,34,38,0.96) 0%, rgba(16,18,22,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 22px 52px rgba(0,0,0,0.34)",
}

const backdropArtStyle = {
    position: "absolute",
    inset: "-44px",
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.38)",
    opacity: 0.76,
}

const overlayBaseStyle = {
    position: "absolute",
    inset: 0,
}

const innerStyle = {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "18px",
}

const artStyle = {
    width: "92px",
    height: "92px",
    borderRadius: "20px",
    objectFit: "cover",
    flexShrink: 0,
    boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
}

const placeholderArt = {
    width: "92px",
    height: "92px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.08)",
    flexShrink: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
}

const contentStyle = {
    flex: 1,
    minWidth: 0,
}

const eyebrowRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
}

const eyebrowStyle = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
}

const spotifyMiniStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    height: "16px",
    flexShrink: 0,
}

const spotifyDotStyle = {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    background: "rgba(30, 215, 96, 0.95)",
    boxShadow: "0 0 10px rgba(30, 215, 96, 0.28)",
}

const trackStyle = {
    fontSize: "18px",
    fontWeight: 780,
    color: "rgba(255,255,255,0.98)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    letterSpacing: "-0.025em",
    lineHeight: 1.12,
}

const artistStyle = {
    marginTop: "4px",
    fontSize: "13px",
    color: "rgba(255,255,255,0.86)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}

const albumStyle = {
    marginTop: "2px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.48)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
}

const progressBlockStyle = {
    marginTop: "12px",
}

const progressWrapStyle = {
    cursor: "pointer",
}

const progressBgStyle = {
    width: "100%",
    height: "8px",
    background: "rgba(255,255,255,0.12)",
    borderRadius: "999px",
    overflow: "hidden",
    boxShadow: "inset 0 1px 1px rgba(0,0,0,0.18)",
}

const progressFillStyle = {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.25s linear",
}

const timeRowStyle = {
    marginTop: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "10.5px",
    color: "rgba(255,255,255,0.42)",
    letterSpacing: "0.01em",
}

const controlsSectionStyle = {
    marginTop: "12px",
}

const equalizerRowStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
}

const controlsRowStyle = {
    marginTop: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
}

const fallbackControlsRowStyle = {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
}

const eqWrapStyle = {
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
    width: "16px",
    height: "16px",
    flexShrink: 0,
}

const eqBarStyle = {
    width: "3px",
    borderRadius: "999px",
    transformOrigin: "bottom center",
    animation: "eqPulse 0.9s ease-in-out infinite",
}

const controlsCompactCenteredStyle = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
}

const buttonStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    outline: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
}