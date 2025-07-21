// Variables globales
let canvas
let currentTool = "select"
let currentColor = "#000000"
let currentBrushSize = 3
let selectedElement = null
let zoomLevel = 1
const isMobile = window.innerWidth < 1024

// Funciones para guardar y cargar el tablero
function saveBoard() {
  if (!canvas) return

  try {
    const canvasData = canvas.toJSON()
    localStorage.setItem("eduboard_canvas", JSON.stringify(canvasData))
    showToast("Tablero guardado correctamente", "success")
  } catch (error) {
    console.error("Error al guardar el tablero:", error)
    showToast("Error al guardar el tablero", "error")
  }
}

function loadBoard() {
  if (!canvas) return

  try {
    const savedData = localStorage.getItem("eduboard_canvas")
    if (savedData) {
      canvas.loadFromJSON(JSON.parse(savedData), () => {
        canvas.renderAll()
        showToast("Tablero cargado correctamente", "success")
      })
    } else {
      showToast("No hay tablero guardado", "warning")
    }
  } catch (error) {
    console.error("Error al cargar el tablero:", error)
    showToast("Error al cargar el tablero", "error")
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

// Función principal de inicialización
function initializeApp() {
  try {
    console.log("Iniciando EduBoard Pro...")

    // Verificar que Fabric.js esté cargado
    if (!window.fabric) {
      console.error("Fabric.js no está cargado")
      showErrorMessage("Error: Fabric.js no está disponible")
      return
    }

    initializeCanvas()
    setupEventListeners()
    setupToolbar()
    populateToolSections()
    hideLoadingIndicator()

    console.log("EduBoard Pro inicializado correctamente")
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error)
    showErrorMessage("Error al cargar la aplicación. Por favor, recarga la página.")
  }
}

// Inicializar Canvas con Fabric.js
function initializeCanvas() {
  const canvasElement = document.getElementById("drawingCanvas")
  if (!canvasElement) {
    throw new Error("Elemento canvas no encontrado")
  }

  // Calcular dimensiones del canvas
  const containerWidth = window.innerWidth - (isMobile ? 0 : 288)
  const containerHeight = window.innerHeight - (isMobile ? 136 : 64)

  canvas = new window.fabric.Canvas("drawingCanvas", {
    width: containerWidth,
    height: containerHeight,
    backgroundColor: "white",
    selection: true,
    preserveObjectStacking: true,
    enableRetinaScaling: true,
    allowTouchScrolling: false,
  })

  // Configurar canvas para dibujo libre
  canvas.freeDrawingBrush.width = currentBrushSize
  canvas.freeDrawingBrush.color = currentColor

  // Eventos del canvas
  canvas.on("selection:created", handleObjectSelection)
  canvas.on("selection:updated", handleObjectSelection)
  canvas.on("selection:cleared", clearObjectSelection)
  canvas.on("object:modified", saveCanvasState)
  canvas.on("path:created", saveCanvasState)

  // Redimensionar canvas cuando cambie el tamaño de ventana
  window.addEventListener("resize", debounce(resizeCanvas, 250))
}

// Configurar event listeners
function setupEventListeners() {
  // Controles del toolbar
  const newBoardBtn = document.getElementById("newBoard")
  const saveBoardBtn = document.getElementById("saveBoard")
  const loadBoardBtn = document.getElementById("loadBoard")
  const clearBoardBtn = document.getElementById("clearBoard")

  if (newBoardBtn) newBoardBtn.addEventListener("click", newBoard)
  if (saveBoardBtn) saveBoardBtn.addEventListener("click", saveBoard)
  if (loadBoardBtn) loadBoardBtn.addEventListener("click", loadBoard)
  if (clearBoardBtn) clearBoardBtn.addEventListener("click", clearCanvas)

  // Controles de zoom
  const zoomInBtn = document.getElementById("zoomIn")
  const zoomOutBtn = document.getElementById("zoomOut")
  const resetZoomBtn = document.getElementById("resetZoom")

  if (zoomInBtn) zoomInBtn.addEventListener("click", () => zoomCanvas(1.2))
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => zoomCanvas(0.8))
  if (resetZoomBtn) resetZoomBtn.addEventListener("click", resetZoom)

  // Mobile menu
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  const closeMobileMenuBtn = document.getElementById("closeMobileMenu")
  const mobileMenu = document.getElementById("mobileMenu")

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", showMobileMenu)
  }

  if (closeMobileMenuBtn) {
    closeMobileMenuBtn.addEventListener("click", hideMobileMenu)
  }

  if (mobileMenu) {
    mobileMenu.addEventListener("click", (e) => {
      if (e.target === mobileMenu) {
        hideMobileMenu()
      }
    })
  }

  // Color picker modal
  const mobileColorBtn = document.getElementById("mobileColorBtn")
  const closeColorModalBtn = document.getElementById("closeColorModal")

  if (mobileColorBtn) {
    mobileColorBtn.addEventListener("click", showColorModal)
  }

  if (closeColorModalBtn) {
    closeColorModalBtn.addEventListener("click", hideColorModal)
  }

  // Image upload
  const imageUpload = document.getElementById("imageUpload")
  if (imageUpload) {
    imageUpload.addEventListener("change", handleImageUpload)
  }

  // Table modal
  const createTableBtn = document.getElementById("createTable")
  const cancelTableBtn = document.getElementById("cancelTable")

  if (createTableBtn) createTableBtn.addEventListener("click", createDatabaseTable)
  if (cancelTableBtn) cancelTableBtn.addEventListener("click", hideTableModal)

  // Properties panel
  const closePropertiesPanelBtn = document.getElementById("closePropertiesPanel")
  if (closePropertiesPanelBtn) {
    closePropertiesPanelBtn.addEventListener("click", hidePropertiesPanel)
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)

  // Touch events for mobile
  if (isMobile) {
    setupTouchEvents()
  }
}

