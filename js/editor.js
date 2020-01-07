/*

    MAIN EDITOR

*/

var globalFilesCount = 0

// Prevent unload
window.onbeforeunload = function () {
    // Warn before navigating away if there are any files imported
    if (globalFilesCount > 0) {
        return 'Are you sure you want to navigate away?'
    }
}

// Show errors in UI
window.onerror = function () {
    $('#photostack-error-toast').toast('show')
}

// Increase image count after imports
function increaseImageCount(number) {
    globalFilesCount += number
    document.querySelectorAll('.photostack-image-count').forEach(function (el) {
        el.textContent = globalFilesCount.toString()
    })
    var exportBtns = document.querySelectorAll('*[data-target="#photostack-export-modal"]')
    exportBtns.forEach(function (el) {
        if ((globalFilesCount > 0) && (el.disabled)) {
            el.disabled = false
        }
    })
}

// Read URL parameters
function getUrlVars() {
    var vars = {}
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value
    })
    return vars
}

// Resize a canvas using Pica library
function resizeCanvas(oldCanvas, width, height) {
    return new Promise(function (resolve) {
        // Create canvas with new size
        var newCanvas = document.createElement('canvas')
        newCanvas.width = width
        newCanvas.height = height
        // Get settings
        const options = {
            unsharpAmount: parseInt(document.getElementById('photostack-resize-unsharpAmount').value),
            unsharpRadius: 0.5,
            unsharpThreshold: 2,
            alpha: true
        }
        // Do the resize
        pica().resize(oldCanvas, newCanvas, options).then(function () {
            resolve(newCanvas)
        })
    })
}

// Apply settings to a canvas
function applyCanvasSettings(canvas, previewMode = false) {
    return new Promise(async function (resolve) {
        // Create aspect ratio from original canvas size
        var ratio = (canvas.width / canvas.height)
        // Resize image
        if (document.getElementById('photostack-image-width').value != '') {
            // Set new canvas size
            var width = parseInt(document.getElementById('photostack-image-width').value)
            if (previewMode && (width > 800)) {
                width = 800
            }
            var height = width / ratio
            // Do the resize
            canvas = await resizeCanvas(canvas, width, height)
        } else if (previewMode) {
            // Set new canvas size
            var width = 800
            var height = width / ratio
            // Do the resize
            canvas = await resizeCanvas(canvas, width, height)
        }
        // Apply watermark
        if (document.getElementById('photostack-watermark-img').hasAttribute('src')) {
            var watermark = document.getElementById('photostack-watermark-img')
            // Create temporary canvas for the watermark
            var watermarkCanvas = document.createElement('canvas')
            watermarkCanvas.width = watermark.naturalWidth
            watermarkCanvas.height = watermark.naturalHeight
            watermarkCanvas.getContext('2d').drawImage(watermark, 0, 0)
            // Calculate new size of watermark
            var resizeRatio = watermark.naturalHeight / watermark.naturalWidth
            var userSize = parseInt(globalWatermark.size)
            watermarkFinalWidth = canvas.width * (userSize / 100)
            watermarkFinalHeight = watermarkFinalWidth * resizeRatio
            // Do the resize
            watermarkCanvas = await resizeCanvas(watermark, watermarkFinalWidth, watermarkFinalHeight)
            // Set opacity
            var opacity = parseInt(globalWatermark.opacity) / 100
            watermarkCanvas.getContext('2d').globalAlpha = opacity
            // Set horiztonal and vertical insets
            var horizontalInset = canvas.width * (globalWatermark.horizontalInset / 100)
            var veritcalInset = canvas.height * (globalWatermark.veritcalInset / 100)
            // Set anchor position
            if (globalWatermark.anchorPosition === 1) {
                // Top-left alignment
                // Because the X and Y values start from the top-left, nothing happens here
            } else if (globalWatermark.anchorPosition === 2) {
                // Top-center alignment (Ignore: Horizontal)
                horizontalInset = (canvas.width / 2) - (watermarkCanvas.width / 2)
            } else if (globalWatermark.anchorPosition === 3) {
                // Top-right alignment
                horizontalInset = canvas.width - watermarkCanvas.width - horizontalInset
            } else if (globalWatermark.anchorPosition === 4) {
                // Middle-left alignment (Ignore: Vertical)
                veritcalInset = (canvas.height / 2) - (watermarkCanvas.height / 2)
            } else if (globalWatermark.anchorPosition === 5) {
                // Middle-center alignment (Ignore: Vertical & Horizontal)
                horizontalInset = (canvas.width / 2) - (watermarkCanvas.width / 2)
                veritcalInset = (canvas.height / 2) - (watermarkCanvas.height / 2)
            } else if (globalWatermark.anchorPosition === 6) {
                // Middle-right alignment (Ignore: Vertical)
                horizontalInset = canvas.width - watermarkCanvas.width - horizontalInset
                veritcalInset = (canvas.height / 2) - (watermarkCanvas.height / 2)
            } else if (globalWatermark.anchorPosition === 7) {
                // Bottom-left alignment
                veritcalInset = canvas.height - watermarkCanvas.height - veritcalInset
            } else if (globalWatermark.anchorPosition === 8) {
                // Bottom-center alignment (Ignore: Horizontal)
                veritcalInset = canvas.height - watermarkCanvas.height - veritcalInset
                horizontalInset = (canvas.width / 2) - (watermarkCanvas.width / 2)
            } else if (globalWatermark.anchorPosition === 9) {
                // Bottom-right alignment
                veritcalInset = canvas.height - watermarkCanvas.height - veritcalInset
                horizontalInset = canvas.width - watermarkCanvas.width - horizontalInset
            }
            // Draw completed image to temporary canvas
            canvas.getContext('2d').drawImage(watermarkCanvas, horizontalInset, veritcalInset)
        }
        resolve(canvas)
    })
}

