/**
 * AV's Bucket List - Google Sheets API Layer (Robust Sync v1.4)
 * -------------------------------------------------------------
 * Version 1.4: Monotonic Version Sync & Per-User Row Mapping
 */

// 1. SETTINGS
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; 
const SHEET_NAME = 'Sheet1'; 
const LOCK_TIMEOUT_MS = 10000;
const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN');
const USER_ROW_MAP_KEY = 'USER_ROW_MAP';
const HEADER_CACHE_KEY = 'CACHED_HEADERS';

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");
  const token = body.token;
  if (!token || token !== SECRET_TOKEN) {
    return createJsonResponse({ error: "Unauthorized" });
  }
  delete body.token;
  const action = (body.action || "push").toLowerCase();

  if (action === 'ping') {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, serverTime: new Date().toISOString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "pull") {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(LOCK_TIMEOUT_MS);
      return handlePull(body);
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    } finally {
      lock.releaseLock();
    }
  }

  if (action === "logout") {
    return handleLogout(body);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
    return handlePush(body);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fix 5: Monotonic Sync Strategy
 */
function handlePull(body) {
  const lastSeenVersion = parseInt(body.since || "0");
  const userId = (body.userId || "").toString().trim().toLowerCase();
  if (!userId) return createJsonResponse({ error: "userId required" });

  const scriptProps = PropertiesService.getScriptProperties();
  const safeGlobalVersion = parseInt(scriptProps.getProperty('GLOBAL_VERSION') || "0");

  if (lastSeenVersion >= safeGlobalVersion && lastSeenVersion > 0) {
    return createJsonResponse({
      serverTime: String(safeGlobalVersion),
      data: [],
      debug: { shortCircuited: true, reason: 'up_to_date' }
    });
  }

  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return createJsonResponse({ serverTime: "0", data: [] });

  const userIdIdx = headers.indexOf("userId");
  const vIdx = headers.indexOf("versionIndex");

  // Fix 4: Per-user row index mapping
  const rowMap = JSON.parse(scriptProps.getProperty(USER_ROW_MAP_KEY) || "{}");
  const startRow = Math.max(2, (rowMap[userId] || 2) - 100); 

  let allData = [];
  const rowsToRead = Math.max(0, lastRow - startRow + 1);
  if (rowsToRead > 0) {
    allData = sheet.getRange(startRow, 1, rowsToRead, headers.length).getValues();
  }

  const matches = [];
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    if (String(row[userIdIdx]).toLowerCase().trim() === userId) {
      const rowVersion = parseInt(row[vIdx] || "0");
      if (rowVersion > lastSeenVersion) {
        matches.push(mapRowToObj(row, headers));
      }
    }
  }

  return createJsonResponse({
    serverTime: String(safeGlobalVersion),
    data: matches,
    debug: { startRow, rowsRead: rowsToRead }
  });
}

function handlePush(body) {
  const items = body.items || (Array.isArray(body) ? body : [body]);
  if (items.length === 0) return createJsonResponse({ success: true, processed: 0 });

  const userId = (items[0].userId || "").toString().trim().toLowerCase();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const headers = ensureHeaders(sheet);
  const serverNow = new Date().toISOString();
  const idIdx = headers.indexOf("id");
  const userIdIdx = headers.indexOf("userId");
  const verIdx = headers.indexOf("version");
  const vIdx = headers.indexOf("versionIndex");

  const lastRow = sheet.getLastRow();
  const scriptProps = PropertiesService.getScriptProperties();
  const globalVersion = parseInt(scriptProps.getProperty('GLOBAL_VERSION') || "0") + 1;
  scriptProps.setProperty('GLOBAL_VERSION', String(globalVersion));

  // Load ALL existing rows into memory once
  let allRows = [];
  if (lastRow >= 2) {
    allRows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  }

  // Build an index: itemId -> rowIndex (0-based in allRows)
  const idToRowIdx = {};
  allRows.forEach((row, i) => {
    if (String(row[userIdIdx]).toLowerCase().trim() === userId) {
      idToRowIdx[row[idIdx]] = i;
    }
  });

  const newRows = [];
  const results = [];

  items.forEach(incoming => {
    const rowData = headers.map((h, i) => {
      if (h === "updatedAt") return serverNow;
      if (h === "versionIndex") return globalVersion;
      if (h === "version") return (incoming.version || 0) + 1;
      if (h === "addedAt") {
        const existingIdx = idToRowIdx[incoming.id];
        return existingIdx !== undefined ? allRows[existingIdx][i] : (incoming.addedAt || serverNow);
      }
      return incoming[h] !== undefined ? incoming[h] : (idToRowIdx[incoming.id] !== undefined ? allRows[idToRowIdx[incoming.id]][i] : "");
    });

    if (idToRowIdx[incoming.id] !== undefined) {
      allRows[idToRowIdx[incoming.id]] = rowData; // Mutate in-memory
      results.push({ id: incoming.id, status: "updated", version: rowData[verIdx] });
    } else {
      newRows.push(rowData);
      results.push({ id: incoming.id, status: "inserted", version: rowData[verIdx] });
    }
  });

  // Write all updates back in ONE call
  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, headers.length).setValues(allRows);
  }
  // Append new rows in ONE call
  if (newRows.length > 0) {
    const startRow = lastRow + 1;
    sheet.getRange(startRow, 1, newRows.length, headers.length).setValues(newRows);
  }

  const userRowMap = JSON.parse(scriptProps.getProperty(USER_ROW_MAP_KEY) || "{}");
  userRowMap[userId] = 2; // For single user, always start from row 2
  scriptProps.setProperty(USER_ROW_MAP_KEY, JSON.stringify(userRowMap));

  return createJsonResponse({ success: true, results, serverTime: String(globalVersion) });
}

function handleLogout(body) {
  const userId = (body.userId || "").toString().trim().toLowerCase();
  const scriptProps = PropertiesService.getScriptProperties();
  const map = JSON.parse(scriptProps.getProperty(USER_ROW_MAP_KEY) || "{}");
  delete map[userId];
  scriptProps.setProperty(USER_ROW_MAP_KEY, JSON.stringify(map));
  return createJsonResponse({ success: true });
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_SPREADSHEET_ID_HERE") return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function mapRowToObj(row, headers) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function ensureHeaders(sheet) {
  const scriptProps = PropertiesService.getScriptProperties();
  const cached = scriptProps.getProperty(HEADER_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const required = ["id", "userId", "status", "rating", "year", "addedAt", "updatedAt", "version", "payload", "versionIndex"];
  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
    }
  });
  scriptProps.setProperty(HEADER_CACHE_KEY, JSON.stringify(headers));
  return headers;
}

function invalidateHeaderCache() {
  PropertiesService.getScriptProperties().deleteProperty(HEADER_CACHE_KEY);
}