// Configurar toolbar
function setupToolbar() {
  selectTool("select")
  updateColorPresets()
}

// Poblar secciones de herramientas
function populateToolSections() {
  const container = isMobile
    ? document.querySelector("#mobileMenu .p-4.space-y-6")
    : document.getElementById("toolsContainer")

  if (!container) {
    console.warn("Contenedor de herramientas no encontrado")
    return
  }

  container.innerHTML = `
        <!-- Herramientas de Dibujo -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-primary-500 to-primary-600">
                    <i class="fas fa-pencil-alt"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Herramientas de Dibujo</h3>
                    <p class="text-sm text-secondary-500">Crea y edita elementos</p>
                </div>
            </div>
            <div class="tools-grid">
                <button class="tool-btn active" data-tool="select">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Seleccionar</span>
                </button>
                <button class="tool-btn" data-tool="draw">
                    <i class="fas fa-pen"></i>
                    <span>Dibujar</span>
                </button>
                <button class="tool-btn" data-tool="text">
                    <i class="fas fa-font"></i>
                    <span>Texto</span>
                </button>
                <button class="tool-btn" data-tool="erase">
                    <i class="fas fa-eraser"></i>
                    <span>Borrar</span>
                </button>
            </div>
            
            ${
              !isMobile
                ? `
            <div class="bg-gradient-to-r from-secondary-50 to-primary-50/30 rounded-2xl p-4 space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-secondary-700 mb-3">Grosor del Pincel</label>
                    <input type="range" id="brushSize" min="1" max="20" value="3" class="modern-range">
                    <div class="flex justify-between text-xs text-secondary-500 mt-2">
                        <span>Fino</span>
                        <span>Grueso</span>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-secondary-700 mb-3">Colores Rápidos</label>
                    <div class="grid grid-cols-6 gap-2">
                        <div class="color-preset-modern" data-color="#1e293b" style="background: #1e293b"></div>
                        <div class="color-preset-modern" data-color="#ef4444" style="background: #ef4444"></div>
                        <div class="color-preset-modern" data-color="#10b981" style="background: #10b981"></div>
                        <div class="color-preset-modern" data-color="#3b82f6" style="background: #3b82f6"></div>
                        <div class="color-preset-modern" data-color="#f59e0b" style="background: #f59e0b"></div>
                        <div class="color-preset-modern" data-color="#8b5cf6" style="background: #8b5cf6"></div>
                    </div>
                    <input type="color" id="colorPicker" value="#000000" class="w-full h-12 rounded-xl border-4 border-secondary-200 mt-3 cursor-pointer">
                </div>
            </div>
            `
                : ""
            }
        </div>

        <!-- Formas Básicas -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-green-500 to-green-600">
                    <i class="fas fa-shapes"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Formas Básicas</h3>
                    <p class="text-sm text-secondary-500">Elementos geométricos</p>
                </div>
            </div>
            <div class="tools-grid">
                <button class="category-btn shapes" onclick="addShape('rectangle')">
                    <i class="far fa-square"></i>
                    <span>Rectángulo</span>
                </button>
                <button class="category-btn shapes" onclick="addShape('circle')">
                    <i class="far fa-circle"></i>
                    <span>Círculo</span>
                </button>
                <button class="category-btn shapes" onclick="addShape('triangle')">
                    <i class="fas fa-play" style="transform: rotate(90deg)"></i>
                    <span>Triángulo</span>
                </button>
                <button class="category-btn shapes" onclick="addShape('arrow')">
                    <i class="fas fa-arrow-right"></i>
                    <span>Flecha</span>
                </button>
            </div>
        </div>

        <!-- Elementos de Red -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-purple-500 to-purple-600">
                    <i class="fas fa-network-wired"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Elementos de Red</h3>
                    <p class="text-sm text-secondary-500">Dispositivos de networking</p>
                </div>
            </div>
            <div class="tools-grid">
                <button class="category-btn network" onclick="addNetworkElement('router')">
                    <i class="fas fa-wifi"></i>
                    <span>Router</span>
                </button>
                <button class="category-btn network" onclick="addNetworkElement('switch')">
                    <i class="fas fa-project-diagram"></i>
                    <span>Switch</span>
                </button>
                <button class="category-btn network" onclick="addNetworkElement('computer')">
                    <i class="fas fa-desktop"></i>
                    <span>PC</span>
                </button>
                <button class="category-btn network" onclick="addNetworkElement('server')">
                    <i class="fas fa-server"></i>
                    <span>Servidor</span>
                </button>
                <button class="category-btn network" onclick="addNetworkElement('cloud')">
                    <i class="fas fa-cloud"></i>
                    <span>Nube</span>
                </button>
                <button class="category-btn network" onclick="addNetworkElement('firewall')">
                    <i class="fas fa-shield-alt"></i>
                    <span>Firewall</span>
                </button>
            </div>
        </div>

        <!-- Elementos de Base de Datos -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-orange-500 to-orange-600">
                    <i class="fas fa-database"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Base de Datos</h3>
                    <p class="text-sm text-secondary-500">Modelado de datos</p>
                </div>
            </div>
            <div class="tools-grid-single">
                <button class="category-btn database" onclick="showTableModal()">
                    <i class="fas fa-table"></i>
                    <span>Crear Tabla</span>
                </button>
                <button class="category-btn database" onclick="addDatabaseElement('entity')">
                    <i class="fas fa-cube"></i>
                    <span>Entidad</span>
                </button>
                <button class="category-btn database" onclick="addDatabaseElement('relation')">
                    <i class="fas fa-link"></i>
                    <span>Relación</span>
                </button>
            </div>
        </div>

        <!-- Elementos Web -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-indigo-500 to-indigo-600">
                    <i class="fas fa-code"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Desarrollo Web</h3>
                    <p class="text-sm text-secondary-500">Tecnologías web</p>
                </div>
            </div>
            <div class="tools-grid">
                <button class="category-btn web" onclick="addWebElement('html')">
                    <i class="fab fa-html5"></i>
                    <span>HTML</span>
                </button>
                <button class="category-btn web" onclick="addWebElement('css')">
                    <i class="fab fa-css3-alt"></i>
                    <span>CSS</span>
                </button>
                <button class="category-btn web" onclick="addWebElement('js')">
                    <i class="fab fa-js-square"></i>
                    <span>JavaScript</span>
                </button>
                <button class="category-btn web" onclick="addWebElement('api')">
                    <i class="fas fa-plug"></i>
                    <span>API</span>
                </button>
            </div>
        </div>

        <!-- Multimedia -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-pink-500 to-pink-600">
                    <i class="fas fa-image"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Multimedia</h3>
                    <p class="text-sm text-secondary-500">Imágenes y archivos</p>
                </div>
            </div>
            <button onclick="document.getElementById('imageUpload').click()" class="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-4 px-6 rounded-2xl hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center space-x-3">
                <i class="fas fa-upload text-xl"></i>
                <span>Subir Imagen</span>
            </button>
        </div>
    `

  // Re-attach event listeners for dynamically created elements
  attachToolEventListeners()
}

