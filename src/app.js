const terminal = document.getElementById('terminal')
const cursorLine = document.getElementById('cursor-line')
const runButton = document.getElementById('run-demo')
const copyButton = document.getElementById('copy-command')
const copyStatus = document.getElementById('copy-status')
const installCommand = document.getElementById('install-command')

const demoLines = [
  { html: '<span class="prompt">$</span> open_binary <span class="arg">./targets/notes.app</span>' },
  { html: 'provider ghidra / profile headless / private database', className: 'muted' },
  { html: '[ok] opened / entry 0x100004a20 / 2,418 symbols', className: 'ok' },
  { html: '<span class="prompt">&gt;</span> analyze_function <span class="arg">--address 0x100004a20</span>' },
  { html: 'pseudocode reconstructed / 96% confidence / calls 4 imports', className: 'muted' },
  { html: '[ok] evidence EVD-8b21 retained', className: 'ok' },
  { html: '<span class="prompt">&gt;</span> trace_application_feature <span class="arg">--seed license-check</span>' },
  { html: '14 modules / 3 call paths / 1 unresolved import', className: 'muted' },
  { html: '[ok] report ready / observations, inferences, unknowns separated', className: 'ok' }
]

let running = false

function appendLine({ html, className }) {
  const line = document.createElement('p')
  if (className) line.className = className
  line.innerHTML = html
  terminal.insertBefore(line, cursorLine)
  terminal.scrollTop = terminal.scrollHeight
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runDemo() {
  if (running) return
  running = true

  const original = runButton.innerHTML
  runButton.disabled = true
  runButton.textContent = 'Analyzing...'
  terminal.setAttribute('aria-busy', 'true')

  for (const line of demoLines) {
    await wait(280)
    appendLine(line)
  }

  terminal.setAttribute('aria-busy', 'false')
  runButton.disabled = false
  runButton.innerHTML = original
  running = false
}

async function copyCommand() {
  const text = installCommand.textContent.trim()

  try {
    await navigator.clipboard.writeText(text)
    copyStatus.textContent = 'Copied to clipboard.'
  } catch {
    copyStatus.textContent = 'Copy unavailable. Select the command manually.'
  }

  window.setTimeout(() => {
    copyStatus.textContent = ''
  }, 2600)
}

runButton.addEventListener('click', runDemo)
copyButton.addEventListener('click', copyCommand)

document.body.dataset.enhanced = 'true'
