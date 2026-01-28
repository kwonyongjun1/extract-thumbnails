// import MediaPlayer from "./components/MediaPlayer"
// import YouTubeLikePlayer from "./components/YouTubeLikePlayer"

import YouTubeFilmstripPlayer from "./components/YouTubeFilmstripPlayer"

function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', gap: '20px', height: '100%' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* <MediaPlayer src="/gladiator.mkv" /> */}
          {/* <YouTubeLikePlayer /> */}
          <YouTubeFilmstripPlayer />
        </div>
        <div >
          <div style={{ width: '600px' }}>
            list
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