// Adjuntar event listeners a herramientas
function attachToolEventListeners() {
  // Herramientas de dibujo
  document.querySelectorAll(".tool-btn, .mobile-tool-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tool = this.dataset.tool
      if (tool) {
        selectTool(tool)
      }
    })
  })

  // Color picker
  const colorPicker = document.getElementById("colorPicker")
  if (colorPicker) {
    colorPicker.addEventListener("change", function () {
      currentColor = this.value
      updateBrushColor()
    })
  }

  // Color presets
  document.querySelectorAll(".color-preset").forEach((preset) => {
    preset.addEventListener("click", function () {
      currentColor = this.dataset.color
      const colorPicker = document.getElementById("colorPicker")
      if (colorPicker) {
        colorPicker.value = currentColor
      }
      updateBrushColor()
      updateColorPresets()
    })
  })

  // Brush size
  const brushSize = document.getElementById("brushSize")
  if (brushSize) {
    brushSize.addEventListener("input", function () {
      currentBrushSize = Number.parseInt(this.value)
      if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = currentBrushSize
      }
    })
  }
}

// Seleccionar herramienta
function selectTool(tool) {
  currentTool = tool

  // Actualizar UI
  document.querySelectorAll(".tool-btn, .mobile-tool-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  document.querySelectorAll(`[data-tool="${tool}"]`).forEach((btn) => {
    btn.classList.add("active")
  })

  // Configurar canvas según la herramienta
  if (!canvas) return

  switch (tool) {
    case "select":
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.defaultCursor = "default"
      break
    case "draw":
      canvas.isDrawingMode = true
      canvas.selection = false
      canvas.defaultCursor = "crosshair"
      break
    case "text":
      canvas.isDrawingMode = false
      canvas.selection = false
      canvas.defaultCursor = "text"
      setupTextTool()
      break
    case "erase":
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.defaultCursor = "crosshair"
      setupEraseTool()
      break
  }
}