// Render canvas of first image, apply settings, and show a preview
async function renderPreviewCanvas() {
    // Silently fail if there are no images imported
    if (document.querySelectorAll('#photostack-original-container img').length) {
        console.log('Rendering preview...')
    } else {
        console.log('Nothing to preview.')
        return
    }
    // Find elements
    var previewContainer = document.getElementById('photostack-editor-preview')
    var originalsContainer = document.getElementById('photostack-original-container')
    var canvasContainer = document.getElementById('photostack-canvas-container')
    // Create canvas element for first imported image
    var canvas = document.createElement('canvas')
    var originalImage = originalsContainer.firstChild
    canvas.width = originalImage.naturalWidth
    canvas.height = originalImage.naturalHeight
    // Add canvas element to canvas container
    canvasContainer.appendChild(canvas)
    canvas.getContext('2d').drawImage(originalImage, 0, 0)
    // Apply settings
    canvas = await applyCanvasSettings(canvas, true)
    // Create image element
    if (previewContainer.querySelector('img')) {
        previewContainer.querySelector('img').setAttribute('src', canvas.toDataURL())
    } else {
        var previewImage = document.createElement('img')
        previewImage.setAttribute('src', canvas.toDataURL())
        previewContainer.innerHTML = ''
        previewContainer.appendChild(previewImage)
    }
}

// Import images from file picker
function importLocalFiles(element) {
    // Get files
    var files = element.files
    console.log('Number of files selected: ' + files.length)
    // Add each image to originals container
    Array.prototype.forEach.call(files, function (file, index) {
        var image = document.createElement('img')
        var reader = new FileReader()
        // Set the image source to the reader result, once the reader is done
        reader.onload = function () {
            image.src = reader.result
        }
        reader.onerror = function () {
            alert('Could not import this image: ' + file.name)
        }
        // Once both the reader and image is done, we can safely add it to the originals container and clean up
        image.onload = function () {
            // Save image to originals container
            document.getElementById('photostack-original-container').appendChild(image)
            // Increase image counter
            increaseImageCount(1)
            if (index === 0) {
                renderPreviewCanvas()
            }
        }
        reader.readAsDataURL(file)
    })
    // Clear file select
    document.getElementById('photostack-import-file').value = ''
    // Close import modal if it's still open
    $('#photostack-import-modal').modal('hide')
}

