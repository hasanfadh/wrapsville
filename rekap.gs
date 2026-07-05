// ============================================================
//  Wrapsville - Rekap Pesanan (mudah dibaca)
//
//  CARA PAKAI (sekali saja):
//  1. Buka spreadsheet Raw_Data_Wrapsville
//  2. Menu: Ekstensi -> Apps Script
//  3. Di editor: klik ikon "+" di samping "Files" -> Script,
//     beri nama "rekap", lalu paste seluruh isi file ini
//  4. Simpan (Ctrl+S), pilih fungsi "buatRekap" di dropdown atas,
//     klik "Run" -> izinkan akses saat diminta
//  5. Kembali ke spreadsheet: tab baru "Rekap Pesanan" sudah jadi
//
//  Setelah itu, setiap buka spreadsheet akan muncul menu
//  "🌯 Wrapsville" di bar atas untuk memperbarui rekap sekali klik.
//  Kalau mau otomatis terus, jalankan "aktifkanAutoUpdate" sekali
//  (rekap diperbarui sendiri tiap 5 menit).
// ============================================================

var REKAP_SHEET_NAME = "Rekap Pesanan";

// Daftar kolom menu di sheet mentah -> label yang enak dibaca
var MENU_COLS = [
  ["Hot_Slaw_Ori",     "Hot Slaw Ori"],
  ["Hot_Slaw_Lvl1",    "Hot Slaw Lv 1"],
  ["Hot_Slaw_Lvl2",    "Hot Slaw Lv 2"],
  ["Hot_Slaw_Lvl3",    "Hot Slaw Lv 3"],
  ["Hot_Classic_Ori",  "Hot Classic Ori"],
  ["Hot_Classic_Lvl1", "Hot Classic Lv 1"],
  ["Hot_Classic_Lvl2", "Hot Classic Lv 2"],
  ["Hot_Classic_Lvl3", "Hot Classic Lv 3"],
  ["HotNFries_Ori",    "Hot N Fries Ori"],
  ["HotNFries_Lvl1",   "Hot N Fries Lv 1"],
  ["HotNFries_Lvl2",   "Hot N Fries Lv 2"],
  ["HotNFries_Lvl3",   "Hot N Fries Lv 3"]
];

// Menu custom di bar atas spreadsheet
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🌯 Wrapsville")
    .addItem("Perbarui Rekap Pesanan", "buatRekap")
    .addItem("Aktifkan Auto-Update (tiap 5 menit)", "aktifkanAutoUpdate")
    .addToUi();
}