// Configurar herramienta de texto
function setupTextTool() {
  canvas.off("mouse:down", addTextOnClick)
  canvas.on("mouse:down", addTextOnClick)
}

// Agregar texto al hacer clic
function addTextOnClick(options) {
  if (currentTool !== "text") return

  const pointer = canvas.getPointer(options.e)
  const text = new window.fabric.IText("Escribe aquí...", {
    left: pointer.x,
    top: pointer.y,
    fontFamily: "Inter",
    fontSize: 16,
    fill: currentColor,
    editable: true,
  })

  canvas.add(text)
  canvas.setActiveObject(text)
  text.enterEditing()
  saveCanvasState()
}

// Configurar herramienta de borrado
function setupEraseTool() {
  canvas.off("mouse:down", eraseOnClick)
  canvas.on("mouse:down", eraseOnClick)
}

// Borrar objeto al hacer clic
function eraseOnClick(options) {
  if (currentTool !== "erase") return

  const target = canvas.findTarget(options.e)
  if (target) {
    canvas.remove(target)
    saveCanvasState()
  }
}

// Agregar formas básicas
function addShape(shapeType) {
  if (!canvas) return

  let shape
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  switch (shapeType) {
    case "rectangle":
      shape = new window.fabric.Rect({
        left: centerX - 50,
        top: centerY - 30,
        width: 100,
        height: 60,
        fill: "transparent",
        stroke: currentColor,
        strokeWidth: 2,
      })
      break
    case "circle":
      shape = new window.fabric.Circle({
        left: centerX - 40,
        top: centerY - 40,
        radius: 40,
        fill: "transparent",
        stroke: currentColor,
        strokeWidth: 2,
      })
      break
    case "triangle":
      shape = new window.fabric.Triangle({
        left: centerX - 40,
        top: centerY - 35,
        width: 80,
        height: 70,
        fill: "transparent",
        stroke: currentColor,
        strokeWidth: 2,
      })
      break
    case "arrow":
      const line = new window.fabric.Line([centerX - 50, centerY, centerX + 30, centerY], {
        stroke: currentColor,
        strokeWidth: 3,
      })

      const arrowHead = new window.fabric.Triangle({
        left: centerX + 25,
        top: centerY - 8,
        width: 16,
        height: 16,
        fill: currentColor,
        angle: 90,
      })

      const arrow = new window.fabric.Group([line, arrowHead], {
        left: centerX - 50,
        top: centerY - 8,
      })

      canvas.add(arrow)
      saveCanvasState()
      return
  }

  if (shape) {
    canvas.add(shape)
    canvas.setActiveObject(shape)
    saveCanvasState()
  }
}

