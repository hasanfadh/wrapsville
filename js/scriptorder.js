var TOKEN = typeof __APPS_TOKEN__ !== "undefined" ? __APPS_TOKEN__ : "";

document.addEventListener("DOMContentLoaded", () => {

    // cart: { "hot-classic-ori": 2, "hot-classic-1": 1, ... }
    let cart = {};
    let deliveryFee = 0;
    let sauceFee = 0;
    let sauceQty = 0;
    let totalItemsCount = 0;

    const form            = document.getElementById("orderForm");
    const totalPesananEl  = document.getElementById("totalPesanan");
    const totalHargaEl    = document.getElementById("totalHarga");
    const submitButton    = document.getElementById("submitButton");
    const buktiTransferInput = document.getElementById("buktiTransfer");
    const previewBuktiEl  = document.getElementById("previewBukti");
    const statusMessageEl = document.getElementById("statusMessage");

    const requiredInputs = [
        document.getElementById("nama"),
        document.getElementById("whatsapp"),
        document.getElementById("alamat"),
        buktiTransferInput
    ];

    const levelLabels = { ori: "Ori", 1: "Level 1", 2: "Level 2", 3: "Level 3" };

    // -------------------------------------------------------
    // Setup tiap .menu-item
    // -------------------------------------------------------
    document.querySelectorAll(".menu-item").forEach(item => {
        const itemId   = item.dataset.itemId;
        const levelBtns = item.querySelectorAll(".level-btn");
        const rowsContainer = item.querySelector(".level-rows");

        levelBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const level   = btn.dataset.level;
                const cartKey = `${itemId}-${level}`;

                // Kalau baris sudah ada, abaikan
                if (rowsContainer.querySelector(`[data-cart-key="${cartKey}"]`)) return;

                // Disable tombol level ini
                btn.disabled = true;
                btn.classList.add("active");

                // Buat baris baru
                const row = document.createElement("div");
                row.className = "level-row";
                row.dataset.cartKey = cartKey;
                row.innerHTML = `
                    <span class="level-row-label">${levelLabels[level] || "Level " + level}</span>
                    <div class="level-row-right">
                        <div class="quantity-box">
                            <button type="button" class="quantity-btn" data-action="decrease">-</button>
                            <span class="quantity-display">0</span>
                            <button type="button" class="quantity-btn" data-action="increase">+</button>
                        </div>
                        <button type="button" class="remove-row-btn" title="Hapus">×</button>
                    </div>
                `;

                // Listener +/-
                row.querySelector("[data-action='increase']").addEventListener("click", () => {
                    cart[cartKey] = (cart[cartKey] || 0) + 1;
                    row.querySelector(".quantity-display").textContent = cart[cartKey];
                    updateSummary();
                });
                row.querySelector("[data-action='decrease']").addEventListener("click", () => {
                    if ((cart[cartKey] || 0) > 0) {
                        cart[cartKey]--;
                        row.querySelector(".quantity-display").textContent = cart[cartKey];
                        if (cart[cartKey] === 0) delete cart[cartKey];
                        updateSummary();
                    }
                });

                // Listener × hapus baris
                row.querySelector(".remove-row-btn").addEventListener("click", () => {
                    delete cart[cartKey];
                    row.remove();
                    // Re-enable tombol level
                    btn.disabled = false;
                    btn.classList.remove("active");
                    updateSummary();
                });

                rowsContainer.appendChild(row);
            });
        });
    });

    // -------------------------------------------------------
    // Delivery fee
    // -------------------------------------------------------
    document.querySelectorAll('input[name="opsiPengiriman"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            const label = e.target.closest(".delivery-option");
            deliveryFee = parseInt(label.dataset.fee || "0", 10);

            // Alamat cuma perlu diisi kalau pesanan diantar Ojek Online.
            // Self Pick Up & Ambil Sendiri (COD) = kolom alamat terkunci.
            const alamatInput = document.getElementById("alamat");
            const noAddressNeeded = e.target.value === "Self Pick Up" || e.target.value === "Ambil Sendiri (COD)";

            if (noAddressNeeded) {
                alamatInput.value = "";
                alamatInput.disabled = true;
                alamatInput.placeholder = "Tidak perlu alamat untuk opsi ini";
                alamatInput.classList.remove("input-error");
            } else {
                alamatInput.disabled = false;
                alamatInput.placeholder = "Masukan link maps alamat kamu";
            }

            updateSummary();
        });
    });

    // -------------------------------------------------------
    // Additional Sauce
    // -------------------------------------------------------
    document.getElementById("sauceDecrease").addEventListener("click", () => {
        if (sauceQty > 0) { sauceQty--; document.getElementById("sauceQtyDisplay").textContent = sauceQty; }
        sauceFee = sauceQty * 3000;
        updateSummary();
    });
    document.getElementById("sauceIncrease").addEventListener("click", () => {
        sauceQty++;
        document.getElementById("sauceQtyDisplay").textContent = sauceQty;
        sauceFee = sauceQty * 3000;
        updateSummary();
    });

    // -------------------------------------------------------
    // File preview
    // -------------------------------------------------------
    buktiTransferInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) { previewBuktiEl.style.display = "none"; return; }
        previewBuktiEl.src = URL.createObjectURL(file);
        previewBuktiEl.style.display = "block";
    });

    form.addEventListener("submit", handleSubmit);

    // -------------------------------------------------------
    // updateSummary
    // -------------------------------------------------------
    function updateSummary() {
        let totalItems = 0;
        let menuPrice  = 0;

        // Reset semua hidden field menu ke 0
        ["hotClassicOri","hotClassicLvl1","hotClassicLvl2","hotClassicLvl3",
         "hotSlawOri","hotSlawLvl1","hotSlawLvl2","hotSlawLvl3",
         "hotNFriesOri","hotNFriesLvl1","hotNFriesLvl2","hotNFriesLvl3"
        ].forEach(f => { const el = document.getElementById(f+"Input"); if (el) el.value = "0"; });

        for (const cartKey in cart) {
            const qty = cart[cartKey];
            if (!qty || qty <= 0) continue;
            totalItems += qty;

            // Cari price dari parent .menu-item
            const itemId     = cartKey.substring(0, cartKey.lastIndexOf("-"));
            const menuItemEl = document.querySelector(`.menu-item[data-item-id="${itemId}"]`);
            if (menuItemEl) {
                const price = parseInt(menuItemEl.dataset.price || "0", 10);
                menuPrice += price * qty;
            }

            // Update hidden field
            const fieldName  = convertCartKeyToFieldName(cartKey);
            const hiddenField = document.getElementById(fieldName + "Input");
            if (hiddenField) hiddenField.value = qty;
        }

        totalItemsCount = totalItems;

        const totalPrice = menuPrice + deliveryFee + sauceFee;

        totalPesananEl.textContent = `${totalItems} pcs`;
        totalHargaEl.textContent   = formatCurrency(totalPrice);
        document.getElementById("totalPesananInput").value = totalItems;
        document.getElementById("totalHargaInput").value   = formatCurrency(totalPrice);

        const sauceEl = document.getElementById("additionalSauceQtyInput");
        if (sauceEl) sauceEl.value = sauceQty;
    }

    function convertCartKeyToFieldName(cartKey) {
        const parts       = cartKey.split("-");
        const level       = parts[parts.length - 1];
        const levelSuffix = level === "ori" ? "Ori" : "Lvl" + level;
        if (parts[0] === "hot" && parts[1] === "classic") return `hotClassic${levelSuffix}`;
        if (parts[0] === "hot" && parts[1] === "slaw")    return `hotSlaw${levelSuffix}`;
        if (parts[0] === "hot" && parts[1] === "n" && parts[2] === "fries") return `hotNFries${levelSuffix}`;
        return cartKey;
    }

    function formatCurrency(n) {
        return "Rp " + new Intl.NumberFormat("id-ID").format(n);
    }

    // -------------------------------------------------------
    // Submit
    // -------------------------------------------------------
    function getSelectedDelivery() {
        const checked = document.querySelector('input[name="opsiPengiriman"]:checked');
        return checked ? checked.value : null;
    }

    function prepareHiddenFields() {
        const alamatEl = document.getElementById("alamat");
        document.getElementById("timestampInput").value    = new Date().toLocaleString("id-ID");
        document.getElementById("namaInput").value         = document.getElementById("nama").value;
        document.getElementById("whatsappInput").value     = document.getElementById("whatsapp").value;
        document.getElementById("alamatInput").value       = alamatEl.disabled ? "-" : alamatEl.value;
        document.getElementById("catatanInput").value      = document.getElementById("catatan").value;
        document.getElementById("opsiPengirimanInput").value = getSelectedDelivery() || "";
    }

    function saveOrderToSession() {
        const alamatSesi = document.getElementById("alamat");
        sessionStorage.setItem("wrapsvilleOrder", JSON.stringify({
            nama:              document.getElementById("nama").value,
            wa:                document.getElementById("whatsapp").value,
            alamat:            alamatSesi.disabled ? "-" : alamatSesi.value,
            catatan:           document.getElementById("catatan").value,
            opsiPengiriman:    getSelectedDelivery(),
            deliveryFee:       deliveryFee,
            additionalSauce:   sauceQty > 0,
            additionalSauceQty: sauceQty,
            total:             totalHargaEl.textContent,
            menu:              { ...cart },
            timestamp:         new Date().toISOString()
        }));
    }

    function setButtonLoading(isLoading) {
        submitButton.disabled    = isLoading;
        submitButton.textContent = isLoading ? "Mengirim..." : "Kirim Pesanan";
        submitButton.style.opacity = isLoading ? "0.7" : "1";
        submitButton.style.cursor  = isLoading ? "not-allowed" : "pointer";
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result.split(",")[1]);
            reader.onerror = () => reject(new Error("Gagal membaca file"));
            reader.readAsDataURL(file);
        });
    }

    function getMimeType(file) {
        if (file.type) return file.type;
        const ext   = file.name.split(".").pop().toLowerCase();
        const mimes = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", heic:"image/heic", gif:"image/gif" };
        return mimes[ext] || "image/jpeg";
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Validasi input teks
        let hasMissing = false;
        requiredInputs.forEach(i => i.classList.remove("input-error"));
        requiredInputs.forEach(i => {
            if (i.disabled) return; // kolom terkunci (mis. alamat saat Self Pick Up / Ambil Sendiri) tidak wajib
            const empty = (i.type === "file" && i.files.length === 0) || (i.type !== "file" && i.value.trim() === "");
            if (empty) { hasMissing = true; i.classList.add("input-error"); }
        });

        const selectedDelivery = getSelectedDelivery();
        const deliveryEl = document.querySelector(".delivery-options");
        if (!selectedDelivery) {
            hasMissing = true;
            deliveryEl.classList.add("delivery-error");
            deliveryEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            deliveryEl.classList.remove("delivery-error");
        }

        if (totalItemsCount <= 0) hasMissing = true;

        if (hasMissing) {
            // Kalau ada input teks kosong atau menu kosong, tampilkan statusMessage
            // Kalau hanya delivery yang kosong, sudah ada inline error + scroll, tidak perlu double pesan
            const onlyDeliveryMissing = !selectedDelivery &&
                requiredInputs.every(i => i.disabled || (i.type === "file" ? i.files.length > 0 : i.value.trim() !== "")) &&
                totalItemsCount > 0;

            if (!onlyDeliveryMissing) {
                let msg = "Mohon lengkapi semua data sebelum mengirim pesanan.";
                if (totalItemsCount <= 0) msg = "Pilih minimal 1 menu dan lengkapi semua data.";
                showMessage(msg, "error");
            }
            return;
        }

        prepareHiddenFields();
        setButtonLoading(true);
        statusMessageEl.style.display = "none";

        try {
            const file      = buktiTransferInput.files[0];
            const base64Data = await fileToBase64(file);
            const mimeType  = getMimeType(file);

            const params = new URLSearchParams();
            form.querySelectorAll('input[type="hidden"]').forEach(f => {
                if (f.name) params.append(f.name, f.value);
            });
            params.append("buktiTransfer", base64Data);
            params.append("buktiMimeType", mimeType);
            params.append("buktiNamaFile", file.name);
            params.append("token", TOKEN);

            const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString()
            });

            const data = await response.json();

            if (data.status === "success") {
                saveOrderToSession();
                window.location.href = "success.html";
            } else if (data.status === "closed") {
                window.location.href = "closed.html";
            } else if (data.status === "over_limit") {
                showMessage("" + data.message, "error");
                setButtonLoading(false);
            } else {
                throw new Error(data.message || "Server menolak pesanan.");
            }

        } catch (err) {
            console.error("Submit error:", err);
            showMessage("Gagal mengirim. Coba lagi atau hubungi kami via WhatsApp.", "error");
            setButtonLoading(false);
        }
    }

    function showMessage(message, type) {
        statusMessageEl.textContent    = message;
        statusMessageEl.className      = type;
        statusMessageEl.style.display  = "block";
    }
});