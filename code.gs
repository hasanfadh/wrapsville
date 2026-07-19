// ============================================================
//  Wrapsville - Google Apps Script
//  Urutan kolom sheet:
//  Timestamp | Nama_Pemesan | No_Telp |
//  Hot_Slaw_Ori | Hot_Slaw_Lvl1 | Hot_Slaw_Lvl2 | Hot_Slaw_Lvl3 |
//  Hot_Classic_Ori | Hot_Classic_Lvl1 | Hot_Classic_Lvl2 | Hot_Classic_Lvl3 |
//  HotNFries_Ori | HotNFries_Lvl1 | HotNFries_Lvl2 | HotNFries_Lvl3 |
//  Opsi Pengiriman | Additional Sauce |
//  Total_Pesanan | Alamat | Catatan | Total_Harga | Bukti_Transfer
// ============================================================

var SHEET_NAME = "Sheet1";
var FOLDER_NAME = "Bukti Transfer Wrapsville";

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var params = e.parameters;

    function get(key, def) {
      return (params[key] && params[key][0] !== undefined) ? params[key][0] : (def !== undefined ? def : "");
    }

    // Timestamp dibuat di server (bukan pakai kiriman client) biar format selalu konsisten
    var timestamp      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    var nama           = get("nama");
    var whatsapp       = get("whatsapp");
    var alamat         = get("alamat");
    var catatan        = get("catatan");
    var opsiPengiriman = get("opsiPengiriman");
    var totalPesanan   = get("totalPesanan");
    var totalHarga     = get("totalHarga");
    var sauceQty       = get("additionalSauceQty", "0");

    // Menu — default 0 jika tidak dikirim
    var hotSlawOri      = get("hotSlawOri",     "0");
    var hotSlawLvl1     = get("hotSlawLvl1",    "0");
    var hotSlawLvl2     = get("hotSlawLvl2",    "0");
    var hotSlawLvl3     = get("hotSlawLvl3",    "0");
    var hotClassicOri   = get("hotClassicOri",  "0");
    var hotClassicLvl1  = get("hotClassicLvl1", "0");
    var hotClassicLvl2  = get("hotClassicLvl2", "0");
    var hotClassicLvl3  = get("hotClassicLvl3", "0");
    var hotNFriesOri    = get("hotNFriesOri",   "0");
    var hotNFriesLvl1   = get("hotNFriesLvl1",  "0");
    var hotNFriesLvl2   = get("hotNFriesLvl2",  "0");
    var hotNFriesLvl3   = get("hotNFriesLvl3",  "0");

    // Upload bukti transfer ke Google Drive
    var buktiUrl = "";
    try {
      var fileData = params["buktiTransfer"];
      if (fileData && fileData[0]) {
        var folder = getOrCreateFolder(FOLDER_NAME);
        var decoded = Utilities.base64Decode(fileData[0]);
        var blob = Utilities.newBlob(decoded, "image/jpeg", "bukti_" + nama + "_" + Date.now() + ".jpg");
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        buktiUrl = file.getUrl();
      }
    } catch (fileErr) {
      buktiUrl = "Gagal upload: " + fileErr.message;
    }

    // Paksa kolom Timestamp jadi format teks dulu, biar Sheets gak auto-parse jadi date/number
    var nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1).setNumberFormat("@");

    sheet.appendRow([
      timestamp,
      nama,
      whatsapp,
      hotSlawOri,
      hotSlawLvl1,
      hotSlawLvl2,
      hotSlawLvl3,
      hotClassicOri,
      hotClassicLvl1,
      hotClassicLvl2,
      hotClassicLvl3,
      hotNFriesOri,
      hotNFriesLvl1,
      hotNFriesLvl2,
      hotNFriesLvl3,
      opsiPengiriman,
      sauceQty,
      totalPesanan,
      alamat,
      catatan,
      totalHarga,
      buktiUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Pesanan berhasil dikirim!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function testSheetConnection() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet) {
    Logger.log("OK - Sheet: " + sheet.getName() + ", Baris: " + sheet.getLastRow());
  } else {
    Logger.log("GAGAL - Sheet tidak ditemukan. Cek SHEET_NAME.");
  }
}