// Agregar elementos de red
function addNetworkElement(elementType) {
  if (!canvas) return

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  const icons = {
    router: "📡",
    switch: "🔀",
    computer: "💻",
    server: "🖥️",
    cloud: "☁️",
    firewall: "🛡️",
  }

  const labels = {
    router: "Router",
    switch: "Switch",
    computer: "PC",
    server: "Servidor",
    cloud: "Nube",
    firewall: "Firewall",
  }

  const icon = new window.fabric.Text(icons[elementType], {
    fontSize: 30,
    textAlign: "center",
  })

  const label = new window.fabric.Text(labels[elementType], {
    fontSize: 12,
    textAlign: "center",
    top: 35,
  })

  const background = new window.fabric.Rect({
    width: 80,
    height: 60,
    fill: "white",
    stroke: "#e5e7eb",
    strokeWidth: 2,
    rx: 8,
    ry: 8,
  })

  const group = new window.fabric.Group([background, icon, label], {
    left: centerX - 40,
    top: centerY - 30,
    selectable: true,
  })

  canvas.add(group)
  canvas.setActiveObject(group)
  saveCanvasState()
}

// Agregar elementos de base de datos
function addDatabaseElement(elementType) {
  if (!canvas) return

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  switch (elementType) {
    case "entity":
      const entity = new window.fabric.Rect({
        left: centerX - 60,
        top: centerY - 30,
        width: 120,
        height: 60,
        fill: "white",
        stroke: "#f59e0b",
        strokeWidth: 2,
        rx: 8,
        ry: 8,
      })

      const entityText = new window.fabric.Text("Entidad", {
        left: centerX,
        top: centerY,
        textAlign: "center",
        originX: "center",
        originY: "center",
        fontSize: 14,
        fontWeight: "bold",
      })

      const entityGroup = new window.fabric.Group([entity, entityText], {
        left: centerX - 60,
        top: centerY - 30,
      })

      canvas.add(entityGroup)
      canvas.setActiveObject(entityGroup)
      break

    case "relation":
      const diamond = new window.fabric.Polygon(
        [
          { x: 0, y: -30 },
          { x: 40, y: 0 },
          { x: 0, y: 30 },
          { x: -40, y: 0 },
        ],
        {
          left: centerX,
          top: centerY,
          fill: "white",
          stroke: "#f59e0b",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
        },
      )

      const relationText = new window.fabric.Text("Relación", {
        left: centerX,
        top: centerY,
        textAlign: "center",
        originX: "center",
        originY: "center",
        fontSize: 12,
      })

      const relationGroup = new window.fabric.Group([diamond, relationText], {
        left: centerX - 40,
        top: centerY - 30,
      })

      canvas.add(relationGroup)
      canvas.setActiveObject(relationGroup)
      break
  }

  saveCanvasState()
}

// Agregar elementos web
function addWebElement(elementType) {
  if (!canvas) return

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  const colors = {
    html: "#ea580c",
    css: "#2563eb",
    js: "#eab308",
    api: "#059669",
  }

  const labels = {
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
    api: "API REST",
  }

  const background = new window.fabric.Rect({
    width: 100,
    height: 60,
    fill: "white",
    stroke: colors[elementType],
    strokeWidth: 2,
    rx: 8,
    ry: 8,
  })

  const text = new window.fabric.Text(labels[elementType], {
    textAlign: "center",
    originX: "center",
    originY: "center",
    fontSize: 14,
    fontWeight: "bold",
    fill: colors[elementType],
    left: 50,
    top: 30,
  })

  const group = new window.fabric.Group([background, text], {
    left: centerX - 50,
    top: centerY - 30,
  })

  canvas.add(group)
  canvas.setActiveObject(group)
  saveCanvasState()
}

// Mostrar modal de tabla
function showTableModal() {
  const modal = document.getElementById("tableModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
  }
}

// Ocultar modal de tabla
function hideTableModal() {
  const modal = document.getElementById("tableModal")
  if (modal) {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
  }
}

