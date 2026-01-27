import MediaPlayer from "./components/MediaPlayer"

function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', gap: '20px', height: '100%' }}>
        <div style={{ width: '100%', alignSelf: 'center' }}>
          <MediaPlayer src="/sample2.mp4" />
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