// Import images from file picker
function importLocalZIP(element) {
    // Get file
    var file = element.files[0]
    // Switch modal content to progress indicator
    document.querySelector('.photostack-import-modal-initial').style.display = 'none'
    document.querySelector('.photostack-import-modal-zip').style.display = 'block'
    // Read the ZIP
    var zip = new JSZip()
    zip.loadAsync(file).then(function (zip) {
        var zipPromises = $.map(zip.files, function (file) {
            return new Promise(function (resolve) {
                // Only read files that are images, aren't directories, and aren't inside __MACOSX
                var supportedImages = (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.bmp') || (Modernizr.webp && file.name.endsWith('.webp')));
                if ((supportedImages) && (!file.dir) && (!file.name.includes('__MACOSX/'))) {
                    console.log(file)
                    // Add images to originals container
                    file.async('base64').then(function (data) {
                        var image = document.createElement('img')
                        // Add MIME type to each image so the browser can render them
                        if (file.name.endsWith('.png')) {
                            var base64 = 'data:image/png;base64,' + data
                        } else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                            var base64 = 'data:image/jpeg;base64,' + data
                        } else if (file.name.endsWith('.bmp')) {
                            var base64 = 'data:image/bmp;base64,' + data
                        } else if (file.name.endsWith('.webp')) {
                            var base64 = 'data:image/webp;base64,' + data
                        }
                        image.src = base64
                        // Save image to originals container
                        document.getElementById('photostack-original-container').appendChild(image)
                        increaseImageCount(1)
                        resolve()
                    })
                } else {
                    resolve()
                }
            })
        })
        // Continue once all canvases are rendered
        Promise.all(zipPromises).then(function () {
            // Generate image preview if there isn't one already
            if (!(document.querySelectorAll('.photostack-editor-preview img').length)) {
                renderPreviewCanvas()
            }
            // Clear file select
            document.getElementById('photostack-import-file').value = ''
            // Close import modal if it's still open
            $('#photostack-import-modal').modal('hide')
        })
    })
}

// Add image from URL
function importWebImage(url) {
    // Get image
    function addImageToCanvas(url) {
        var image = document.createElement('img')
        image.crossOrigin = 'anonymous'
        image.src = url
        image.onload = function () {
            console.log('Loaded image URL: ' + url)
            // Save image to originals container
            document.getElementById('photostack-original-container').appendChild(image)
            // Increase image counter
            increaseImageCount(1)
            // Generate preview
            renderPreviewCanvas()
        }
        image.onerror = function () {
            if (!url.includes('https://cors-anywhere.herokuapp.com/')) {
                console.log('Error loading image, trying CORS Anywhere...')
                addImageToCanvas('https://cors-anywhere.herokuapp.com/' + url)
            } else {
                alert('Could not import URL.')
            }
        }
    }
    addImageToCanvas(url)
    // Close import modal if it's still open
    $('#photostack-import-modal').modal('hide')
}

// Add image from Dropbox
function importDropboxImage() {
    // Set configuration for file picker
    options = {
        success: function (files) {
            // Send each URL to importWebImage function
            files.forEach(function (file) {
                importWebImage(file.link)
            })
            // Close import modal if it's still open
            $('#photostack-import-modal').modal('hide')
        },
        cancel: function () {
            // Close import modal if it's still open
            $('#photostack-import-modal').modal('hide')
        },
        linkType: "direct",
        multiselect: true,
        extensions: ['images'],
        folderselect: false
    }
    Dropbox.choose(options)
}

// Update sample file names when text is entered in the name pattern field
function updateSampleFileNames() {
    var text = document.getElementById('photostack-file-pattern').value
    if (text === '') {
        text = 'vacation'
    }
    document.querySelectorAll('.photostack-file-pattern-demo').forEach(function (el) {
        el.textContent = text
    })
}