// Crear tabla de base de datos
function createDatabaseTable() {
  if (!canvas) return

  const tableName = document.getElementById("tableName")?.value || "tabla"
  const rows = Number.parseInt(document.getElementById("tableRows")?.value) || 3
  const cols = Number.parseInt(document.getElementById("tableCols")?.value) || 3

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const cellWidth = 80
  const cellHeight = 25

  const elements = []

  // Crear header
  const header = new window.fabric.Rect({
    width: cellWidth * cols,
    height: cellHeight,
    fill: "#f59e0b",
    stroke: "#d97706",
    strokeWidth: 1,
  })

  const headerText = new window.fabric.Text(tableName.toUpperCase(), {
    left: (cellWidth * cols) / 2,
    top: cellHeight / 2,
    originX: "center",
    originY: "center",
    fontSize: 12,
    fontWeight: "bold",
    fill: "white",
  })

  elements.push(header, headerText)

  // Crear filas
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = new window.fabric.Rect({
        left: j * cellWidth,
        top: (i + 1) * cellHeight,
        width: cellWidth,
        height: cellHeight,
        fill: "white",
        stroke: "#d1d5db",
        strokeWidth: 1,
      })

      const cellText = new window.fabric.Text(`campo${j + 1}`, {
        left: j * cellWidth + cellWidth / 2,
        top: (i + 1) * cellHeight + cellHeight / 2,
        originX: "center",
        originY: "center",
        fontSize: 10,
        fill: "#374151",
      })

      elements.push(cell, cellText)
    }
  }

  const table = new window.fabric.Group(elements, {
    left: centerX - (cellWidth * cols) / 2,
    top: centerY - ((rows + 1) * cellHeight) / 2,
  })

  canvas.add(table)
  canvas.setActiveObject(table)
  saveCanvasState()
  hideTableModal()
}

// Manejar carga de imágenes
function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file || !canvas) return

  showLoadingIndicator()

  const reader = new FileReader()
  reader.onload = (e) => {
    window.fabric.Image.fromURL(e.target.result, (img) => {
      // Redimensionar imagen si es muy grande
      const maxWidth = 300
      const maxHeight = 300

      if (img.width > maxWidth || img.height > maxHeight) {
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height)
        img.scale(scale)
      }

      img.set({
        left: canvas.width / 2 - img.getScaledWidth() / 2,
        top: canvas.height / 2 - img.getScaledHeight() / 2,
      })

      canvas.add(img)
      canvas.setActiveObject(img)
      saveCanvasState()
      hideLoadingIndicator()
    })
  }
  reader.readAsDataURL(file)
}

// Mobile menu functions
function showMobileMenu() {
  const menu = document.getElementById("mobileMenu")
  const panel = document.getElementById("mobileMenuPanel")

  if (menu && panel) {
    menu.classList.remove("hidden")
    setTimeout(() => {
      panel.classList.remove("-translate-x-full")
    }, 10)
  }
}

function hideMobileMenu() {
  const menu = document.getElementById("mobileMenu")
  const panel = document.getElementById("mobileMenuPanel")

  if (menu && panel) {
    panel.classList.add("-translate-x-full")
    setTimeout(() => {
      menu.classList.add("hidden")
    }, 300)
  }
}

// Color modal functions
function showColorModal() {
  const modal = document.getElementById("colorModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
  }
}

function hideColorModal() {
  const modal = document.getElementById("colorModal")
  if (modal) {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
  }
}

// Actualizar color del pincel
function updateBrushColor() {
  if (canvas && canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = currentColor
  }
}

// Actualizar presets de color
function updateColorPresets() {
  document.querySelectorAll(".color-preset").forEach((preset) => {
    preset.classList.remove("active")
    if (preset.dataset.color === currentColor) {
      preset.classList.add("active")
    }
  })
}

// Manejar selección de objetos
function handleObjectSelection(e) {
  selectedElement = e.selected[0]
  showPropertiesPanel()
}

// Limpiar selección de objetos
function clearObjectSelection() {
  selectedElement = null
  hidePropertiesPanel()
}

