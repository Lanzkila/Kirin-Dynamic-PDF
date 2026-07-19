pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let tabs = [];
let currentTabId = null;
let tabCounter = 0;

function addNewTab() {
    if (tabs.length >= 10) return;
    tabCounter++;
    const id = tabCounter;
    tabs.push(id);

    // Buat Tab Element (Mengikut reka bentuk baru)
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.id = 'tab-' + id;
    tabEl.setAttribute('onclick', 'switchTab(' + id + ')');
    tabEl.innerHTML = '<span id="title-' + id + '">Tab ' + id + '</span><span class="close-btn" onclick="closeTab(' + id + ', event)">×</span>';
    
    const tabBar = document.getElementById('tabBar');
    tabBar.insertBefore(tabEl, tabBar.lastElementChild);

    // Buat Content Slot Element
    const slotEl = document.createElement('div');
    slotEl.className = 'slot';
    slotEl.id = 'slot-' + id;
    slotEl.innerHTML = '<div class="empty-view">Sila klik butang 📁 di atas<br/>untuk Tab ' + id + '</div>';
    document.getElementById('content-area').appendChild(slotEl);

    switchTab(id);
}

function switchTab(id) {
    currentTabId = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.getElementById('slot-' + id).classList.add('active');
}

function closeTab(id, event) {
    event.stopPropagation();
    if (tabs.length <= 1) return;
    tabs = tabs.filter(t => t !== id);
    document.getElementById('tab-' + id).remove();
    document.getElementById('slot-' + id).remove();
    if (currentTabId === id) {
        switchTab(tabs[tabs.length - 1]);
    }
}

// Handler Render fail PDF
async function renderPDF(source, id) {
    const slot = document.getElementById('slot-' + id);
    const loader = document.getElementById('loader');
    slot.innerHTML = '';
    loader.style.display = 'block';
    loader.innerText = "Rendering PDF Pages...";

    try {
        const pdf = await pdfjsLib.getDocument(source).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            slot.appendChild(canvas);
        }
    } catch (e) {
        slot.innerHTML = '<div class="empty-view" style="color:#ff3e3e">Gagal render PDF.</div>';
    }
    loader.style.display = 'none';
}

// Handler Render fail ZIP / CBZ
async function renderArchive(file, id) {
    const slot = document.getElementById('slot-' + id);
    const loader = document.getElementById('loader');
    slot.innerHTML = '';
    loader.style.display = 'block';
    loader.innerText = "Extracting Archive Pages...";

    try {
        const zip = await JSZip.loadAsync(file);
        const imageFiles = [];

        zip.forEach((path, entry) => {
            if (entry.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) && !entry.name.includes('__MACOSX')) {
                imageFiles.push(entry);
            }
        });

        imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

        if (imageFiles.length === 0) {
            slot.innerHTML = '<div class="empty-view" style="color:#ff3e3e">Tiada fail imej ditemui di dalam arkib.</div>';
            loader.style.display = 'none';
            return;
        }

        for (let fileObj of imageFiles) {
            const blob = await fileObj.async("blob");
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.loading = "lazy";
            slot.appendChild(img);
        }
    } catch (e) {
        slot.innerHTML = '<div class="empty-view" style="color:#ff3e3e">Gagal memproses fail CBZ/ZIP.</div>';
    }
    loader.style.display = 'none';
}

function loadLocalFile(input) {
    if (input.files && input.files[0] && currentTabId) {
        const file = input.files[0];
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const targetId = currentTabId;

        document.getElementById('title-' + targetId).innerText = fileName.substring(0, 10) + (fileName.length > 10 ? '..' : '');

        if (fileExtension === 'pdf') {
            const reader = new FileReader();
            reader.onload = function() {
                const data = new Uint8Array(this.result);
                renderPDF(data, targetId);
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'cbz' || fileExtension === 'zip') {
            renderArchive(file, targetId);
        } else {
            alert("Format fail tidak disokong! Sila gunakan .pdf, .cbz, atau .zip");
        }
        
        input.value = '';
    }
}

// Auto-start tab pertama semasa load
addNewTab();