// Async export with Promises
function asyncExport() {
    // Start timer
    console.time('Async export')
    // Set variables
    var imgFormat = document.getElementById('photostack-file-format').value
    var imgQuality = parseInt(document.getElementById('photostack-file-quality').value) / 100
    var imgNamePattern = document.getElementById('photostack-file-pattern').value
    if (imgNamePattern === '') {
        imgNamePattern = 'image'
    }
    var imgCount = document.querySelectorAll('#photostack-original-container img').length
    // Switch modal content to progress indicator
    document.querySelector('.photostack-export-modal-initial').style.display = 'none'
    document.querySelector('.photostack-export-modal-loading').style.display = 'block'
    // Start rendering canvases
    var originals = document.querySelectorAll('#photostack-original-container img')
    var canvasContainer = document.getElementById('photostack-canvas-container')
    // Clear current canvas elements
    canvasContainer.innerHTML = ''
    // Render canvas for each original image
    var canvasPromises = $.map(originals, function (original) {
        return new Promise(async function (resolve) {
            // Create canvas element
            var canvas = document.createElement('canvas')
            // Add canvas element to canvas container
            canvasContainer.appendChild(canvas)
            canvas.width = original.naturalWidth
            canvas.height = original.naturalHeight
            canvas.getContext('2d').drawImage(original, 0, 0)
            // Apply settings
            canvas = await applyCanvasSettings(canvas)
            resolve(canvas)
        })
    })
    // Continue once all canvases are rendered
    Promise.all(canvasPromises).then(function (canvases) {
        // Create a new ZIP object
        var zip = new JSZip()
        // Create promises for final render of each image
        var promises = $.map(canvases, function (canvas) {
            return new Promise(function (resolve) {
                canvas.toBlob(resolve, imgFormat, imgQuality)
            })
        })
        // Show the final export screen when all renders are completed
        Promise.all(promises).then(function (blobs) {
            // Create final array of blobs with file names
            var files = []
            blobs.forEach(function (blob, i) {
                if (imgFormat === 'image/jpeg') {
                    var fileEnding = '.jpg'
                } else if (imgFormat === 'image/png') {
                    var fileEnding = '.png'
                } else if (imgFormat === 'image/webp') {
                    var fileEnding = '.webp'
                }
                var num = i + 1
                var fileName = imgNamePattern + ' ' + num + fileEnding
                // Add to files array
                var file = new File([blob], fileName, {
                    lastModified: Date.now(),
                    type: imgFormat
                })
                files.push(file)
                // Add to ZIP file
                zip.file(fileName, file)
            })
            // Generate zip file
            console.log('Generating zip...')
            zip.generateAsync({ type: 'blob' })
                .then(function (content) {
                    // Show badge on PWA icon
                    if ('setExperimentalAppBadge' in navigator) {
                        navigator.setExperimentalAppBadge()
                    }
                    // Switch modal content to finished result
                    document.querySelector('.photostack-export-modal-loading').style.display = 'none'
                    document.querySelector('.photostack-export-modal-finished').style.display = 'block'
                    // Web Share API
                    var shareData = { files: files }
                    if (navigator.canShare && navigator.canShare(shareData)) {
                        document.getElementById('photostack-export-web-share-button').addEventListener('click', function () {
                            navigator.share(shareData)
                                .then(function () {
                                    console.log('Share successful.')
                                })
                                .catch(function (e) {
                                    console.error(e)
                                })
                        })
                    } else {
                        // Disable the native app share button if the API isn't available
                        document.getElementById('photostack-export-web-share-button').setAttribute('disabled', 'true')
                        $('#photostack-export-web-share-button').tooltip({
                            title: 'Your browser or platform does not support this feature.',
                        })
                    }
                    // Download files separately
                    document.getElementById('photostack-export-separate-button').addEventListener('click', function () {
                        files.forEach(function (file) {
                            saveAs(file)
                        })
                    })
                    // Download as ZIP
                    document.getElementById('photostack-export-zip-button').addEventListener('click', function () {
                        saveAs(content, 'images.zip')
                    })
                    // Stop time
                    console.timeEnd('Async export')
                })
        })
    })
}

// Export button in modal
document.getElementById('photostack-export-zip-btn').addEventListener('click', function () {
    asyncExport()
})

// Reset export modal content when the close button is clicked
$('#photostack-export-modal').on('hidden.bs.modal', function (e) {
    document.querySelector('.photostack-export-modal-loading').style.display = 'none'
    document.querySelector('.photostack-export-modal-finished').style.display = 'none'
    document.querySelector('.photostack-export-modal-initial').style.display = 'block'
    // Reset title
    document.title = 'PhotoStack'
    // Clear PWA icon
    if ('setExperimentalAppBadge' in navigator) {
        navigator.clearExperimentalAppBadge()
    }
})

// Reset import modal content when the close button is clicked
$('#photostack-import-modal').on('hidden.bs.modal', function (e) {
    document.querySelector('.photostack-import-modal-zip').style.display = 'none'
    document.querySelector('.photostack-import-modal-initial').style.display = 'block'
})

// Remove image formats from Export card that aren't supported
if (!Modernizr.todataurljpeg) {
    var option = document.querySelector('#photostack-file-format option[value="image/jpeg"]')
    option.setAttribute('disabled', true)
}
if (!Modernizr.todataurlwebp) {
    var option = document.querySelector('#photostack-file-format option[value="image/webp"]')
    option.setAttribute('disabled', true)
}

// Allow WebP imports if the image format is supported
Modernizr.on('webp', function (result) {
    if (result) {
        var formats = document.getElementById('photostack-import-file').getAttribute('accept')
        document.getElementById('photostack-import-file').setAttribute('accept', formats + ',image/webp')
    }
})

// Append event listeners to buttons and other elements

