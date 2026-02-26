let ws = null
let debounceTimer = null
let reconnectDelay = 2000

export function initPreview() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${protocol}://${location.host}/ws/preview`)

  ws.onopen = () => {
    reconnectDelay = 2000 // reset backoff on successful connect
  }

  ws.onmessage = (event) => {
    const frame = document.getElementById('preview-frame')
    frame.srcdoc = event.data
  }

  ws.onclose = () => {
    setTimeout(initPreview, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30000) // exponential backoff, max 30s
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
