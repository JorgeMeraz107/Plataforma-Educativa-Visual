// Variables globales
let canvas
let currentTool = "select"
let currentColor = "#000000"
let currentBrushSize = 3
let selectedElement = null
let zoomLevel = 1
const isMobile = window.innerWidth < 1024

// FUNCIONES MEJORADAS PARA GUARDAR Y CARGAR
function saveBoard() {
  if (!canvas) return

  try {
    const canvasData = canvas.toJSON()

    // Guardar en localStorage como respaldo
    localStorage.setItem("eduboard_canvas", JSON.stringify(canvasData))

    // Crear y descargar archivo JSON
    const dataStr = JSON.stringify(canvasData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(dataBlob)

    // Generar nombre con fecha y hora
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, "-")
    link.download = `pizarra-eduboard-${timestamp}.json`

    // Simular click para descargar
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Limpiar URL del blob
    URL.revokeObjectURL(link.href)

    showToast("Pizarra guardada y descargada correctamente", "success")
  } catch (error) {
    console.error("Error al guardar el tablero:", error)
    showToast("Error al guardar el tablero", "error")
  }
}

function loadBoard() {
  if (!canvas) return

  // Crear input file para cargar JSON
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"

  input.onchange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    showLoadingIndicator()

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const canvasData = JSON.parse(e.target.result)

        canvas.loadFromJSON(canvasData, () => {
          canvas.renderAll()
          hideLoadingIndicator()
          showToast("Pizarra cargada correctamente", "success")
        })
      } catch (error) {
        console.error("Error al cargar el archivo:", error)
        hideLoadingIndicator()
        showToast("Error: Archivo JSON inválido", "error")
      }
    }

    reader.onerror = () => {
      hideLoadingIndicator()
      showToast("Error al leer el archivo", "error")
    }

    reader.readAsText(file)
  }

  // Simular click para abrir selector de archivos
  input.click()
}