document.querySelectorAll('.photostack-import-file-btn').forEach(function (el) {
    el.addEventListener('click', function () {
        $('#photostack-import-file').click()
    })
})

document.getElementById('photostack-import-file').addEventListener('change', function () {
    importLocalFiles(this)
})

document.getElementById('photostack-import-url-button').addEventListener('click', function () {
    importWebImage(document.getElementById('photostack-import-url').value.trim())
})

document.querySelector('.photostack-import-dropbox-btn').addEventListener('click', function () {
    if (!Dropbox.isBrowserSupported()) {
        alert('Sorry, Dropbox does not support your web browser.')
    } else if (!navigator.onLine) {
        alert('You are not connected to the internet. Connect to the internet and try again.')
    } else {
        importDropboxImage()
    }
})

document.getElementById('photostack-import-zip-btn').addEventListener('click', function () {
    $('#photostack-import-zip').click()
})

document.getElementById('photostack-import-zip').addEventListener('change', function () {
    importLocalZIP(this)
})

document.getElementById('photostack-resize-apply-btn').addEventListener('click', function () {
    renderPreviewCanvas()
})

document.getElementById('photostack-sharpness-apply-btn').addEventListener('click', function () {
    renderPreviewCanvas()
})

document.getElementById('photostack-reset-image-width-button').addEventListener('click', function () {
    document.getElementById('photostack-image-width').value = ''
    renderPreviewCanvas()
})

// Show name pattern example in real-time
document.getElementById('photostack-file-pattern').addEventListener('keyup', function () {
    updateSampleFileNames()
})

// Update sample file names when the page is loaded
updateSampleFileNames()

// Show welcome page on first run, or else open the import popup
if (localStorage['welcome-editor'] != 'true') {
    $('#photostack-welcome-modal').modal('show')
    // Don't show welcome screen again after it is exited
    document.querySelector('#photostack-welcome-modal .btn-block').addEventListener('click', function () {
        localStorage['welcome-editor'] = 'true'
    })
} else {
    //$('#photostack-import-modal').modal('show')
}

// API support
// See readme.md in v1 folder for more information
if (getUrlVars()['import']) {
    // Create array of URLs to import
    var imageArray = getUrlVars()['import'].split(',')
    // Filter out empty items
    imageArray = imageArray.filter(Boolean)
    // Import the images
    imageArray.forEach(function (url) {
        importWebImage(decodeURIComponent(url))
    })
    // Remove parameters from URL
    window.history.replaceState({}, document.title, document.URL.substring(0, document.URL.indexOf('?')))
}

/*

    WATERMARKS

*/

//TODO: Store watermark config as data variables in <img> object
var globalWatermark = {}

var watermarksStore = localforage.createInstance({
    name: 'Watermarks',
    driver: [localforage.WEBSQL, localforage.INDEXEDDB]
})

// Open watermark in watermark editor
function openWatermarkEditor(watermarkKey) {
    // Add data to modal before opening
    document.getElementById('photostack-watermark-editor-modal-title').innerText = watermarkKey
    document.getElementById('photostack-watermark-editor-modal').setAttribute('data-watermark', watermarkKey)
    // Open the modal
    $('#photostack-watermark-manager-modal').modal('hide')
    $('#photostack-watermark-editor-modal').modal('show')
}

// Export watermark to JSON file
function exportWatermark(watermarkKey) {
    watermarksStore.getItem(watermarkKey).then(function (value) {
        var watermarkText = JSON.stringify(value)
        var fileName = watermarkKey + ".json"
        var blob = new Blob([watermarkText], { type: 'application/json;charset=utf-8' })
        saveAs(blob, fileName)
    }).catch(function (err) {
        alert('Error: ' + err)
    })
}

// Delete watermark from storage
function deleteWatermark(watermarkKey) {
    if (confirm('Are you sure you want to delete the watermark "' + watermarkKey + '"? This cannot be undone.')) {
        watermarksStore.removeItem(watermarkKey).then(function () {
            refreshWatermarks()
        }).catch(function (err) {
            alert('Error: ' + err)
        })
    }
}