// Bikin ulang tab "Rekap Pesanan" dari data mentah
function buatRekap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var raw = cariSheetMentah_(ss);
  if (!raw) throw new Error("Sheet data mentah tidak ditemukan (cari header 'Nama_Pemesan').");

  var data = raw.getDataRange().getValues();
  if (data.length < 2) return; // belum ada pesanan

  var headers = data[0];
  var idx = buatIndexHeader_(headers);

  // Kolom opsional: hanya tampil kalau memang ada di data mentah
  var adaKelurahan = idx["kelurahan"] !== undefined;
  var adaSauce = idx["additionalsauce"] !== undefined;

  var judul = ["Waktu Order", "Nama", "No. WhatsApp", "Pesanan", "Total (pcs)", "Total Harga", "Pengiriman"];
  if (adaKelurahan) judul.push("Kelurahan");
  judul.push("Alamat", "Catatan", "Bukti Transfer");

  var barisRekap = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var nama = ambil_(row, idx, "namapemesan");
    if (!nama) continue; // lewati baris kosong

    // Susun ringkasan pesanan, contoh:
    // • Hot Slaw Lv 1 (2)
    // • Hot Classic Ori (1)
    var items = [];
    var totalHitung = 0;
    for (var m = 0; m < MENU_COLS.length; m++) {
      var jumlah = Number(ambil_(row, idx, MENU_COLS[m][0])) || 0;
      if (jumlah > 0) {
        items.push("• " + MENU_COLS[m][1] + " (" + jumlah + ")");
        totalHitung += jumlah;
      }
    }
    if (adaSauce) {
      var sauce = Number(ambil_(row, idx, "additionalsauce")) || 0;
      if (sauce > 0) items.push("• Extra Sauce (" + sauce + ")");
    }

    var total = ambil_(row, idx, "totalpesanan");
    if (total === "" || total === undefined) total = totalHitung;

    var baris = [
      ambil_(row, idx, "timestamp"),
      nama,
      rapikanNomorWA_(ambil_(row, idx, "notelp")),
      items.join("\n"),
      total,
      ambil_(row, idx, "totalharga"),
      ambil_(row, idx, "opsipengiriman")
    ];
    if (adaKelurahan) baris.push(ambil_(row, idx, "kelurahan"));
    baris.push(
      ambil_(row, idx, "alamat"),
      ambil_(row, idx, "catatan"),
      ambil_(row, idx, "buktitransfer")
    );
    barisRekap.push(baris);
  }

  // Tulis ulang tab rekap dari nol biar selalu konsisten
  var rekap = ss.getSheetByName(REKAP_SHEET_NAME);
  if (!rekap) rekap = ss.insertSheet(REKAP_SHEET_NAME);
  rekap.clear();
  rekap.getBandings().forEach(function (b) { b.remove(); });

  var nKol = judul.length;
  rekap.getRange(1, 1, 1, nKol).setValues([judul]);

  if (barisRekap.length > 0) {
    // Kolom WhatsApp diformat teks dulu supaya angka 0 di depan tidak hilang
    rekap.getRange(2, 3, barisRekap.length, 1).setNumberFormat("@");
    rekap.getRange(2, 1, barisRekap.length, nKol).setValues(barisRekap);
  }

  // ===== Tata rias =====
  var header = rekap.getRange(1, 1, 1, nKol);
  header.setBackground("#ed0100")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setVerticalAlignment("middle");
  rekap.setFrozenRows(1);
  rekap.setRowHeight(1, 34);

  if (barisRekap.length > 0) {
    var body = rekap.getRange(2, 1, barisRekap.length, nKol);
    body.setWrap(true).setVerticalAlignment("top");
    body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }

  // Lebar kolom biar enak dilihat
  var lebar = [140, 140, 130, 240, 90, 110, 200];
  if (adaKelurahan) lebar.push(120);
  lebar.push(260, 180, 200);
  for (var c = 0; c < lebar.length; c++) rekap.setColumnWidth(c + 1, lebar[c]);
}

// Auto-update rekap tiap 5 menit (jalankan sekali saja)
function aktifkanAutoUpdate() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "buatRekap") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("buatRekap").timeBased().everyMinutes(5).create();
  try {
    SpreadsheetApp.getUi().alert("Auto-update aktif! Rekap akan diperbarui otomatis tiap 5 menit.");
  } catch (e) {}
}

// ===== Helper =====

// Cari sheet mentah: yang punya header "Nama_Pemesan" di baris 1
function cariSheetMentah_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === REKAP_SHEET_NAME) continue;
    if (sheets[i].getLastRow() < 1) continue;
    var h = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0];
    for (var j = 0; j < h.length; j++) {
      if (normal_(h[j]) === "namapemesan") return sheets[i];
    }
  }
  return null;
}

// Map header (dinormalkan) -> nomor kolom, biar tahan beda ejaan/urutan
function buatIndexHeader_(headers) {
  var idx = {};
  for (var i = 0; i < headers.length; i++) {
    var key = normal_(headers[i]);
    if (key && idx[key] === undefined) idx[key] = i;
  }
  return idx;
}

function normal_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ambil_(row, idx, namaKolom) {
  var i = idx[normal_(namaKolom)];
  return (i === undefined) ? "" : row[i];
}

// 81234... / 6281234... -> 081234...
function rapikanNomorWA_(v) {
  var digits = String(v).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.indexOf("62") === 0) digits = "0" + digits.substring(2);
  else if (digits.charAt(0) !== "0") digits = "0" + digits;
  return digits;
}