// Mostrar panel de propiedades
function showPropertiesPanel() {
  const panel = document.getElementById("propertiesPanel")
  const content = document.getElementById("propertiesContent")

  if (!selectedElement || !panel || !content) return

  let html = ""

  if (selectedElement.type === "i-text" || selectedElement.type === "text") {
    html = `
            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Texto</label>
                    <input type="text" id="textContent" value="${selectedElement.text}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
                    <input type="range" id="fontSize" min="8" max="72" value="${selectedElement.fontSize}" class="w-full">
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>8px</span>
                        <span>72px</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input type="color" id="textColor" value="${selectedElement.fill}" class="w-full h-10 border border-gray-300 rounded-lg">
                </div>
            </div>
        `
  } else {
    html = `
            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Opacidad</label>
                    <input type="range" id="opacity" min="0" max="1" step="0.1" value="${selectedElement.opacity}" class="w-full">
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Rotación</label>
                    <input type="range" id="rotation" min="0" max="360" value="${selectedElement.angle}" class="w-full">
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0°</span>
                        <span>360°</span>
                    </div>
                </div>
                <button id="deleteObject" class="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium">
                    <i class="fas fa-trash mr-2"></i>
                    Eliminar
                </button>
            </div>
        `
  }

  content.innerHTML = html
  panel.classList.remove("hidden")

  // Agregar event listeners para los controles
  setupPropertyControls()
}

// Configurar controles de propiedades
function setupPropertyControls() {
  const textContent = document.getElementById("textContent")
  const fontSize = document.getElementById("fontSize")
  const textColor = document.getElementById("textColor")
  const opacity = document.getElementById("opacity")
  const rotation = document.getElementById("rotation")
  const deleteBtn = document.getElementById("deleteObject")

  if (textContent) {
    textContent.addEventListener("input", function () {
      selectedElement.set("text", this.value)
      canvas.renderAll()
    })
  }

  if (fontSize) {
    fontSize.addEventListener("input", function () {
      selectedElement.set("fontSize", Number.parseInt(this.value))
      canvas.renderAll()
    })
  }

  if (textColor) {
    textColor.addEventListener("change", function () {
      selectedElement.set("fill", this.value)
      canvas.renderAll()
    })
  }

  if (opacity) {
    opacity.addEventListener("input", function () {
      selectedElement.set("opacity", Number.parseFloat(this.value))
      canvas.renderAll()
    })
  }

  if (rotation) {
    rotation.addEventListener("input", function () {
      selectedElement.set("angle", Number.parseInt(this.value))
      canvas.renderAll()
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      canvas.remove(selectedElement)
      hidePropertiesPanel()
      saveCanvasState()
    })
  }
}

// Ocultar panel de propiedades
function hidePropertiesPanel() {
  const panel = document.getElementById("propertiesPanel")
  if (panel) {
    panel.classList.add("hidden")
  }
}

// Controles de zoom
function zoomCanvas(factor) {
  if (!canvas) return

  zoomLevel *= factor
  zoomLevel = Math.max(0.1, Math.min(5, zoomLevel))

  canvas.setZoom(zoomLevel)
  updateZoomDisplay()
}

function resetZoom() {
  if (!canvas) return

  zoomLevel = 1
  canvas.setZoom(1)
  canvas.absolutePan(new window.fabric.Point(0, 0))
  updateZoomDisplay()
}

function updateZoomDisplay() {
  const zoomElement = document.getElementById("zoomLevel")
  if (zoomElement) {
    zoomElement.textContent = Math.round(zoomLevel * 100) + "%"
  }
}

// Redimensionar canvas
function resizeCanvas() {
  if (!canvas) return

  const containerWidth = window.innerWidth - (isMobile ? 0 : 288)
  const containerHeight = window.innerHeight - (isMobile ? 136 : 64)

  canvas.setDimensions({
    width: containerWidth,
    height: containerHeight,
  })

  canvas.renderAll()
}

// Configurar eventos táctiles para móviles
function setupTouchEvents() {
  const canvasElement = document.getElementById("drawingCanvas")
  if (!canvasElement) return

  canvasElement.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false },
  )

  canvasElement.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false },
  )
}

// Guardar estado del canvas
function saveCanvasState() {
  if (!canvas) return

  try {
    const canvasData = canvas.toJSON()
    localStorage.setItem("eduboard_canvas", JSON.stringify(canvasData))
  } catch (error) {
    console.error("Error al guardar el estado del canvas:", error)
  }
}