// Import watermark from JSON file
function importWatermarkSettings(el) {
    // Create a promise for each file
    var importPromises = $.map(el.files, function (file) {
        return new Promise(function (resolve) {
            // Read the file
            var reader = new FileReader()
            reader.onload = function () {
                // Make sure file is valid JSON
                try {
                    var watermarkObj = JSON.parse(reader.result)
                } catch (err) {
                    alert('Error: ' + err)
                    resolve()
                }
                // Add watermark to localStorage
                var watermarkName = file.name.replace('.json', '')
                watermarksStore.setItem(watermarkName, watermarkObj).then(function () {
                    resolve()
                }).catch(function (err) {
                    alert('Error: ' + err)
                    resolve()
                })
            }
            reader.onerror = function (event) {
                alert('Error: ' + event)
                resolve()
            }
            reader.readAsText(file)
        })
    })
    // When all promises are returned, clean up
    Promise.all(importPromises).then(function () {
        // Clear file select
        document.getElementById('photostack-watermark-file-import').value = ''
        // Refresh watermarks
        refreshWatermarks()
    })
}

async function refreshWatermarks(firstLoad = false) {
    if (firstLoad) {
        // Migrate watermarks from localStorage to localForage
        for (var i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).includes('Watermark: ')) {
                var watermarkName = localStorage.key(i).replace('Watermark: ', '') // Remove "Watermark: " from the key name
                var watermarkValue = JSON.parse(localStorage.getItem(localStorage.key(i)))
                console.log('Migrating watermark "' + watermarkName + '" to updated storage...')
                // Copy data to localForage
                await watermarksStore.setItem(watermarkName, watermarkValue)
                // Delete old item
                localStorage.removeItem(localStorage.key(i))
            }
        }
    }
    // Reset lists
    document.getElementById('photostack-watermark-select').innerHTML = '<option selected="" value="no-watermark">No watermark</option>'
    document.getElementById('photostack-watermark-manager-list').innerHTML = ''
    // Add watermarks to editor dropdown menu and watermark manager
    await watermarksStore.iterate(function (value, key, iterationNumber) {
        // Add watermark to select menu
        var option = document.createElement('option')
        option.innerText = key
        option.value = key
        document.getElementById('photostack-watermark-select').appendChild(option)
        // Add watermark to manager modal list
        var listItem = document.createElement('div')
        listItem.classList.add('list-group-item')
        var itemTitle = document.createElement('h5')
        itemTitle.innerText = key
        listItem.appendChild(itemTitle)
        // Add button container to list
        var buttons = document.createElement('div')
        buttons.classList.add('btn-group', 'btn-block')
        buttons.setAttribute('role', 'group')
        listItem.appendChild(buttons)
        // Add edit button
        var editBtn = document.createElement('button')
        editBtn.innerText = 'Edit'
        editBtn.classList.add('btn', 'btn-primary', 'btn-sm')
        editBtn.addEventListener('click', function () {
            openWatermarkEditor(key)
        })
        buttons.appendChild(editBtn)
        // Add export button
        var exportBtn = document.createElement('button')
        exportBtn.innerText = 'Export'
        exportBtn.classList.add('btn', 'btn-secondary', 'btn-sm')
        exportBtn.addEventListener('click', function () {
            exportWatermark(key)
        })
        buttons.appendChild(exportBtn)
        // Add delete button
        var deleteBtn = document.createElement('button')
        deleteBtn.innerText = 'Delete'
        deleteBtn.classList.add('btn', 'btn-danger', 'btn-sm')
        deleteBtn.addEventListener('click', function () {
            deleteWatermark(key)
        })
        buttons.appendChild(deleteBtn)
        // Add everything to the list
        document.getElementById('photostack-watermark-manager-list').appendChild(listItem)
        console.log('Loaded watermark:', [key, value])
    })
}

// Watermark select menu in main editor
document.getElementById('photostack-watermark-select').addEventListener('change', async function () {
    var watermarkImg = document.getElementById('photostack-watermark-img')
    if (this.value != 'no-watermark') {
        var watermarkObj = await watermarksStore.getItem((this.value))
        globalWatermark = watermarkObj
        // Copy current watermark to DOM to avoid JS hangups
        watermarkImg.onload = function () {
            // Generate preview
            renderPreviewCanvas()
        }
        document.getElementById('photostack-watermark-img').setAttribute('src', watermarkObj.image)
    } else {
        // Reset watermark
        globalWatermark = {}
        // Delete current watermark image
        document.getElementById('photostack-watermark-img').removeAttribute('src')
        // Generate preview
        renderPreviewCanvas()
    }
})

refreshWatermarks(true)

document.getElementById('photostack-watermark-import-btn').addEventListener('click', function () {
    $('#photostack-watermark-file-import').click()
})

document.getElementById('photostack-watermark-file-import').addEventListener('change', function () {
    importWatermarkSettings(this)
})