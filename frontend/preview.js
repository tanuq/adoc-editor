let ws = null
let debounceTimer = null

export function initPreview() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${protocol}://${location.host}/ws/preview`)

  ws.onmessage = (event) => {
    const frame = document.getElementById('preview-frame')
    frame.srcdoc = event.data
  }

  ws.onclose = () => {
    setTimeout(initPreview, 2000) // reconnect
  }
}

export function sendPreview(text) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(text)
    }
  }, 300)
}