// Limpiar canvas
function clearCanvas() {
  if (!canvas) return

  showConfirmModal({
    title: "¿Limpiar pizarra?",
    message: "Se eliminarán todos los elementos del canvas. Esta acción no se puede deshacer.",
    icon: "fas fa-trash-alt",
    iconColor: "bg-gradient-to-r from-red-500 to-red-600",
    confirmText: "Sí, limpiar",
    onConfirm: () => {
      canvas.clear()
      canvas.backgroundColor = "white"
      canvas.renderAll()
      saveCanvasState()
      showToast("Pizarra limpiada correctamente", "success")
    },
  })
}

// Nueva pizarra
function newBoard() {
  showConfirmModal({
    title: "¿Nueva pizarra?",
    message: "Se creará una nueva pizarra y se perderán los cambios no guardados.",
    icon: "fas fa-plus",
    iconColor: "bg-gradient-to-r from-primary-500 to-primary-600",
    confirmText: "Crear nueva",
    onConfirm: () => {
      clearCanvas()
      showToast("Nueva pizarra creada", "success")
    },
  })
}

// Atajos de teclado
function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "s":
        e.preventDefault()
        saveBoard()
        break
      case "o":
        e.preventDefault()
        loadBoard()
        break
      case "n":
        e.preventDefault()
        newBoard()
        break
    }
  }

  switch (e.key) {
    case "v":
      selectTool("select")
      break
    case "d":
      selectTool("draw")
      break
    case "t":
      selectTool("text")
      break
    case "e":
      selectTool("erase")
      break
    case "Delete":
    case "Backspace":
      if (selectedElement && canvas) {
        canvas.remove(selectedElement)
        saveCanvasState()
      }
      break
    case "Escape":
      hidePropertiesPanel()
      hideMobileMenu()
      hideColorModal()
      hideTableModal()
      break
  }
}

// Utilidades
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function showLoadingIndicator() {
  const indicator = document.getElementById("loadingIndicator")
  if (indicator) {
    indicator.classList.remove("hidden")
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById("loadingIndicator")
  if (indicator) {
    indicator.classList.add("hidden")
  }
}

// Update success messages to use toasts
function showSuccessMessage(message) {
  showToast(message, "success")
}

function showErrorMessage(message) {
  showToast(message, "error")
}

// Add modern confirmation modal system
function showConfirmModal({ title, message, icon, iconColor, confirmText, onConfirm }) {
  const modal = document.getElementById("confirmModal")
  const iconEl = document.getElementById("confirmIcon")
  const titleEl = document.getElementById("confirmTitle")
  const messageEl = document.getElementById("confirmMessage")
  const confirmBtn = document.getElementById("confirmAction")
  const cancelBtn = document.getElementById("confirmCancel")

  if (!modal) return

  // Set content
  iconEl.className = `w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconColor}`
  iconEl.innerHTML = `<i class="${icon} text-white text-2xl"></i>`
  titleEl.textContent = title
  messageEl.textContent = message
  confirmBtn.textContent = confirmText

  // Show modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Handle actions
  const handleConfirm = () => {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
    onConfirm()
    cleanup()
  }

  const handleCancel = () => {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
    cleanup()
  }

  const cleanup = () => {
    confirmBtn.removeEventListener("click", handleConfirm)
    cancelBtn.removeEventListener("click", handleCancel)
  }

  confirmBtn.addEventListener("click", handleConfirm)
  cancelBtn.addEventListener("click", handleCancel)
}

// Add modern toast system
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer")
  if (!container) return

  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const icons = {
    success: "fas fa-check-circle text-green-600",
    error: "fas fa-exclamation-circle text-red-600",
    warning: "fas fa-exclamation-triangle text-yellow-600",
    info: "fas fa-info-circle text-blue-600",
  }

  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span class="font-medium text-secondary-900">${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-auto p-1 rounded-lg hover:bg-secondary-100 transition-colors">
      <i class="fas fa-times text-secondary-500"></i>
    </button>
  `

  container.appendChild(toast)

  // Auto remove
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.transform = "translateX(100%)"
      toast.style.opacity = "0"
      setTimeout(() => toast.remove(), 300)
    }
  }, duration)
}

// Hacer funciones globales para uso en HTML
window.addShape = addShape
window.addNetworkElement = addNetworkElement
window.addDatabaseElement = addDatabaseElement
window.addWebElement = addWebElement
window.showTableModal = showTableModal
window.hideTableModal = hideTableModal
window.showConfirmModal = showConfirmModal
window.showToast = showToast
window.saveBoard = saveBoard
window.loadBoard = loadBoard