// Función para cargar desde localStorage (como respaldo)
function loadFromLocalStorage() {
  if (!canvas) return

  try {
    const savedData = localStorage.getItem("eduboard_canvas")
    if (savedData) {
      canvas.loadFromJSON(JSON.parse(savedData), () => {
        canvas.renderAll()
        showToast("Pizarra cargada desde respaldo local", "success")
      })
    } else {
      showToast("No hay pizarra guardada localmente", "warning")
    }
  } catch (error) {
    console.error("Error al cargar desde localStorage:", error)
    showToast("Error al cargar pizarra local", "error")
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

// Inicializar Canvas con Fabric.js - MEJORADO PARA RESPONSIVE
function initializeCanvas() {
  const canvasElement = document.getElementById("drawingCanvas")
  if (!canvasElement) {
    throw new Error("Elemento canvas no encontrado")
  }

  // Calcular dimensiones del canvas según el tamaño de pantalla
  const sidebarWidth = getSidebarWidth()
  const headerHeight = getHeaderHeight()
  const mobileToolbarHeight = isMobile ? 136 : 0

  const containerWidth = window.innerWidth - sidebarWidth
  const containerHeight = window.innerHeight - headerHeight - mobileToolbarHeight

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

// FUNCIONES AUXILIARES PARA RESPONSIVE DESIGN
function getSidebarWidth() {
  if (isMobile) return 0

  const width = window.innerWidth
  if (width >= 2560) return 512 // 32rem
  if (width >= 1920) return 448 // 28rem
  if (width >= 1440) return 384 // 24rem
  if (width >= 1280) return 320 // 20rem
  if (width >= 1024) return 288 // 18rem
  return 288
}

function getHeaderHeight() {
  const width = window.innerWidth
  if (width >= 2560) return 96 // 24
  if (width >= 1920) return 80 // 20
  if (width >= 1440) return 72 // 18
  if (width >= 1280) return 68 // 17
  if (width < 768) return 56 // 14
  return 64 // 16
}

// Mostrar modal de tabla
function showTableModal() {
  const modal = document.getElementById("tableModal")
  if (modal) {
    // Actualizar el contenido del modal con la nueva interfaz
    const modalContent = modal.querySelector(".bg-white")
    modalContent.innerHTML = `
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
            <i class="fas fa-table text-white text-xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900">Crear Tabla de Base de Datos</h3>
            <p class="text-sm text-gray-500">Diseña tu estructura de datos</p>
          </div>
        </div>
        <button onclick="hideTableModal()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <i class="fas fa-times text-gray-500"></i>
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- Información básica de la tabla -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre de la Tabla</label>
            <input type="text" id="tableName" placeholder="ej: usuarios, productos, pedidos..." 
                   class="modern-input" value="usuarios">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Filas de Datos</label>
            <input type="number" id="tableRows" min="1" max="10" value="3" class="modern-input">
          </div>
        </div>

        <!-- Definición de columnas -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <label class="block text-sm font-semibold text-gray-700">Columnas de la Tabla</label>
            <button onclick="addTableColumn()" class="btn-secondary text-sm py-2 px-3">
              <i class="fas fa-plus mr-1"></i> Agregar Columna
            </button>
          </div>
          
          <div id="columnsContainer" class="space-y-3">
            <!-- Las columnas se generarán dinámicamente -->
          </div>
        </div>

        <!-- Vista previa -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-3">Vista Previa</label>
          <div class="bg-gray-50 rounded-xl p-4 max-h-64 overflow-auto">
            <div id="tablePreview" class="text-sm">
              <!-- La vista previa se generará aquí -->
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
        <button onclick="hideTableModal()" class="btn-secondary">
          <i class="fas fa-times mr-2"></i>Cancelar
        </button>
        <button onclick="createAdvancedTable()" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>Crear Tabla
        </button>
      </div>
    `

    // Inicializar columnas por defecto
    initializeDefaultColumns()
    updateTablePreview()

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

  if (createTableBtn) createTableBtn.addEventListener("click", createAdvancedTable)
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

        <!-- Opciones de Archivo -->
        <div class="tool-section">
            <div class="tool-section-header">
                <div class="tool-section-icon bg-gradient-to-r from-blue-500 to-blue-600">
                    <i class="fas fa-file"></i>
                </div>
                <div>
                    <h3 class="tool-section-title">Archivo</h3>
                    <p class="text-sm text-secondary-500">Gestión de pizarras</p>
                </div>
            </div>
            <div class="space-y-3">
                <button onclick="loadFromLocalStorage()" class="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center space-x-2">
                    <i class="fas fa-history"></i>
                    <span>Cargar Respaldo Local</span>
                </button>
            </div>
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
  document.querySelectorAll(".color-preset-modern").forEach((preset) => {
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

// Funciones auxiliares que faltaban
function addTableColumn() {
  const container = document.getElementById("columnsContainer")
  if (!container) return

  const columnCount = container.children.length
  addColumnToContainer(`campo${columnCount + 1}`, "text", false, columnCount)
  updateTablePreview()
}

function removeTableColumn(button) {
  const container = document.getElementById("columnsContainer")
  if (container && container.children.length > 1) {
    button.closest(".bg-white").remove()
    updateTablePreview()
  } else {
    showToast("Debe haber al menos una columna", "warning")
  }
}

function updateTablePreview() {
  const preview = document.getElementById("tablePreview")
  const container = document.getElementById("columnsContainer")
  const tableName = document.getElementById("tableName")?.value || "tabla"

  if (!preview || !container) return

  const columns = []
  Array.from(container.children).forEach((columnDiv) => {
    const inputs = columnDiv.querySelectorAll("input, select")
    const name = inputs[0].value
    const type = inputs[1].value
    const primaryKey = inputs[2].checked

    columns.push({ name, type, primaryKey })
  })

  const html = `
    <div class="inline-block border border-gray-300 rounded-lg overflow-hidden">
      <div class="bg-orange-500 text-white px-4 py-2 font-bold text-center">
        ${tableName.toUpperCase()}
      </div>
      <table class="min-w-full">
        <thead class="bg-gray-100">
          <tr>
            ${columns
              .map(
                (col) => `
              <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300 last:border-r-0">
                ${col.name}
                ${col.primaryKey ? '<i class="fas fa-key text-yellow-500 ml-1"></i>' : ""}
                <div class="text-xs font-normal text-gray-500">${getTypeLabel(col.type)}</div>
              </th>
            `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from(
            { length: 2 },
            (_, i) => `
            <tr class="border-t border-gray-200">
              ${columns
                .map(
                  (col) => `
                <td class="px-3 py-2 text-xs text-gray-600 border-r border-gray-300 last:border-r-0">
                  ${getSampleData(col.type, i)}
                </td>
              `,
                )
                .join("")}
            </tr>
          `,
          ).join("")}
        </tbody>
      </table>
    </div>
  `

  preview.innerHTML = html
}

function initializeDefaultColumns() {
  const container = document.getElementById("columnsContainer")
  if (!container) return

  container.innerHTML = ""

  // Columnas por defecto
  const defaultColumns = [
    { name: "id", type: "number", primaryKey: true },
    { name: "nombre", type: "text", primaryKey: false },
    { name: "email", type: "text", primaryKey: false },
  ]

  defaultColumns.forEach((col, index) => {
    addColumnToContainer(col.name, col.type, col.primaryKey, index)
  })
}

function addColumnToContainer(name, type, primaryKey, index) {
  const container = document.getElementById("columnsContainer")
  if (!container) return

  const columnDiv = document.createElement("div")
  columnDiv.className = "bg-white border border-gray-200 rounded-xl p-4"
  columnDiv.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
        <input type="text" value="${name}" onchange="updateTablePreview()" 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
        <select onchange="updateTablePreview()" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
          <option value="text" ${type === "text" ? "selected" : ""}>Texto</option>
          <option value="number" ${type === "number" ? "selected" : ""}>Número</option>
          <option value="email" ${type === "email" ? "selected" : ""}>Email</option>
          <option value="date" ${type === "date" ? "selected" : ""}>Fecha</option>
          <option value="boolean" ${type === "boolean" ? "selected" : ""}>Booleano</option>
        </select>
      </div>
      <div>
        <label class="flex items-center space-x-2 text-xs font-medium text-gray-600">
          <input type="checkbox" ${primaryKey ? "checked" : ""} onchange="updateTablePreview()" 
                 class="rounded border-gray-300 text-orange-600 focus:ring-orange-500">
          <span>Clave Primaria</span>
        </label>
      </div>
      <div>
        <button onclick="removeTableColumn(this)" class="w-full bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `

  container.appendChild(columnDiv)
}

function getTypeLabel(type) {
  const labels = {
    text: "Texto",
    number: "Número",
    email: "Email",
    date: "Fecha",
    boolean: "Sí/No",
  }
  return labels[type] || "Texto"
}

function getSampleData(type, index) {
  const samples = {
    text: ["Juan Pérez", "María García"],
    number: ["1", "2"],
    email: ["juan@email.com", "maria@email.com"],
    date: ["2024-01-15", "2024-01-16"],
    boolean: ["Sí", "No"],
  }
  return samples[type] ? samples[type][index] || samples[type][0] : "Dato"
}

// Reemplazar la función createDatabaseTable() con esta versión avanzada:
function createAdvancedTable() {
  if (!canvas) return

  const tableName = document.getElementById("tableName")?.value || "tabla"
  const rows = Number.parseInt(document.getElementById("tableRows")?.value) || 3
  const container = document.getElementById("columnsContainer")

  if (!container) return

  // Obtener definición de columnas
  const columns = []
  Array.from(container.children).forEach((columnDiv) => {
    const inputs = columnDiv.querySelectorAll("input, select")
    const name = inputs[0].value
    const type = inputs[1].value
    const primaryKey = inputs[2].checked

    columns.push({ name, type, primaryKey })
  })

  if (columns.length === 0) {
    showToast("Debe definir al menos una columna", "warning")
    return
  }

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const cellWidth = Math.max(80, Math.min(120, 800 / columns.length))
  const cellHeight = 30

  const elements = []

  // Crear header de la tabla
  const headerBg = new fabric.Rect({
    width: cellWidth * columns.length,
    height: cellHeight,
    fill: "#f59e0b",
    stroke: "#d97706",
    strokeWidth: 1,
  })

  const headerText = new fabric.Text(tableName.toUpperCase(), {
    left: (cellWidth * columns.length) / 2,
    top: cellHeight / 2,
    originX: "center",
    originY: "center",
    fontSize: 14,
    fontWeight: "bold",
    fill: "white",
  })

  elements.push(headerBg, headerText)

  // Crear headers de columnas
  columns.forEach((col, colIndex) => {
    const colHeaderBg = new fabric.Rect({
      left: colIndex * cellWidth,
      top: cellHeight,
      width: cellWidth,
      height: cellHeight,
      fill: col.primaryKey ? "#fef3c7" : "#f3f4f6",
      stroke: "#d1d5db",
      strokeWidth: 1,
    })

    const colHeaderText = new fabric.Text(col.name, {
      left: colIndex * cellWidth + cellWidth / 2,
      top: cellHeight + cellHeight / 2,
      originX: "center",
      originY: "center",
      fontSize: 11,
      fontWeight: "bold",
      fill: col.primaryKey ? "#92400e" : "#374151",
    })

    // Agregar icono de clave primaria
    if (col.primaryKey) {
      const keyIcon = new fabric.Text("🔑", {
        left: colIndex * cellWidth + cellWidth - 15,
        top: cellHeight + 8,
        fontSize: 12,
      })
      elements.push(keyIcon)
    }

    // Agregar indicador de tipo
    const typeText = new fabric.Text(getTypeLabel(col.type), {
      left: colIndex * cellWidth + cellWidth / 2,
      top: cellHeight + cellHeight - 8,
      originX: "center",
      originY: "center",
      fontSize: 8,
      fill: "#6b7280",
    })

    elements.push(colHeaderBg, colHeaderText, typeText)
  })

  // Crear filas de datos
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    columns.forEach((col, colIndex) => {
      const cellBg = new fabric.Rect({
        left: colIndex * cellWidth,
        top: (rowIndex + 2) * cellHeight,
        width: cellWidth,
        height: cellHeight,
        fill: "white",
        stroke: "#d1d5db",
        strokeWidth: 1,
      })

      const sampleData = getSampleData(col.type, rowIndex)
      const cellText = new fabric.IText(sampleData, {
        left: colIndex * cellWidth + cellWidth / 2,
        top: (rowIndex + 2) * cellHeight + cellHeight / 2,
        originX: "center",
        originY: "center",
        fontSize: 10,
        fill: "#374151",
        editable: true,
        selectable: true,
      })

      // Hacer la celda editable al doble clic
      cellText.on("editing:entered", function () {
        this.selectAll()
      })

      elements.push(cellBg, cellText)
    })
  }

  // Crear el grupo de la tabla
  const table = new fabric.Group(elements, {
    left: centerX - (cellWidth * columns.length) / 2,
    top: centerY - ((rows + 2) * cellHeight) / 2,
    selectable: true,
  })

  // Agregar metadatos a la tabla para futuras ediciones
  table.set("tableData", {
    name: tableName,
    columns: columns,
    rows: rows,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
  })

  canvas.add(table)
  canvas.setActiveObject(table)
  saveCanvasState()
  hideTableModal()

  showToast(`Tabla "${tableName}" creada con ${columns.length} columnas y ${rows} filas`, "success")
}

// Agregar función para editar tabla existente
function editTable(tableObject) {
  if (!tableObject || !tableObject.tableData) {
    showToast("Esta tabla no se puede editar", "warning")
    return
  }

  const tableData = tableObject.tableData

  // Rellenar el modal con los datos existentes
  document.getElementById("tableName").value = tableData.name
  document.getElementById("tableRows").value = tableData.rows

  // Recrear las columnas
  const container = document.getElementById("columnsContainer")
  container.innerHTML = ""

  tableData.columns.forEach((col, index) => {
    addColumnToContainer(col.name, col.type, col.primaryKey, index)
  })

  updateTablePreview()
  showTableModal()

  // Cambiar el botón de crear por actualizar
  const createBtn = document.querySelector('[onclick="createAdvancedTable()"]')
  if (createBtn) {
    createBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar Tabla'
    createBtn.setAttribute("onclick", `updateExistingTable('${tableObject.id}')`)
  }
}

// Función para actualizar tabla existente
function updateExistingTable(tableId) {
  const tableObject = canvas.getObjects().find((obj) => obj.id === tableId)
  if (!tableObject) return

  // Eliminar tabla anterior
  canvas.remove(tableObject)

  // Crear nueva tabla con los datos actualizados
  createAdvancedTable()
}

// Agregar función para hacer celdas editables individualmente
function makeCellEditable(cellObject) {
  if (!cellObject || cellObject.type !== "i-text") return

  cellObject.set({
    editable: true,
    selectable: true,
  })

  cellObject.on("editing:entered", function () {
    this.selectAll()
    showToast("Editando celda - Presiona Escape para terminar", "info", 2000)
  })

  cellObject.on("editing:exited", () => {
    saveCanvasState()
    showToast("Celda actualizada", "success", 1500)
  })

  canvas.renderAll()
}

// Mejorar la función de selección de objetos para detectar tablas
function handleObjectSelection(e) {
  selectedElement = e.selected[0]

  // Si es una tabla, mostrar opciones especiales
  if (selectedElement && selectedElement.tableData) {
    showTablePropertiesPanel()
  } else {
    showPropertiesPanel()
  }
}

// Panel de propiedades especial para tablas
function showTablePropertiesPanel() {
  const panel = document.getElementById("propertiesPanel")
  const content = document.getElementById("propertiesContent")

  if (!selectedElement || !panel || !content) return

  const tableData = selectedElement.tableData

  const html = `
    <div class="space-y-4">
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div class="flex items-center space-x-2 mb-2">
          <i class="fas fa-table text-orange-600"></i>
          <span class="font-semibold text-orange-800">Tabla: ${tableData.name}</span>
        </div>
        <div class="text-sm text-orange-700">
          ${tableData.columns.length} columnas • ${tableData.rows} filas
        </div>
      </div>
      
      <div class="space-y-3">
        <button onclick="editTable(selectedElement)" class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium">
          <i class="fas fa-edit mr-2"></i>
          Editar Estructura
        </button>
        
        <button onclick="addTableRow()" class="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium">
          <i class="fas fa-plus mr-2"></i>
          Agregar Fila
        </button>
        
        <button onclick="duplicateTable()" class="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors font-medium">
          <i class="fas fa-copy mr-2"></i>
          Duplicar Tabla
        </button>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Opacidad</label>
          <input type="range" id="tableOpacity" min="0" max="1" step="0.1" value="${selectedElement.opacity}" class="w-full">
        </div>
        
        <button onclick="deleteTable()" class="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium">
          <i class="fas fa-trash mr-2"></i>
          Eliminar Tabla
        </button>
      </div>
    </div>
  `

  content.innerHTML = html
  panel.classList.remove("hidden")

  // Configurar control de opacidad
  const opacityControl = document.getElementById("tableOpacity")
  if (opacityControl) {
    opacityControl.addEventListener("input", function () {
      selectedElement.set("opacity", Number.parseFloat(this.value))
      canvas.renderAll()
    })
  }
}

// Funciones adicionales para manejo de tablas
function addTableRow() {
  if (!selectedElement || !selectedElement.tableData) return

  showToast("Función en desarrollo - Próximamente podrás agregar filas dinámicamente", "info")
}

function duplicateTable() {
  if (!selectedElement) return

  const cloned = fabric.util.object.clone(selectedElement)
  cloned.set({
    left: selectedElement.left + 20,
    top: selectedElement.top + 20,
  })

  canvas.add(cloned)
  canvas.setActiveObject(cloned)
  saveCanvasState()
  showToast("Tabla duplicada", "success")
}

function deleteTable() {
  if (!selectedElement) return

  showConfirmModal({
    title: "¿Eliminar tabla?",
    message: `Se eliminará la tabla "${selectedElement.tableData?.name || "seleccionada"}" permanentemente.`,
    icon: "fas fa-trash-alt",
    iconColor: "bg-gradient-to-r from-red-500 to-red-600",
    confirmText: "Sí, eliminar",
    onConfirm: () => {
      canvas.remove(selectedElement)
      hidePropertiesPanel()
      saveCanvasState()
      showToast("Tabla eliminada", "success")
    },
  })
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
  document.querySelectorAll(".color-preset-modern").forEach((preset) => {
    preset.classList.remove("active")
    if (preset.dataset.color === currentColor) {
      preset.classList.add("active")
    }
  })
}

// Manejar selección de objetos
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

// FUNCIÓN MEJORADA PARA REDIMENSIONAR CANVAS
function resizeCanvas() {
  if (!canvas) return

  const sidebarWidth = getSidebarWidth()
  const headerHeight = getHeaderHeight()
  const mobileToolbarHeight = isMobile ? 136 : 0

  const containerWidth = window.innerWidth - sidebarWidth
  const containerHeight = window.innerHeight - headerHeight - mobileToolbarHeight

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
      canvas.clear()
      canvas.backgroundColor = "white"
      canvas.renderAll()
      saveCanvasState()
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
window.addTableColumn = addTableColumn
window.removeTableColumn = removeTableColumn
window.updateTablePreview = updateTablePreview
window.showConfirmModal = showConfirmModal
window.showToast = showToast
window.saveBoard = saveBoard
window.loadBoard = loadBoard
window.loadFromLocalStorage = loadFromLocalStorage
